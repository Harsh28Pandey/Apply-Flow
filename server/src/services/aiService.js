import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { extractSignature, preserveUserSignature } from '../utils/signatureUtils.js';

// Schema validating the AI response JSON contract
const aiResponseSchema = z.object({
  subject: z.string().min(1, 'Subject cannot be empty').max(300),
  body: z.string().min(1, 'Body cannot be empty').max(10000),
});

/**
 * Redacts any Groq API keys (gsk_...) or authorization headers from text
 */
function redactSecrets(text) {
  if (!text) return '';
  return String(text).replace(/gsk_[a-zA-Z0-9_-]{20,}/g, '[REDACTED_GROQ_KEY]');
}

/**
 * Builds system prompt enforcing Section 9 rules
 */
function buildSystemPrompt() {
  return `You are an elite career strategist and executive outreach copywriter.
Your task is to write a highly personalized, thoughtful, high-converting job application email or cover letter from a candidate's resume and a job description.

STRICT RULES:
1. OUTPUT CONTRACT: You MUST return a single, valid JSON object with EXACTLY two string fields: "subject" and "body". Do NOT enclose in markdown code blocks like \`\`\`json. Return raw JSON only.
2. SUBJECT LINE:
   - For applications/recruiter outreach: Use a high-converting, professional standard like:
     "Application for {Role Title} at {Company Name} - {Candidate Name}" or "Application for {Role Title} - {Candidate Name}"
   - For cold/founder outreach: Use a punchy, value-focused subject like:
     "{Candidate Name} <> {Company Name}: {Role Title} & Impact" or "Quick question regarding {Role Title} at {Company Name} - {Candidate Name}"
3. GREETING:
   - If recipient name is provided: "Dear {recipient_name}," or "Hi {recipient_name},"
   - If recipient name is NOT provided: "Dear Hiring Manager," or "Hello,"
4. COVER LETTER & EMAIL FORMATTING STRUCTURE:
   - Paragraph 1 (Courteous Opener & Role Fit): "I hope this email finds you well. I’m excited to apply for the {Role Title} role at {Company Name}. [Candidate background/education] with hands-on [Primary Tech Stack] experience, building complete features from database to user interface."
   - Paragraph 2 (Experience): "**Experience:** As a {Role} at {Company}, [quantified accomplishment with metrics]. [Key contribution, code reviews or standards]."
   - Paragraph 3 (Projects):
     "**Projects:**
     - **{Project 1}** is a [role-based platform/service]. [Specific accomplishment with metrics]. ({Tech Stack})
     - **{Project 2}** is a [description]. [Specific architectural/security accomplishment]. ({Tech Stack})"
   - Paragraph 4 (Skills):
     "**Skills:**
     - **Frontend:** {Categorized skills from resume}
     - **Backend:** {Categorized skills from resume}
     - **Databases:** {Categorized skills from resume}
     - **Tools:** {Categorized skills from resume}
     - **Fundamentals:** {DSA, OOP, problem-solving, etc.}"
   - Paragraph 5 (Attachment & Portfolio Links):
     "My resume is attached. You can also see my work here:
     - **LinkedIn:** {LinkedIn URL if found in resume}
     - **GitHub:** {GitHub URL if found in resume}
     - **Portfolio:** {Portfolio URL if found in resume}"
   - Paragraph 6 (Closing CTA):
     "I’d welcome the chance to discuss how I can contribute to your engineering team. Thank you for your time and consideration."
   - Sign-off:
     "Best regards,
     {Candidate Name}"
5. CONTENT & GROUNDING:
   - NEVER hallucinate skills, metrics, titles, or facts not in the resume. Extract the candidate's real projects, metrics, and skills from their resume text.
   - Use Markdown **bold** for key metrics, project names, and skill categories.
6. ATTACHMENT:
   - If attachment is present, mention "My resume is attached."
7. SIGNATURE:
   - Conclude with a clean sign-off with candidate's name.`;
}

/**
 * Makes request to Groq API with timeout, retry for 503, and friendly error mapping.
 */
async function callGroqAPI({ apiKey, model, messages, temperature = 0.65, maxTokens = 3000 }) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  const body = JSON.stringify({
    model: model || 'openai/gpt-oss-20b',
    messages,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  });

  let attempts = 0;
  const max503Retries = 2;

  while (attempts <= max503Retries) {
    attempts++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 503 Service Unavailable with Retry-After
      if (response.status === 503) {
        if (attempts <= max503Retries) {
          const retryAfterHeader = response.headers.get('retry-after');
          let waitSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : (attempts * 2);
          if (isNaN(waitSeconds) || waitSeconds <= 0) waitSeconds = 2;
          waitSeconds = Math.min(waitSeconds, 10); // Capped at 10s

          logger.warn(`Groq 503 received. Retrying in ${waitSeconds}s (attempt ${attempts}/${max503Retries})...`);
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
          continue;
        } else {
          const error = new Error('Groq AI service is currently overloaded. Please try again in a few seconds.');
          error.statusCode = 503;
          error.errorCode = 'AI_SERVICE_UNAVAILABLE';
          error.headers = { 'Retry-After': '5' };
          throw error;
        }
      }

      // Handle non-200 responses
      if (!response.ok) {
        const errorText = await response.text();
        const redactedMsg = redactSecrets(errorText);

        if (response.status === 401) {
          const err = new Error('Groq authentication failed. Please verify your Groq API key in Settings.');
          err.statusCode = 401;
          err.errorCode = 'AI_AUTH_FAILED';
          throw err;
        }
        if (response.status === 403) {
          const err = new Error('Groq API key lacks required permissions or organization access.');
          err.statusCode = 403;
          err.errorCode = 'AI_FORBIDDEN';
          throw err;
        }
        if (response.status === 404) {
          const err = new Error(`Selected AI model '${model}' was not found. Please choose another model in Settings.`);
          err.statusCode = 404;
          err.errorCode = 'AI_MODEL_NOT_FOUND';
          throw err;
        }
        if (response.status === 429) {
          const err = new Error('Groq rate limit exceeded. Please wait a moment before generating again.');
          err.statusCode = 429;
          err.errorCode = 'AI_RATE_LIMIT';
          throw err;
        }

        const err = new Error(`Groq API error (${response.status}): ${redactedMsg}`);
        err.statusCode = 502;
        err.errorCode = 'AI_PROVIDER_ERROR';
        throw err;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutError = new Error('Groq AI request timed out after 60 seconds.');
        timeoutError.statusCode = 504;
        timeoutError.errorCode = 'AI_TIMEOUT';
        throw timeoutError;
      }
      if (err.statusCode) {
        throw err;
      }
      const connError = new Error(`Failed to connect to Groq AI service: ${err.message}`);
      connError.statusCode = 502;
      connError.errorCode = 'AI_CONNECTION_ERROR';
      throw connError;
    }
  }
}

/**
 * Parses and validates the AI response text as JSON { subject, body }
 */
function parseAndValidateAiJson(content) {
  try {
    let cleaned = content.trim();
    // Strip markdown code fences if model enclosed it
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);
    const validated = aiResponseSchema.parse(parsed);
    return {
      subject: validated.subject.trim().replace(/[\r\n]+/g, ' '),
      body: validated.body.trim(),
    };
  } catch (err) {
    return null;
  }
}

/**
 * Generate email from resume and job description
 */
export async function generateEmail({
  apiKey,
  model,
  resumeText,
  jobDescription,
  recipientName = '',
  recipientPosition = '',
  company = '',
  hasAttachment = false,
  userSignature = '',
}) {
  const systemPrompt = buildSystemPrompt();

  const userPrompt = `
Here is the context:

RECIPIENT INFORMATION:
- Name: ${recipientName || 'Not specified (use "Hello,")'}
- Position: ${recipientPosition || 'Not specified'}
- Company: ${company || 'Not specified'}
- Attachment Present: ${hasAttachment ? 'YES (resume attached)' : 'NO (resume not attached)'}

CANDIDATE RESUME:
${resumeText.slice(0, 20000)}

JOB DESCRIPTION:
${jobDescription.slice(0, 15000)}

Please craft the high-impact personalized email now. Return ONLY valid JSON: {"subject": "...", "body": "..."}.
`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // First attempt
  const result = await callGroqAPI({ apiKey, model, messages });
  const rawContent = result.choices?.[0]?.message?.content || '';
  let parsed = parseAndValidateAiJson(rawContent);

  // If invalid, retry ONCE with clarification note
  if (!parsed) {
    logger.warn('AI returned invalid JSON contract. Retrying once with clarification note...');
    const retryMessages = [
      ...messages,
      { role: 'assistant', content: rawContent },
      {
        role: 'user',
        content: 'Your previous response was incomplete or not valid JSON. You MUST return ONLY one valid JSON object with keys "subject" (string) and "body" (string) with no markdown formatting or extra text.',
      },
    ];

    const retryResult = await callGroqAPI({ apiKey, model, messages: retryMessages });
    const retryRawContent = retryResult.choices?.[0]?.message?.content || '';
    parsed = parseAndValidateAiJson(retryRawContent);

    if (!parsed) {
      const error = new Error('AI provider repeatedly failed to return valid email JSON.');
      error.statusCode = 502;
      error.errorCode = 'AI_MALFORMED_OUTPUT';
      throw error;
    }
  }

  // Preserve user's configured signature
  if (userSignature) {
    parsed.body = preserveUserSignature(parsed.body, '', userSignature);
  }

  return parsed;
}

/**
 * Refine email according to styles (Section 9.4)
 * - `project`: grounded cold-outreach language, specific observation from JD + resume evidence, 200-300 words. Preserves subject.
 * - `application`: evidence-led application email, greeting "Hello,", name the position if provided, 280-320 words excluding signature, 4-5 short paragraphs of 2-3 sentences, develop two most relevant examples. Preserves subject.
 * - `cold_outreach`: human, specific outreach (not cover letter), 2-3 sentence hook from one concrete JD detail, generates a NEW creative subject, no flattery clichés, no "Please find attached my resume", 200-300 words (min 150). Replaces subject.
 *
 * Section 9.5: "after any refinement, the server re-attaches the user's original final signature block
 * (everything from the last 'Best regards,' onward) and discards any signature the AI produced."
 */
export async function refineEmail({
  apiKey,
  model,
  currentSubject,
  currentBody,
  style, // 'project' | 'application' | 'cold_outreach'
  resumeText,
  jobDescription,
  recipientName = '',
  company = '',
  role = '',
  userSignature = '',
}) {
  // Extract user's current signature block to preserve it
  const { signature: existingSignature } = extractSignature(currentBody);
  const signatureToPreserve = existingSignature || userSignature;

  let styleInstructions = '';
  let replacesSubject = false;

  switch (style) {
    case 'project':
      styleInstructions = `STYLE: PROJECT-FOCUSED OUTREACH
- Write in grounded, thoughtful cold-outreach language.
- Highlight a concrete technical/business challenge or project observation from the JD.
- Connect this to 1 or 2 specific projects or achievements from the candidate's resume with measurable outcomes.
- Keep body between 200 and 300 words.
- Maintain the provided subject line exactly as: "${currentSubject}".`;
      replacesSubject = false;
      break;

    case 'application':
      styleInstructions = `STYLE: EVIDENCE-LED FORMAL APPLICATION
- Greeting MUST BE EXACTLY "Hello,".
- Clearly state interest in the position (${role || 'the role'}${company ? ` at ${company}` : ''}).
- 280 to 320 words excluding the sign-off/signature.
- Exactly 4 to 5 short paragraphs of 2 to 3 sentences each.
- Deeply develop the candidate's two most relevant real-world examples with concrete evidence from the resume.
- Avoid run-on sentences and comma splices; use dashes sparingly.
- Be concise and grounded rather than embellishing.
- Maintain the provided subject line exactly as: "${currentSubject}".`;
      replacesSubject = false;
      break;

    case 'founder':
      styleInstructions = `STYLE: HIGH-CONVICTION FOUNDER & CEO OUTREACH
- Write directly to a startup founder or executive: high agency, clear commercial/engineering impact, zero fluff.
- Open by pinpointing a strategic challenge or product ambition from the company/JD.
- State exactly how the candidate's core technical abilities and project achievements accelerate their roadmap.
- Propose a 10-minute introductory coffee chat or sync.
- Subject line should be formatted like: "${company ? `${company} ` : ''}Engineering & Impact" or maintain provided subject.`;
      replacesSubject = false;
      break;

    case 'cold_outreach':
      styleInstructions = `STYLE: HUMAN & CONCISE COLD OUTREACH
- Write a genuine, human cold email (this is NOT a formal cover letter).
- Open with a compelling 2-3 sentence hook drawn from one concrete detail in the JD.
- Connect directly to the candidate's standout strength in 1 short paragraph.
- Avoid all flattery clichés (e.g. "I love your company's mission") and do NOT write "Please find attached my resume".
- Generate a brand-NEW creative, intriguing 4-8 word subject line.
- Length: 200 to 300 words (minimum 150 words, never over 400 words).`;
      replacesSubject = true;
      break;

    default:
      throw new Error(`Unsupported refinement style: ${style}`);
  }

  const prompt = `
You are refining an existing draft email.

${styleInstructions}

CURRENT SUBJECT: ${currentSubject}
CURRENT DRAFT:
${currentBody}

RECIPIENT NAME: ${recipientName || 'Not specified'}
CANDIDATE RESUME:
${resumeText ? resumeText.slice(0, 15000) : 'Use facts from current draft.'}

JOB DESCRIPTION:
${jobDescription ? jobDescription.slice(0, 12000) : 'Use context from current draft.'}

Output ONLY valid JSON: {"subject": "${replacesSubject ? 'NEW SUBJECT' : currentSubject}", "body": "REFINED BODY"}.
`;

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: prompt },
  ];

  const result = await callGroqAPI({ apiKey, model, messages });
  const rawContent = result.choices?.[0]?.message?.content || '';
  let parsed = parseAndValidateAiJson(rawContent);

  if (!parsed) {
    // Retry once
    const retryResult = await callGroqAPI({
      apiKey,
      model,
      messages: [
        ...messages,
        { role: 'assistant', content: rawContent },
        { role: 'user', content: 'Return valid JSON only: {"subject": "...", "body": "..."}' },
      ],
    });
    parsed = parseAndValidateAiJson(retryResult.choices?.[0]?.message?.content || '');
    if (!parsed) {
      const error = new Error('AI provider failed to return valid refined email JSON.');
      error.statusCode = 502;
      throw error;
    }
  }

  // Enforce subject preservation for 'project' and 'application'
  const finalSubject = replacesSubject ? parsed.subject : currentSubject;

  // Preserve user's original signature block (Section 9.5)
  const finalBody = preserveUserSignature(parsed.body, signatureToPreserve, userSignature);

  return {
    subject: finalSubject,
    body: finalBody,
  };
}

/**
 * Lightweight test call to verify Groq API key validity
 */
export async function testGroqConnection(apiKey, model = 'openai/gpt-oss-20b') {
  const messages = [
    { role: 'user', content: 'Respond with JSON: {"status": "ok"}' },
  ];
  return callGroqAPI({
    apiKey,
    model,
    messages,
    maxTokens: 50,
  });
}

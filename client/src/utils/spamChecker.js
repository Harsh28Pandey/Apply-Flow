/**
 * Spam Risk Analyzer for cold outreach & application emails
 */
const SPAM_TRIGGERS = [
  '100% free',
  'make money',
  'no risk',
  'guarantee',
  'guaranteed',
  'act now',
  'urgent',
  'cash',
  'winner',
  'risk-free',
  'special promotion',
  'click here',
  'free trial',
  'pure profit',
  'miracle',
  'opportunity of a lifetime',
];

export function analyzeSpamRisk(text) {
  if (!text || text.trim().length === 0) {
    return {
      score: 'low',
      level: 'good',
      issues: [],
      wordCount: 0,
      linkCount: 0,
    };
  }

  const issues = [];
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 1. Word count analysis
  if (wordCount < 100) {
    issues.push('Draft is very short (< 100 words). Consider adding concrete evidence.');
  } else if (wordCount > 350) {
    issues.push('Draft exceeds 350 words. Recruiters prefer concise emails under 300 words.');
  }

  // 2. Link count check (markdown links + raw urls)
  const linkMatches = trimmed.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g) || [];
  const rawUrlMatches = trimmed.match(/https?:\/\/[^\s)]+/g) || [];
  const linkCount = Math.max(linkMatches.length, rawUrlMatches.length);

  if (linkCount > 3) {
    issues.push(`Contains ${linkCount} links. Emails with > 3 links trigger spam filters.`);
  }

  // 3. Excessive ALL CAPS words
  const capsWords = words.filter(
    (w) => w.length > 3 && w === w.toUpperCase() && /^[A-Z]+$/.test(w)
  );
  if (capsWords.length >= 3) {
    issues.push(`Multiple ALL CAPS words detected (${capsWords.slice(0, 3).join(', ')}).`);
  }

  // 4. Missing greeting check
  const first50Chars = trimmed.slice(0, 50).toLowerCase();
  const hasGreeting =
    first50Chars.includes('hi ') ||
    first50Chars.includes('hello') ||
    first50Chars.includes('dear');
  if (!hasGreeting) {
    issues.push('Missing a clear personalized greeting (e.g., "Hi {name}," or "Hello,").');
  }

  // 5. Spam trigger keywords
  const lowerText = trimmed.toLowerCase();
  const foundTriggers = SPAM_TRIGGERS.filter((trigger) => lowerText.includes(trigger));
  if (foundTriggers.length > 0) {
    issues.push(`Contains promotional trigger words: "${foundTriggers.join('", "')}".`);
  }

  // Calculate score level
  let score = 'low';
  let level = 'good';
  if (issues.length >= 3 || foundTriggers.length > 0 || linkCount > 4) {
    score = 'high';
    level = 'danger';
  } else if (issues.length >= 1) {
    score = 'medium';
    level = 'warning';
  }

  return {
    score,
    level,
    issues,
    wordCount,
    linkCount,
  };
}

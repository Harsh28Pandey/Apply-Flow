import crypto from 'crypto';
import { Email } from '../models/Email.js';
import { Resume } from '../models/Resume.js';
import { UserSettings } from '../models/UserSettings.js';
import { TrackingEvent } from '../models/TrackingEvent.js';
import { generateEmail, refineEmail } from '../services/aiService.js';
import { sendEmail } from '../services/mailService.js';
import { decrypt } from '../services/cryptoService.js';
import { generateUnsubscribeToken } from '../services/trackingService.js';

export async function generate(req, res, next) {
  try {
    const {
      resumeId,
      resumeText: customResumeText,
      jobDescription,
      recipientName,
      recipientPosition,
      company,
      hasAttachment,
    } = req.body;

    if (!jobDescription || jobDescription.trim().length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Job description text is required.' },
      });
    }

    // Resolve resume text: either custom text or from stored resume
    let resumeText = customResumeText;
    if (!resumeText && resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, userId: req.user.id });
      if (resume) {
        resumeText = resume.extractedText;
      }
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Resume text is required. Please upload or select a resume.' },
      });
    }

    const settings = await UserSettings.findOne({ userId: req.user.id });
    const groqKeyEncrypted = settings?.ai?.groqApiKeyEncrypted;
    if (!groqKeyEncrypted) {
      return res.status(400).json({
        error: {
          code: 'MISSING_API_KEY',
          message: 'Groq API Key is not configured. Please add your key in the Settings tab.',
        },
      });
    }

    const apiKey = decrypt(groqKeyEncrypted);
    const model = settings?.ai?.modelName || 'openai/gpt-oss-20b';
    const userSignature = settings?.branding?.defaultSignature || '';

    const result = await generateEmail({
      apiKey,
      model,
      resumeText,
      jobDescription,
      recipientName,
      recipientPosition,
      company,
      hasAttachment: !!hasAttachment,
      userSignature,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function refine(req, res, next) {
  try {
    const {
      currentSubject,
      currentBody,
      style,
      resumeId,
      resumeText: customResumeText,
      jobDescription,
      recipientName,
      company,
      role,
    } = req.body;

    if (!currentBody || !style) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Current body and refinement style are required.' },
      });
    }

    let resumeText = customResumeText;
    if (!resumeText && resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, userId: req.user.id });
      if (resume) resumeText = resume.extractedText;
    }

    const settings = await UserSettings.findOne({ userId: req.user.id });
    const groqKeyEncrypted = settings?.ai?.groqApiKeyEncrypted;
    if (!groqKeyEncrypted) {
      return res.status(400).json({
        error: {
          code: 'MISSING_API_KEY',
          message: 'Groq API Key is not configured. Please add your key in the Settings tab.',
        },
      });
    }

    const apiKey = decrypt(groqKeyEncrypted);
    const model = settings?.ai?.modelName || 'openai/gpt-oss-20b';
    const userSignature = settings?.branding?.defaultSignature || '';

    const result = await refineEmail({
      apiKey,
      model,
      currentSubject: currentSubject || '',
      currentBody,
      style,
      resumeText: resumeText || '',
      jobDescription: jobDescription || '',
      recipientName: recipientName || '',
      company: company || '',
      role: role || '',
      userSignature,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createDraft(req, res, next) {
  try {
    const {
      to,
      recipientName,
      company,
      role,
      subject,
      body,
      resumeId,
      hasAttachment,
      style,
    } = req.body;

    if (!subject || !body) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Subject and body are required.' },
      });
    }

    const email = await Email.create({
      userId: req.user.id,
      to: (to || '').trim().toLowerCase(),
      recipientName: (recipientName || '').trim(),
      company: (company || '').trim(),
      role: (role || '').trim(),
      subject: subject.trim(),
      body: body.trim(),
      status: 'draft',
      resumeId: resumeId || null,
      hasAttachment: !!hasAttachment,
      versions: [
        {
          subject: subject.trim(),
          body: body.trim(),
          style: style || 'initial',
          timestamp: new Date(),
        },
      ],
    });

    res.status(201).json({ email });
  } catch (err) {
    next(err);
  }
}

export async function updateDraft(req, res, next) {
  try {
    const {
      to,
      recipientName,
      company,
      role,
      subject,
      body,
      resumeId,
      hasAttachment,
      style,
    } = req.body;

    const email = await Email.findOne({ _id: req.params.id, userId: req.user.id });
    if (!email) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Email draft not found.' } });
    }

    if (to !== undefined) email.to = to.trim().toLowerCase();
    if (recipientName !== undefined) email.recipientName = recipientName.trim();
    if (company !== undefined) email.company = company.trim();
    if (role !== undefined) email.role = role.trim();
    if (subject !== undefined) email.subject = subject.trim();
    if (body !== undefined) email.body = body.trim();
    if (resumeId !== undefined) email.resumeId = resumeId || null;
    if (hasAttachment !== undefined) email.hasAttachment = !!hasAttachment;

    // Record version history
    if (subject || body) {
      email.versions.push({
        subject: email.subject,
        body: email.body,
        style: style || 'custom_edit',
        timestamp: new Date(),
      });
    }

    await email.save();
    res.json({ email });
  } catch (err) {
    next(err);
  }
}

export async function sendNow(req, res, next) {
  try {
    const {
      emailId,
      to,
      recipientName,
      company,
      role,
      subject,
      body,
      resumeId,
      hasAttachment,
    } = req.body;

    const targetTo = to?.trim().toLowerCase();
    const targetSubject = subject?.trim();
    const targetBody = body?.trim();

    if (!targetTo || !targetSubject || !targetBody) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Recipient, subject, and body are required.' },
      });
    }

    const settings = await UserSettings.findOne({ userId: req.user.id });
    if (!settings || !settings.smtp?.host || !settings.smtp?.passwordEncrypted) {
      return res.status(400).json({
        error: {
          code: 'SMTP_NOT_CONFIGURED',
          message: 'SMTP settings are not configured. Please add your SMTP details in Settings.',
        },
      });
    }

    const smtpConfig = {
      host: settings.smtp.host,
      port: settings.smtp.port,
      secure: settings.smtp.secure,
      username: settings.smtp.username,
      password: decrypt(settings.smtp.passwordEncrypted),
      fromAddress: settings.smtp.fromAddress,
      fromName: settings.smtp.fromName,
    };

    const trackingId = crypto.randomBytes(16).toString('hex');
    const unsubToken = generateUnsubscribeToken(req.user.id, targetTo);

    let email;
    if (emailId) {
      email = await Email.findOne({ _id: emailId, userId: req.user.id });
    }

    if (!email) {
      email = new Email({
        userId: req.user.id,
        to: targetTo,
        recipientName: (recipientName || '').trim(),
        company: (company || '').trim(),
        role: (role || '').trim(),
        subject: targetSubject,
        body: targetBody,
        resumeId: resumeId || null,
        hasAttachment: !!hasAttachment,
      });
    } else {
      email.to = targetTo;
      email.subject = targetSubject;
      email.body = targetBody;
      email.resumeId = resumeId || email.resumeId;
      email.hasAttachment = hasAttachment !== undefined ? !!hasAttachment : email.hasAttachment;
    }

    email.trackingId = trackingId;
    email.status = 'sending';
    await email.save();

    try {
      const result = await sendEmail({
        smtpConfig,
        to: targetTo,
        recipientName: email.recipientName,
        subject: targetSubject,
        bodyMarkdown: targetBody,
        trackingId,
        userSettings: settings,
        resumeId: email.resumeId,
        hasAttachment: email.hasAttachment,
        unsubscribeToken: unsubToken,
      });

      email.status = 'sent';
      email.sentAt = new Date();
      email.messageId = result.messageId;
      email.trackedLinks = result.trackedLinks;
      email.bodyHtml = result.bodyHtml;
      email.bodyText = result.bodyText;
      email.errorReason = null;
      await email.save();

      res.json({ email });
    } catch (sendErr) {
      email.status = 'failed';
      email.errorReason = sendErr.message;
      await email.save();
      throw sendErr;
    }
  } catch (err) {
    next(err);
  }
}

export async function schedule(req, res, next) {
  try {
    const {
      emailId,
      to,
      recipientName,
      company,
      role,
      subject,
      body,
      resumeId,
      hasAttachment,
      scheduledAt,
    } = req.body;

    if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
      return res.status(400).json({
        error: { code: 'INVALID_SCHEDULE_TIME', message: 'Please provide a future schedule time.' },
      });
    }

    const targetTo = to?.trim().toLowerCase();
    const targetSubject = subject?.trim();
    const targetBody = body?.trim();

    if (!targetTo || !targetSubject || !targetBody) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Recipient, subject, and body are required.' },
      });
    }

    const trackingId = crypto.randomBytes(16).toString('hex');

    let email;
    if (emailId) {
      email = await Email.findOne({ _id: emailId, userId: req.user.id });
    }

    if (!email) {
      email = new Email({
        userId: req.user.id,
        to: targetTo,
        recipientName: (recipientName || '').trim(),
        company: (company || '').trim(),
        role: (role || '').trim(),
        subject: targetSubject,
        body: targetBody,
        resumeId: resumeId || null,
        hasAttachment: !!hasAttachment,
      });
    } else {
      email.to = targetTo;
      email.subject = targetSubject;
      email.body = targetBody;
      email.resumeId = resumeId || email.resumeId;
      email.hasAttachment = hasAttachment !== undefined ? !!hasAttachment : email.hasAttachment;
    }

    email.trackingId = trackingId;
    email.status = 'queued';
    email.scheduledAt = new Date(scheduledAt);
    await email.save();

    res.json({ email });
  } catch (err) {
    next(err);
  }
}

export async function cancelSchedule(req, res, next) {
  try {
    const email = await Email.findOne({ _id: req.params.id, userId: req.user.id });
    if (!email) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Email not found.' } });
    }

    if (email.status !== 'queued') {
      return res.status(400).json({
        error: { code: 'CANNOT_CANCEL', message: `Cannot cancel email with status '${email.status}'.` },
      });
    }

    email.status = 'draft';
    email.scheduledAt = null;
    await email.save();

    res.json({ email });
  } catch (err) {
    next(err);
  }
}

export async function listEmails(req, res, next) {
  try {
    const {
      status,
      campaignId,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = { userId: req.user.id };

    if (status && status !== 'all') {
      if (status === 'opened') {
        query.status = 'sent';
        query.openCount = { $gt: 0 };
      } else if (status === 'clicked') {
        query.status = 'sent';
        query.clickCount = { $gt: 0 };
      } else if (status === 'replied') {
        query.isReplied = true;
      } else {
        query.status = status;
      }
    }

    if (campaignId) {
      query.campaignId = campaignId;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { to: searchRegex },
        { subject: searchRegex },
        { recipientName: searchRegex },
        { company: searchRegex },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [emails, total] = await Promise.all([
      Email.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('resumeId', 'customName')
        .populate('campaignId', 'name'),
      Email.countDocuments(query),
    ]);

    res.json({
      emails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getEmail(req, res, next) {
  try {
    const email = await Email.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('resumeId', 'customName originalName')
      .populate('campaignId', 'name');

    if (!email) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Email not found.' } });
    }

    const trackingEvents = await TrackingEvent.find({ emailId: email._id })
      .sort({ timestamp: -1 });

    res.json({
      email,
      trackingEvents,
      events: trackingEvents,
    });
  } catch (err) {
    next(err);
  }
}

export async function markReplied(req, res, next) {
  try {
    const email = await Email.findOne({ _id: req.params.id, userId: req.user.id });
    if (!email) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Email not found.' } });
    }

    email.isReplied = !email.isReplied;
    email.repliedAt = email.isReplied ? new Date() : null;
    await email.save();

    if (email.isReplied) {
      await TrackingEvent.create({
        emailId: email._id,
        userId: email.userId,
        type: 'reply',
        userAgent: 'Manual Toggle',
        timestamp: new Date(),
      });
    }

    res.json({ email });
  } catch (err) {
    next(err);
  }
}

export async function deleteEmail(req, res, next) {
  try {
    const email = await Email.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!email) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Email not found.' } });
    }

    await TrackingEvent.deleteMany({ emailId: email._id });
    res.json({ message: 'Email deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function exportCsv(req, res, next) {
  try {
    const emails = await Email.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(1000);

    const headers = ['ID', 'To', 'Recipient Name', 'Company', 'Role', 'Subject', 'Status', 'Opens', 'Clicks', 'Replied', 'Sent At', 'Created At'];
    const rows = emails.map(e => [
      e._id.toString(),
      `"${e.to || ''}"`,
      `"${(e.recipientName || '').replace(/"/g, '""')}"`,
      `"${(e.company || '').replace(/"/g, '""')}"`,
      `"${(e.role || '').replace(/"/g, '""')}"`,
      `"${(e.subject || '').replace(/"/g, '""')}"`,
      e.status,
      e.openCount || 0,
      e.clickCount || 0,
      e.isReplied ? 'Yes' : 'No',
      e.sentAt ? e.sentAt.toISOString() : '',
      e.createdAt ? e.createdAt.toISOString() : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="applyflow_emails.csv"');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
}

import { Campaign } from '../models/Campaign.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';
import { UserSettings } from '../models/UserSettings.js';
import { Resume } from '../models/Resume.js';
import { Template } from '../models/Template.js';
import { Suppression } from '../models/Suppression.js';
import { generateEmail } from '../services/aiService.js';
import { decrypt } from '../services/cryptoService.js';

export async function createCampaign(req, res, next) {
  try {
    const {
      name,
      resumeId,
      followUpEnabled,
      followUpDays,
      followUpTemplateId,
      recipients = [],
    } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Campaign name is required.' },
      });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'At least one recipient is required.' },
      });
    }

    const campaign = await Campaign.create({
      userId: req.user.id,
      name: name.trim(),
      resumeId: resumeId || null,
      followUpEnabled: !!followUpEnabled,
      followUpDays: followUpDays || 3,
      followUpTemplateId: followUpTemplateId || null,
      totalRecipients: recipients.length,
      status: 'draft',
    });

    // Deduplicate recipients by email within campaign & filter invalid emails
    const seenEmails = new Set();
    const recipientDocs = [];

    for (const r of recipients) {
      const email = (r.email || '').trim().toLowerCase();
      if (!email || seenEmails.has(email)) continue;
      seenEmails.add(email);

      recipientDocs.push({
        campaignId: campaign._id,
        userId: req.user.id,
        name: (r.name || 'Hiring Team').trim(),
        email,
        position: (r.position || '').trim(),
        company: (r.company || '').trim(),
        customFields: r.customFields || {},
        status: 'pending',
      });
    }

    if (recipientDocs.length > 0) {
      await CampaignRecipient.insertMany(recipientDocs);
      campaign.totalRecipients = recipientDocs.length;
      await campaign.save();
    }

    res.status(201).json({ campaign, recipientCount: recipientDocs.length });
  } catch (err) {
    next(err);
  }
}

export async function listCampaigns(req, res, next) {
  try {
    const campaigns = await Campaign.find({ userId: req.user.id })
      .populate('resumeId', 'customName')
      .populate('followUpTemplateId', 'name')
      .sort({ createdAt: -1 });

    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
}

export async function getCampaign(req, res, next) {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('resumeId', 'customName')
      .populate('followUpTemplateId', 'name');

    if (!campaign) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } });
    }

    const recipients = await CampaignRecipient.find({
      campaignId: campaign._id,
      userId: req.user.id,
    }).sort({ createdAt: 1 });

    res.json({ campaign, recipients });
  } catch (err) {
    next(err);
  }
}

export async function startCampaign(req, res, next) {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user.id });
    if (!campaign) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } });
    }

    const settings = await UserSettings.findOne({ userId: req.user.id });
    if (!settings || !settings.smtp?.host || !settings.smtp?.passwordEncrypted) {
      return res.status(400).json({
        error: {
          code: 'SMTP_NOT_CONFIGURED',
          message: 'SMTP settings are not configured. Please configure your email in Settings first.',
        },
      });
    }

    campaign.status = 'in_progress';
    await campaign.save();

    res.json({ campaign });
  } catch (err) {
    next(err);
  }
}

export async function pauseCampaign(req, res, next) {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: 'paused' },
      { new: true }
    );
    if (!campaign) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } });
    }
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
}

export async function resumeCampaign(req, res, next) {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: 'in_progress' },
      { new: true }
    );
    if (!campaign) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } });
    }
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
}

export async function cancelCampaign(req, res, next) {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: 'cancelled' },
      { new: true }
    );
    if (!campaign) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } });
    }
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
}

export async function updateRecipient(req, res, next) {
  try {
    const { generatedSubject, generatedBody, status } = req.body;
    const recipient = await CampaignRecipient.findOneAndUpdate(
      { _id: req.params.recipientId, userId: req.user.id },
      {
        ...(generatedSubject !== undefined && { generatedSubject: generatedSubject.trim() }),
        ...(generatedBody !== undefined && { generatedBody: generatedBody.trim() }),
        ...(status !== undefined && { status }),
      },
      { new: true }
    );

    if (!recipient) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recipient not found.' } });
    }

    res.json({ recipient });
  } catch (err) {
    next(err);
  }
}

export async function batchApprove(req, res, next) {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user.id });
    if (!campaign) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } });
    }

    await CampaignRecipient.updateMany(
      { campaignId: campaign._id, userId: req.user.id, status: 'pending' },
      { status: 'approved' }
    );

    res.json({ message: 'All pending recipients approved successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function batchGenerate(req, res, next) {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user.id });
    if (!campaign) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } });
    }

    const { jobDescription, templateId } = req.body;

    const settings = await UserSettings.findOne({ userId: req.user.id });
    const groqKeyEncrypted = settings?.ai?.groqApiKeyEncrypted;

    let resumeText = '';
    if (campaign.resumeId) {
      const resume = await Resume.findById(campaign.resumeId);
      if (resume) resumeText = resume.extractedText;
    }

    const recipients = await CampaignRecipient.find({
      campaignId: campaign._id,
      userId: req.user.id,
      status: 'pending',
    });

    let generatedCount = 0;

    if (templateId) {
      // Use existing template with variable interpolation
      const template = await Template.findOne({ _id: templateId, userId: req.user.id });
      if (!template) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found.' } });
      }

      for (const r of recipients) {
        const sub = template.subject
          .replace(/{{recipient_name}}/g, r.name)
          .replace(/{{company}}/g, r.company || '')
          .replace(/{{role}}/g, r.position || '');
        const body = template.body
          .replace(/{{recipient_name}}/g, r.name)
          .replace(/{{company}}/g, r.company || '')
          .replace(/{{role}}/g, r.position || '');

        r.generatedSubject = sub;
        r.generatedBody = body;
        await r.save();
        generatedCount++;
      }
    } else if (groqKeyEncrypted && jobDescription) {
      // Generate using AI
      const apiKey = decrypt(groqKeyEncrypted);
      const model = settings?.ai?.modelName || 'openai/gpt-oss-20b';

      for (const r of recipients) {
        try {
          const result = await generateEmail({
            apiKey,
            model,
            resumeText,
            jobDescription: `Company: ${r.company}\nRole: ${r.position}\n\n${jobDescription}`,
            recipientName: r.name,
            recipientPosition: r.position,
            company: r.company,
            hasAttachment: !!campaign.resumeId,
            userSignature: settings?.branding?.defaultSignature || '',
          });

          r.generatedSubject = result.subject;
          r.generatedBody = result.body;
          await r.save();
          generatedCount++;
        } catch (err) {
          // Continue with next recipient
        }
      }
    }

    res.json({ message: `Generated personalized emails for ${generatedCount} recipients.`, generatedCount });
  } catch (err) {
    next(err);
  }
}

export async function deleteCampaign(req, res, next) {
  try {
    const campaign = await Campaign.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!campaign) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Campaign not found.' } });
    }

    await CampaignRecipient.deleteMany({ campaignId: campaign._id });
    res.json({ message: 'Campaign deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

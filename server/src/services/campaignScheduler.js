import cron from 'node-cron';
import crypto from 'crypto';
import { Email } from '../models/Email.js';
import { Campaign } from '../models/Campaign.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';
import { UserSettings } from '../models/UserSettings.js';
import { Suppression } from '../models/Suppression.js';
import { Template } from '../models/Template.js';
import { sendEmail } from './mailService.js';
import { decrypt } from './cryptoService.js';
import { generateEmail } from './aiService.js';
import { generateUnsubscribeToken } from './trackingService.js';
import { logger } from '../utils/logger.js';

let isProcessingQueue = false;

/**
 * Checks how many emails the user has already sent in the last 24 hours.
 */
async function getSentCountToday(userId) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return Email.countDocuments({
    userId,
    status: 'sent',
    sentAt: { $gte: oneDayAgo },
  });
}

/**
 * Process scheduled individual emails that are due.
 */
async function processScheduledEmails() {
  const now = new Date();
  const dueEmails = await Email.find({
    status: 'queued',
    scheduledAt: { $lte: now },
  }).limit(20);

  for (const email of dueEmails) {
    try {
      email.status = 'sending';
      await email.save();

      const settings = await UserSettings.findOne({ userId: email.userId });
      if (!settings || !settings.smtp?.host || !settings.smtp?.passwordEncrypted) {
        throw new Error('SMTP credentials not configured in Settings.');
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

      const unsubToken = generateUnsubscribeToken(email.userId, email.to);

      const result = await sendEmail({
        smtpConfig,
        to: email.to,
        recipientName: email.recipientName,
        subject: email.subject,
        bodyMarkdown: email.body,
        trackingId: email.trackingId,
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

      logger.info({ emailId: email._id, to: email.to }, 'Scheduled email sent successfully');
    } catch (err) {
      email.status = 'failed';
      email.errorReason = err.message;
      await email.save();
      logger.error({ emailId: email._id, err: err.message }, 'Scheduled email delivery failed');
    }
  }
}

/**
 * Process active campaigns and send approved recipients with jitter and daily limits.
 */
async function processActiveCampaigns() {
  const activeCampaigns = await Campaign.find({ status: 'in_progress' });

  for (const campaign of activeCampaigns) {
    const settings = await UserSettings.findOne({ userId: campaign.userId });
    if (!settings || !settings.smtp?.host || !settings.smtp?.passwordEncrypted) {
      logger.warn({ campaignId: campaign._id }, 'Campaign paused: SMTP not configured');
      campaign.status = 'paused';
      await campaign.save();
      continue;
    }

    // Daily limit check
    const dailyLimit = settings.sending?.dailyLimit || 50;
    const sentToday = await getSentCountToday(campaign.userId);
    if (sentToday >= dailyLimit) {
      logger.info({ userId: campaign.userId, sentToday, dailyLimit }, 'User reached daily sending limit');
      continue; // Skip for now until next window
    }

    // Find next approved or pending recipient
    const recipient = await CampaignRecipient.findOne({
      campaignId: campaign._id,
      status: { $in: ['approved', 'pending'] },
    });

    if (!recipient) {
      // Check if all recipients have been processed
      const pendingCount = await CampaignRecipient.countDocuments({
        campaignId: campaign._id,
        status: { $in: ['pending', 'approved'] },
      });

      if (pendingCount === 0) {
        campaign.status = 'completed';
        await campaign.save();
        logger.info({ campaignId: campaign._id }, 'Campaign marked completed');
      }
      continue;
    }

    // Check suppression list
    const isSuppressed = await Suppression.findOne({
      userId: campaign.userId,
      email: recipient.email.toLowerCase(),
    });

    if (isSuppressed) {
      recipient.status = 'unsubscribed';
      recipient.errorReason = 'Recipient is in suppression list';
      await recipient.save();
      continue;
    }

    try {
      const smtpConfig = {
        host: settings.smtp.host,
        port: settings.smtp.port,
        secure: settings.smtp.secure,
        username: settings.smtp.username,
        password: decrypt(settings.smtp.passwordEncrypted),
        fromAddress: settings.smtp.fromAddress,
        fromName: settings.smtp.fromName,
      };

      // Ensure subject and body are ready
      let subject = recipient.generatedSubject;
      let body = recipient.generatedBody;

      if (!subject || !body) {
        // If template was selected or AI generation needed
        if (campaign.followUpTemplateId) {
          const tpl = await Template.findById(campaign.followUpTemplateId);
          if (tpl) {
            subject = tpl.subject
              .replace(/{{recipient_name}}/g, recipient.name)
              .replace(/{{company}}/g, recipient.company || '')
              .replace(/{{role}}/g, recipient.position || '');
            body = tpl.body
              .replace(/{{recipient_name}}/g, recipient.name)
              .replace(/{{company}}/g, recipient.company || '')
              .replace(/{{role}}/g, recipient.position || '');
          }
        }
      }

      if (!subject || !body) {
        recipient.status = 'failed';
        recipient.errorReason = 'Missing email subject or body';
        await recipient.save();
        continue;
      }

      const trackingId = crypto.randomBytes(16).toString('hex');
      const unsubToken = generateUnsubscribeToken(campaign.userId, recipient.email);

      // Create email record
      const emailRecord = await Email.create({
        userId: campaign.userId,
        campaignId: campaign._id,
        resumeId: campaign.resumeId,
        to: recipient.email,
        recipientName: recipient.name,
        company: recipient.company,
        role: recipient.position,
        subject,
        body,
        status: 'sending',
        trackingId,
        hasAttachment: !!campaign.resumeId,
      });

      const result = await sendEmail({
        smtpConfig,
        to: recipient.email,
        recipientName: recipient.name,
        subject,
        bodyMarkdown: body,
        trackingId,
        userSettings: settings,
        resumeId: campaign.resumeId,
        hasAttachment: !!campaign.resumeId,
        unsubscribeToken: unsubToken,
      });

      emailRecord.status = 'sent';
      emailRecord.sentAt = new Date();
      emailRecord.messageId = result.messageId;
      emailRecord.trackedLinks = result.trackedLinks;
      emailRecord.bodyHtml = result.bodyHtml;
      emailRecord.bodyText = result.bodyText;
      await emailRecord.save();

      recipient.status = 'sent';
      recipient.sentEmailId = emailRecord._id;
      await recipient.save();

      campaign.sentCount = (campaign.sentCount || 0) + 1;
      await campaign.save();

      // Delay jitter between sends
      const minDelay = settings.sending?.minDelayMs || 5000;
      const maxDelay = settings.sending?.maxDelayMs || 15000;
      const jitter = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      await new Promise(resolve => setTimeout(resolve, jitter));
    } catch (err) {
      recipient.status = 'failed';
      recipient.errorReason = err.message;
      await recipient.save();
      logger.error({ recipientId: recipient._id, err: err.message }, 'Campaign recipient send failed');
    }
  }
}

/**
 * Handle follow-up sequences for campaigns (if enabled)
 */
async function processFollowUpSequences() {
  const followUpCampaigns = await Campaign.find({
    followUpEnabled: true,
    followUpTemplateId: { $ne: null },
    status: { $in: ['in_progress', 'completed'] },
  });

  for (const campaign of followUpCampaigns) {
    const daysAgo = new Date(Date.now() - campaign.followUpDays * 24 * 60 * 60 * 1000);

    // Find emails sent before `daysAgo` that have not replied and have no follow-up yet
    const eligibleEmails = await Email.find({
      campaignId: campaign._id,
      status: 'sent',
      sentAt: { $lte: daysAgo },
      isReplied: false,
      'metadata.followUpSent': { $ne: true },
    }).limit(10);

    const template = await Template.findById(campaign.followUpTemplateId);
    if (!template) continue;

    const settings = await UserSettings.findOne({ userId: campaign.userId });
    if (!settings || !settings.smtp?.host || !settings.smtp?.passwordEncrypted) continue;

    for (const originalEmail of eligibleEmails) {
      try {
        const smtpConfig = {
          host: settings.smtp.host,
          port: settings.smtp.port,
          secure: settings.smtp.secure,
          username: settings.smtp.username,
          password: decrypt(settings.smtp.passwordEncrypted),
          fromAddress: settings.smtp.fromAddress,
          fromName: settings.smtp.fromName,
        };

        const followUpSubject = `Following up: ${originalEmail.subject}`;
        const followUpBody = template.body
          .replace(/{{recipient_name}}/g, originalEmail.recipientName || 'there')
          .replace(/{{company}}/g, originalEmail.company || '')
          .replace(/{{role}}/g, originalEmail.role || '');

        const trackingId = crypto.randomBytes(16).toString('hex');
        const unsubToken = generateUnsubscribeToken(campaign.userId, originalEmail.to);

        const followUpEmail = await Email.create({
          userId: campaign.userId,
          campaignId: campaign._id,
          to: originalEmail.to,
          recipientName: originalEmail.recipientName,
          company: originalEmail.company,
          role: originalEmail.role,
          subject: followUpSubject,
          body: followUpBody,
          status: 'sending',
          trackingId,
        });

        const result = await sendEmail({
          smtpConfig,
          to: originalEmail.to,
          recipientName: originalEmail.recipientName,
          subject: followUpSubject,
          bodyMarkdown: followUpBody,
          trackingId,
          userSettings: settings,
          unsubscribeToken: unsubToken,
        });

        followUpEmail.status = 'sent';
        followUpEmail.sentAt = new Date();
        followUpEmail.messageId = result.messageId;
        followUpEmail.trackedLinks = result.trackedLinks;
        followUpEmail.bodyHtml = result.bodyHtml;
        followUpEmail.bodyText = result.bodyText;
        await followUpEmail.save();

        // Mark original email metadata so follow-up is not sent again
        originalEmail.set('metadata.followUpSent', true);
        await originalEmail.save();

        logger.info({ originalEmailId: originalEmail._id }, 'Follow-up email sent successfully');
      } catch (err) {
        logger.error({ err: err.message }, 'Failed to send follow-up email');
      }
    }
  }
}

/**
 * Main queue runner
 */
export async function runSchedulerTick() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  try {
    await processScheduledEmails();
    await processActiveCampaigns();
    await processFollowUpSequences();
  } catch (err) {
    logger.error({ err: err.message }, 'Error in scheduler tick');
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Start recurring cron job (runs every 30 seconds)
 */
export function startCampaignScheduler() {
  // Run every 30 seconds
  const task = cron.schedule('*/30 * * * * *', async () => {
    await runSchedulerTick();
  });
  logger.info('🕒 Campaign & Email Queue Scheduler started (every 30 seconds)');
  return task;
}

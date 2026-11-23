import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { markdownToSafeHtml, markdownToPlainText } from '../utils/markdownToHtml.js';
import { Resume } from '../models/Resume.js';

/**
 * Validates email headers to prevent header injection attacks (Section 8).
 * Rejects any CR (\r) or LF (\n) characters.
 */
export function sanitizeHeader(value) {
  if (!value) return '';
  if (/[\r\n]/.test(value)) {
    const error = new Error('Header injection detected: carriage return or line feed not allowed in headers.');
    error.statusCode = 400;
    error.errorCode = 'INVALID_HEADER';
    throw error;
  }
  return value.trim();
}

/**
 * Creates Nodemailer transporter from decrypted user settings.
 */
export function createTransporter(smtpConfig) {
  const port = parseInt(smtpConfig.port, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    const error = new Error('Invalid SMTP port. Port must be between 1 and 65535.');
    error.statusCode = 400;
    error.errorCode = 'INVALID_SMTP_PORT';
    throw error;
  }

  // Section 9.6: secure=true uses implicit TLS, otherwise STARTTLS; timeouts ~20s
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port,
    secure: !!smtpConfig.secure, // true for 465, false for 587/STARTTLS
    auth: {
      user: smtpConfig.username,
      pass: smtpConfig.password,
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
  });
}

/**
 * Test SMTP connection and optionally send a test email.
 */
export async function testSmtpConnection(smtpConfig, testRecipient = null) {
  const transporter = createTransporter(smtpConfig);
  try {
    await transporter.verify();
  } catch (err) {
    logger.warn({ err: err.message }, 'SMTP verify failed');
    const error = new Error(`SMTP connection test failed: ${err.message}`);
    error.statusCode = 502;
    error.errorCode = 'SMTP_VERIFY_FAILED';
    throw error;
  }

  if (testRecipient) {
    try {
      const from = smtpConfig.fromName
        ? `"${sanitizeHeader(smtpConfig.fromName)}" <${sanitizeHeader(smtpConfig.fromAddress)}>`
        : sanitizeHeader(smtpConfig.fromAddress);

      await transporter.sendMail({
        from,
        to: sanitizeHeader(testRecipient),
        subject: 'Apply Flow - SMTP Connection Test Successful',
        text: 'Congratulations! Your SMTP settings in Apply Flow are configured correctly and active.',
        html: `
          <div style="font-family: sans-serif; padding: 24px; color: #1E293B; background: #FAF9F6;">
            <div style="background: white; border-radius: 16px; padding: 24px; border: 1px solid #FED7AA; max-width: 500px;">
              <h2 style="color: #EA580C; margin-top: 0;">SMTP Connection Verified!</h2>
              <p>Your SMTP configuration in <strong>Apply Flow</strong> has been tested successfully.</p>
              <p style="color: #64748B; font-size: 13px;">Timestamp: ${new Date().toISOString()}</p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      const error = new Error(`SMTP verified but test email sending failed: ${err.message}`);
      error.statusCode = 502;
      error.errorCode = 'SMTP_SEND_FAILED';
      throw error;
    }
  }

  return { success: true, message: 'SMTP connection verified successfully.' };
}

/**
 * Prepares and sends an email with full tracking, safe HTML rendering,
 * click link rewriting, open tracking pixel, and optional resume PDF attachment.
 */
export async function sendEmail({
  smtpConfig,
  to,
  recipientName = '',
  subject,
  bodyMarkdown,
  trackingId,
  userSettings,
  resumeId = null,
  hasAttachment = false,
  unsubscribeToken = null,
}) {
  // Input validations (Section 9.6)
  const cleanSubject = sanitizeHeader(subject);
  if (!cleanSubject) {
    const error = new Error('Email subject cannot be empty.');
    error.statusCode = 400;
    throw error;
  }
  if (cleanSubject.length > 200) {
    const error = new Error('Email subject cannot exceed 200 characters.');
    error.statusCode = 400;
    throw error;
  }

  const cleanTo = sanitizeHeader(to);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanTo)) {
    const error = new Error('Invalid recipient email address.');
    error.statusCode = 400;
    throw error;
  }

  if (!bodyMarkdown || bodyMarkdown.trim().length === 0) {
    const error = new Error('Email body cannot be empty.');
    error.statusCode = 400;
    throw error;
  }
  if (bodyMarkdown.length > 10000) {
    const error = new Error('Email body exceeds 10,000 character limit.');
    error.statusCode = 400;
    throw error;
  }

  // Step 1: Render safe HTML and plain text
  let html = markdownToSafeHtml(bodyMarkdown);
  let text = markdownToPlainText(bodyMarkdown);

  // Step 2: Rewrite links for click tracking if tracking enabled
  const trackedLinks = [];
  const clickTrackingEnabled = userSettings?.sending?.clickTrackingEnabled ?? true;

  if (clickTrackingEnabled && trackingId) {
    // Find all href="https://..." links in safe HTML
    html = html.replace(/<a\s+([^>]*?)href="(https:\/\/[^"]+)"([^>]*)>/gi, (match, prefix, url, suffix) => {
      const linkId = crypto.randomBytes(4).toString('hex');
      trackedLinks.push({
        linkId,
        originalUrl: url,
        clickCount: 0,
      });

      const trackingUrl = `${env.PUBLIC_BASE_URL}/t/c/${trackingId}/${linkId}`;
      return `<a ${prefix}href="${trackingUrl}"${suffix}>`;
    });
  }

  // Step 3: Embed open tracking pixel if tracking enabled
  const openTrackingEnabled = userSettings?.sending?.openTrackingEnabled ?? true;
  if (openTrackingEnabled && trackingId) {
    const pixelUrl = `${env.PUBLIC_BASE_URL}/t/o/${trackingId}.png`;
    const trackingPixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;outline:none;" />`;
    html = `${html}\n${trackingPixel}`;
  }

  // Step 4: Append unsubscribe footer if enabled
  const unsubscribeFooterEnabled = userSettings?.sending?.unsubscribeFooterEnabled ?? true;
  if (unsubscribeFooterEnabled && unsubscribeToken) {
    const unsubUrl = `${env.PUBLIC_BASE_URL}/u/${unsubscribeToken}`;
    html += `
      <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8; text-align: center; font-family: sans-serif;">
        You received this email from a job inquiry. <a href="${unsubUrl}" style="color: #64748B; text-decoration: underline;">Unsubscribe</a> from future communications.
      </div>
    `;
    text += `\n\n---\nTo unsubscribe from future emails: ${unsubUrl}`;
  }

  // Step 5: Handle resume attachment if requested
  const attachments = [];
  if (hasAttachment && resumeId) {
    const resume = await Resume.findById(resumeId);
    if (resume && resume.fileData) {
      const filename = userSettings?.branding?.attachmentFilename || 'Resume.pdf';
      attachments.push({
        filename: sanitizeHeader(filename),
        content: resume.fileData,
        contentType: 'application/pdf',
      });
    }
  }

  // Step 6: Construct Nodemailer message
  const fromHeader = smtpConfig.fromName
    ? `"${sanitizeHeader(smtpConfig.fromName)}" <${sanitizeHeader(smtpConfig.fromAddress)}>`
    : sanitizeHeader(smtpConfig.fromAddress);

  const transporter = createTransporter(smtpConfig);

  try {
    const info = await transporter.sendMail({
      from: fromHeader,
      to: cleanTo,
      subject: cleanSubject,
      text,
      html,
      attachments,
      headers: {
        'X-Mailer': 'Apply-Flow-Pro',
        'X-Tracking-ID': trackingId,
      },
    });

    return {
      messageId: info.messageId,
      trackedLinks,
      bodyHtml: html,
      bodyText: text,
    };
  } catch (err) {
    logger.error({ err: err.message, to: cleanTo }, 'SMTP send error');
    const error = new Error(`Failed to deliver email via SMTP: ${err.message}`);
    error.statusCode = 502;
    error.errorCode = 'SMTP_DELIVERY_FAILED';
    throw error;
  }
}

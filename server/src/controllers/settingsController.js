import { UserSettings } from '../models/UserSettings.js';
import { encrypt, decrypt, maskSecret } from '../services/cryptoService.js';
import { testSmtpConnection } from '../services/mailService.js';
import { testGroqConnection } from '../services/aiService.js';

export async function getSettings(req, res, next) {
  try {
    let settings = await UserSettings.findOne({ userId: req.user.id });
    if (!settings) {
      settings = await UserSettings.create({ userId: req.user.id });
    }

    const decryptedApiKey = settings.ai?.groqApiKeyEncrypted ? decrypt(settings.ai.groqApiKeyEncrypted) : null;
    const hasPassword = !!settings.smtp?.passwordEncrypted;

    res.json({
      settings: {
        smtp: {
          host: settings.smtp?.host || '',
          port: settings.smtp?.port || 587,
          secure: !!settings.smtp?.secure,
          username: settings.smtp?.username || '',
          passwordMasked: hasPassword ? '••••••••••••' : '',
          hasPassword,
          fromAddress: settings.smtp?.fromAddress || '',
          fromName: settings.smtp?.fromName || '',
        },
        ai: {
          groqApiKeyMasked: decryptedApiKey ? maskSecret(decryptedApiKey, 4, 4) : '',
          hasApiKey: !!decryptedApiKey,
          modelName: settings.ai?.modelName || 'openai/gpt-oss-20b',
        },
        branding: {
          attachmentFilename: settings.branding?.attachmentFilename || 'Resume.pdf',
          defaultSignature: settings.branding?.defaultSignature || `Best regards,\n${req.user.name || ''}`,
        },
        sending: {
          dailyLimit: settings.sending?.dailyLimit ?? 50,
          minDelayMs: settings.sending?.minDelayMs ?? 5000,
          maxDelayMs: settings.sending?.maxDelayMs ?? 15000,
          timezone: settings.sending?.timezone || 'UTC',
          openTrackingEnabled: settings.sending?.openTrackingEnabled ?? true,
          clickTrackingEnabled: settings.sending?.clickTrackingEnabled ?? true,
          unsubscribeFooterEnabled: settings.sending?.unsubscribeFooterEnabled ?? true,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    let settings = await UserSettings.findOne({ userId: req.user.id });
    if (!settings) {
      settings = new UserSettings({ userId: req.user.id });
    }

    const { smtp, ai, branding, sending } = req.body;

    if (smtp) {
      if (smtp.host !== undefined) settings.smtp.host = smtp.host.trim();
      if (smtp.port !== undefined) settings.smtp.port = parseInt(smtp.port, 10);
      if (smtp.secure !== undefined) settings.smtp.secure = !!smtp.secure;
      if (smtp.username !== undefined) settings.smtp.username = smtp.username.trim();
      if (smtp.fromAddress !== undefined) settings.smtp.fromAddress = smtp.fromAddress.trim();
      if (smtp.fromName !== undefined) settings.smtp.fromName = smtp.fromName.trim();

      // Only re-encrypt password if a new raw password was passed (not masked dots)
      if (smtp.password && !smtp.password.startsWith('•••')) {
        settings.smtp.passwordEncrypted = encrypt(smtp.password);
      }
    }

    if (ai) {
      if (ai.modelName !== undefined) settings.ai.modelName = ai.modelName.trim();
      // Only re-encrypt API key if a new key was passed (not masked 'gsk_****')
      if (ai.groqApiKey && !ai.groqApiKey.includes('****')) {
        settings.ai.groqApiKeyEncrypted = encrypt(ai.groqApiKey.trim());
      }
    }

    if (branding) {
      if (branding.attachmentFilename !== undefined) {
        settings.branding.attachmentFilename = branding.attachmentFilename.trim() || 'Resume.pdf';
      }
      if (branding.defaultSignature !== undefined) {
        settings.branding.defaultSignature = branding.defaultSignature;
      }
    }

    if (sending) {
      if (sending.dailyLimit !== undefined) settings.sending.dailyLimit = Math.max(1, parseInt(sending.dailyLimit, 10));
      if (sending.minDelayMs !== undefined) settings.sending.minDelayMs = Math.max(1000, parseInt(sending.minDelayMs, 10));
      if (sending.maxDelayMs !== undefined) settings.sending.maxDelayMs = Math.max(sending.minDelayMs || 5000, parseInt(sending.maxDelayMs, 10));
      if (sending.timezone !== undefined) settings.sending.timezone = sending.timezone;
      if (sending.openTrackingEnabled !== undefined) settings.sending.openTrackingEnabled = !!sending.openTrackingEnabled;
      if (sending.clickTrackingEnabled !== undefined) settings.sending.clickTrackingEnabled = !!sending.clickTrackingEnabled;
      if (sending.unsubscribeFooterEnabled !== undefined) settings.sending.unsubscribeFooterEnabled = !!sending.unsubscribeFooterEnabled;
    }

    await settings.save();
    return getSettings(req, res, next);
  } catch (err) {
    next(err);
  }
}

export async function testSmtp(req, res, next) {
  try {
    const { host, port, secure, username, password, fromAddress, fromName, testRecipient } = req.body;

    let finalPassword = password;
    if (!finalPassword || finalPassword.startsWith('•••')) {
      const settings = await UserSettings.findOne({ userId: req.user.id });
      if (settings?.smtp?.passwordEncrypted) {
        finalPassword = decrypt(settings.smtp.passwordEncrypted);
      }
    }

    if (!host || !username || !finalPassword || !fromAddress) {
      return res.status(400).json({
        error: {
          code: 'INCOMPLETE_SMTP_CONFIG',
          message: 'Please provide host, port, username, password, and from address.',
        },
      });
    }

    const smtpConfig = {
      host,
      port: parseInt(port, 10) || 587,
      secure: !!secure,
      username,
      password: finalPassword,
      fromAddress,
      fromName: fromName || '',
    };

    const result = await testSmtpConnection(smtpConfig, testRecipient || null);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function testAi(req, res, next) {
  try {
    const { apiKey, modelName } = req.body;

    let finalApiKey = apiKey;
    if (!finalApiKey || finalApiKey.includes('****')) {
      const settings = await UserSettings.findOne({ userId: req.user.id });
      if (settings?.ai?.groqApiKeyEncrypted) {
        finalApiKey = decrypt(settings.ai.groqApiKeyEncrypted);
      }
    }

    if (!finalApiKey) {
      return res.status(400).json({
        error: {
          code: 'MISSING_API_KEY',
          message: 'Please provide a valid Groq API key.',
        },
      });
    }

    await testGroqConnection(finalApiKey, modelName || 'openai/gpt-oss-20b');
    res.json({ success: true, message: 'Groq AI key verified successfully!' });
  } catch (err) {
    next(err);
  }
}

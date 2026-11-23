import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    smtp: {
      host: { type: String, default: '' },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      username: { type: String, default: '' },
      passwordEncrypted: { type: String, default: null },
      fromAddress: { type: String, default: '' },
      fromName: { type: String, default: '' },
    },
    ai: {
      groqApiKeyEncrypted: { type: String, default: null },
      modelName: { type: String, default: 'openai/gpt-oss-20b' },
    },
    branding: {
      attachmentFilename: { type: String, default: 'Resume.pdf' },
      defaultSignature: { type: String, default: 'Best regards,\n[Your Name]' },
    },
    sending: {
      dailyLimit: { type: Number, default: 50 },
      minDelayMs: { type: Number, default: 5000 },
      maxDelayMs: { type: Number, default: 15000 },
      timezone: { type: String, default: 'UTC' },
      openTrackingEnabled: { type: Boolean, default: true },
      clickTrackingEnabled: { type: Boolean, default: true },
      unsubscribeFooterEnabled: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export const UserSettings = mongoose.model('UserSettings', userSettingsSchema);

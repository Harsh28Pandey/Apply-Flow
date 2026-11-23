import mongoose from 'mongoose';

const emailSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
      index: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    recipientName: {
      type: String,
      default: '',
      trim: true,
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    role: {
      type: String,
      default: '',
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true, // Markdown text
    },
    bodyHtml: {
      type: String,
      default: '',
    },
    bodyText: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'queued', 'sending', 'sent', 'failed'],
      default: 'draft',
      index: true,
    },
    trackingId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    messageId: {
      type: String,
      default: null,
    },
    errorReason: {
      type: String,
      default: null,
    },
    hasAttachment: {
      type: Boolean,
      default: false,
    },
    attachmentFilename: {
      type: String,
      default: 'Resume.pdf',
    },
    scheduledAt: {
      type: Date,
      default: null,
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
      index: true,
    },
    openedAt: {
      type: Date,
      default: null,
    },
    openCount: {
      type: Number,
      default: 0,
    },
    clickedAt: {
      type: Date,
      default: null,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    repliedAt: {
      type: Date,
      default: null,
    },
    isReplied: {
      type: Boolean,
      default: false,
      index: true,
    },
    versions: [
      {
        subject: { type: String, required: true },
        body: { type: String, required: true },
        style: { type: String, default: 'custom' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    trackedLinks: [
      {
        linkId: { type: String, required: true },
        originalUrl: { type: String, required: true },
        clickCount: { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

emailSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const Email = mongoose.model('Email', emailSchema);

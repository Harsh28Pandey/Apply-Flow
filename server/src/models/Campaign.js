import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'paused', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null,
    },
    totalRecipients: {
      type: Number,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    openCount: {
      type: Number,
      default: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    followUpEnabled: {
      type: Boolean,
      default: false,
    },
    followUpDays: {
      type: Number,
      default: 3,
    },
    followUpTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

campaignSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const Campaign = mongoose.model('Campaign', campaignSchema);

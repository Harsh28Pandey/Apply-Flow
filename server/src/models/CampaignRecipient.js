import mongoose from 'mongoose';

const campaignRecipientSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
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
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    position: {
      type: String,
      default: '',
      trim: true,
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    customFields: {
      type: Map,
      of: String,
      default: {},
    },
    generatedSubject: {
      type: String,
      default: '',
    },
    generatedBody: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'sent', 'failed', 'unsubscribed'],
      default: 'pending',
      index: true,
    },
    sentEmailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
      default: null,
    },
    errorReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

campaignRecipientSchema.index({ campaignId: 1, email: 1 }, { unique: true });

export const CampaignRecipient = mongoose.model('CampaignRecipient', campaignRecipientSchema);

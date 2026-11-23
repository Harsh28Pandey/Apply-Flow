import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    customName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    size: {
      type: Number,
      required: true,
    },
    fileData: {
      type: Buffer,
      required: true,
    },
    extractedText: {
      type: String,
      default: '',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure quick lookups
resumeSchema.index({ userId: 1, isDefault: 1 });

export const Resume = mongoose.model('Resume', resumeSchema);

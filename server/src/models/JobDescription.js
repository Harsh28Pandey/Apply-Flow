import mongoose from 'mongoose';

const jobDescriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    jobUrl: {
      type: String,
      default: '',
      trim: true,
    },
    recipientName: {
      type: String,
      default: '',
      trim: true,
    },
    recipientPosition: {
      type: String,
      default: '',
      trim: true,
    },
    recipientEmail: {
      type: String,
      default: '',
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

jobDescriptionSchema.index({ userId: 1, company: 1, title: 1 });

export const JobDescription = mongoose.model('JobDescription', jobDescriptionSchema);

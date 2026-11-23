import mongoose from 'mongoose';

const suppressionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ['unsubscribe', 'bounce', 'manual'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

suppressionSchema.index({ userId: 1, email: 1 }, { unique: true });

export const Suppression = mongoose.model('Suppression', suppressionSchema);

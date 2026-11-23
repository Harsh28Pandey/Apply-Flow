import mongoose from 'mongoose';

const trackingEventSchema = new mongoose.Schema(
  {
    emailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['open', 'click', 'reply'],
      required: true,
      index: true,
    },
    linkId: {
      type: String,
      default: null,
    },
    destinationUrl: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: '',
    },
    ipHash: {
      type: String,
      default: '',
    },
    isBot: {
      type: Boolean,
      default: false,
      index: true,
    },
    botReason: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

trackingEventSchema.index({ userId: 1, type: 1, timestamp: -1 });

export const TrackingEvent = mongoose.model('TrackingEvent', trackingEventSchema);

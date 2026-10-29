import mongoose from 'mongoose';

const moderationEventSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassroomSession',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
    },
    messageSnapshot: {
      type: String,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ['toxic', 'insult', 'threat', 'harassment', 'hate', 'profanity', 'other'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    modelConfidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    modelName: {
      type: String,
    },
    reviewStatus: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed', 'confirmed'],
      default: 'pending',
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
moderationEventSchema.index({ sessionId: 1, createdAt: -1 });
moderationEventSchema.index({ reviewStatus: 1 });
moderationEventSchema.index({ sender: 1 });

const ModerationEvent = mongoose.model('ModerationEvent', moderationEventSchema);
export default ModerationEvent;

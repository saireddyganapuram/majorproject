import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
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
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [2000, 'Message must not exceed 2000 characters'],
      trim: true,
    },
    moderationStatus: {
      type: String,
      enum: ['clean', 'flagged', 'removed', 'visible', 'hidden'],
      default: 'clean',
    },
    flaggedReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

chatMessageSchema.virtual('message')
  .get(function () { return this.content; })
  .set(function (v) { this.content = v; });

chatMessageSchema.virtual('status')
  .get(function () { return this.moderationStatus === 'clean' ? 'visible' : this.moderationStatus; })
  .set(function (v) { this.moderationStatus = v === 'visible' ? 'clean' : v; });

// Indexes
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });
chatMessageSchema.index({ sender: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;

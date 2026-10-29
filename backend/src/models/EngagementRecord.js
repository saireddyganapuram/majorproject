import mongoose from 'mongoose';

const engagementRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassroomSession',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    faceDetected: {
      type: Boolean,
      default: true,
    },
    faceCount: {
      type: Number,
      default: 1,
    },
    engagementScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 80,
    },
    facialState: {
      type: String,
      enum: ['attentive', 'neutral', 'distracted', 'drowsy'],
      default: 'attentive',
    },
    attentionScore: {
      type: Number,
      default: 80,
    },
    headPoseState: {
      type: String,
      default: 'facing_camera',
    },
    eyeGazeScore: {
      type: Number,
      default: 85,
    },
    distractionFlag: {
      type: Boolean,
      default: false,
    },
    dataQuality: {
      type: String,
      enum: ['good', 'fair', 'poor', 'insufficient'],
      default: 'good',
    },
    notes: {
      type: String,
      default: '',
    },
    consentActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

engagementRecordSchema.virtual('overallScore')
  .get(function () { return this.engagementScore; })
  .set(function (v) { this.engagementScore = v; });

// Indexes for querying
engagementRecordSchema.index({ sessionId: 1, studentId: 1 });
engagementRecordSchema.index({ sessionId: 1, timestamp: 1 });
engagementRecordSchema.index({ studentId: 1, timestamp: -1 });

const EngagementRecord = mongoose.model('EngagementRecord', engagementRecordSchema);
export default EngagementRecord;

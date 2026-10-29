import mongoose from 'mongoose';

const consentRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassroomSession',
      required: true,
    },
    analysisType: {
      type: String,
      enum: ['webcam', 'audio', 'screen', 'face_landmarks'],
      default: 'face_landmarks',
    },
    consentGiven: {
      type: Boolean,
      default: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    withdrawnAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

consentRecordSchema.virtual('granted')
  .get(function () { return this.consentGiven; })
  .set(function (v) { this.consentGiven = Boolean(v); });

// Unique consent per student+session+type
consentRecordSchema.index(
  { studentId: 1, sessionId: 1, analysisType: 1 },
  { unique: true }
);

const ConsentRecord = mongoose.model('ConsentRecord', consentRecordSchema);
export default ConsentRecord;

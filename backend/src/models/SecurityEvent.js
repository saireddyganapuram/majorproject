import mongoose from 'mongoose';

const securityEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: [
        'login_success',
        'login_failure',
        'logout',
        'unauthorized_access',
        'forbidden_access',
        'rate_limited',
        'suspicious_session',
        'account_locked',
        'role_escalation_attempt',
        'invalid_token',
      ],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassroomSession',
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
      maxlength: 500,
    },
    outcome: {
      type: String,
      enum: ['success', 'failure', 'blocked'],
      default: 'failure',
    },
    details: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
securityEventSchema.index({ eventType: 1, createdAt: -1 });
securityEventSchema.index({ userId: 1, createdAt: -1 });
securityEventSchema.index({ createdAt: -1 });

const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);
export default SecurityEvent;

import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassroomSession',
      required: [true, 'Session ID is required'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    joinTime: {
      type: Date,
      default: Date.now,
    },
    leaveTime: {
      type: Date,
    },
    duration: {
      type: Number, // Total seconds
      default: 0,
    },
    status: {
      type: String,
      enum: ['present', 'late', 'absent', 'excused'],
      default: 'present',
    },
    joinEvents: [
      {
        joinedAt: { type: Date, default: Date.now },
        leftAt: { type: Date },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

attendanceSchema.virtual('totalDurationMinutes')
  .get(function () {
    return Math.round((this.duration || 0) / 60);
  })
  .set(function (v) {
    this.duration = v * 60;
  });

attendanceSchema.virtual('intervals')
  .get(function () {
    return (this.joinEvents || []).map((e) => ({
      joinTime: e.joinedAt,
      leaveTime: e.leftAt,
    }));
  })
  .set(function (v) {
    this.joinEvents = (v || []).map((item) => ({
      joinedAt: item.joinTime || item.joinedAt || new Date(),
      leftAt: item.leaveTime || item.leftAt,
    }));
  });

// Prevent duplicate attendance for the same student and session
attendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
attendanceSchema.index({ sessionId: 1 });
attendanceSchema.index({ studentId: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;

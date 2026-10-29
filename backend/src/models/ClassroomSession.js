import mongoose from 'mongoose';

const classroomSessionSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required'],
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor is required'],
    },
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description must not exceed 1000 characters'],
      default: '',
    },
    scheduledStart: {
      type: Date,
      required: [true, 'Scheduled start time is required'],
    },
    scheduledEnd: {
      type: Date,
      required: [true, 'Scheduled end time is required'],
    },
    actualStart: {
      type: Date,
    },
    actualEnd: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'ended', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    settings: {
      webcamAnalysisEnabled: { type: Boolean, default: true },
      chatEnabled: { type: Boolean, default: true },
      maxParticipants: { type: Number, default: 100 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

classroomSessionSchema.pre('validate', function () {
  if (!this.instructor && this.instructorId) {
    this.instructor = this.instructorId;
  }
});

classroomSessionSchema.virtual('instructorId')
  .get(function () { return this.instructor; })
  .set(function (v) { this.instructor = v; });


// Indexes
classroomSessionSchema.index({ classId: 1, status: 1 });
classroomSessionSchema.index({ instructor: 1 });
classroomSessionSchema.index({ scheduledStart: 1 });
classroomSessionSchema.index({ status: 1 });

const ClassroomSession = mongoose.model('ClassroomSession', classroomSessionSchema);
export default ClassroomSession;

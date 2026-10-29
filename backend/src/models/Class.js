import mongoose from 'mongoose';

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      minlength: [3, 'Class name must be at least 3 characters'],
      maxlength: [150, 'Class name must not exceed 150 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description must not exceed 1000 characters'],
      default: '',
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [100, 'Subject must not exceed 100 characters'],
      default: '',
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor is required'],
    },
    classCode: {
      type: String,
      unique: true,
      uppercase: true,
    },
    enrollmentType: {
      type: String,
      enum: ['open', 'approval', 'code'],
      default: 'open',
    },
    maxStudents: {
      type: Number,
      default: 100,
      min: [1, 'Max students must be at least 1'],
      max: [500, 'Max students must not exceed 500'],
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'draft'],
      default: 'active',
    },
    settings: {
      webcamRequired: { type: Boolean, default: false },
      chatEnabled: { type: Boolean, default: true },
      recordingEnabled: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
classSchema.index({ instructor: 1 });
classSchema.index({ status: 1 });

// Virtual alias for code -> classCode
classSchema.virtual('code')
  .get(function () { return this.classCode; })
  .set(function (v) { this.classCode = v; });

// Generate unique class code before saving
classSchema.pre('save', async function () {
  if (!this.classCode) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    let exists = true;

    while (exists) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await mongoose.model('Class').findOne({ classCode: code });
      exists = !!existing;
    }

    this.classCode = code;
  }
});

// Virtual for enrolled count
classSchema.virtual('enrolledCount', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'classId',
  count: true,
  match: { status: 'approved' },
});

const Class = mongoose.model('Class', classSchema);
export default Class;

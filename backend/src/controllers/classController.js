import { Class, Enrollment, ClassroomSession } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * POST /api/classes
 * Create a new class (Instructor / Admin only)
 */
export const createClass = async (req, res, next) => {
  try {
    const { name, description, subject, enrollmentType, maxStudents } = req.body;

    const newClass = await Class.create({
      name,
      description,
      subject,
      instructor: req.user._id,
      enrollmentType: enrollmentType || 'code',
      maxStudents: maxStudents || 100,
    });

    await newClass.populate('instructor', 'name email');

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: newClass,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/classes
 * List classes based on user role and query
 */
export const getClasses = async (req, res, next) => {
  try {
    let classes;

    if (req.user.role === 'admin') {
      classes = await Class.find()
        .populate('instructor', 'name email')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'instructor') {
      classes = await Class.find({ instructor: req.user._id })
        .populate('instructor', 'name email')
        .sort({ createdAt: -1 });
    } else {
      // Student: find active enrollments
      const enrollments = await Enrollment.find({
        studentId: req.user._id,
        status: 'enrolled',
      }).select('classId');

      const classIds = enrollments.map((e) => e.classId);
      classes = await Class.find({ _id: { $in: classIds } })
        .populate('instructor', 'name email')
        .sort({ createdAt: -1 });
    }

    // Attach student count and active session indicator for each class
    const enhancedClasses = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Enrollment.countDocuments({
          classId: cls._id,
          status: 'enrolled',
        });
        const activeSession = await ClassroomSession.findOne({
          classId: cls._id,
          status: 'active',
        }).select('_id title status actualStart');

        const clsObj = cls.toObject();
        clsObj.studentCount = studentCount;
        clsObj.activeSession = activeSession;
        return clsObj;
      })
    );

    res.json({
      success: true,
      count: enhancedClasses.length,
      data: enhancedClasses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/classes/:id
 * Get single class details
 */
export const getClassById = async (req, res, next) => {
  try {
    const cls = await Class.findById(req.params.id).populate('instructor', 'name email avatar');

    if (!cls) {
      throw new AppError('Class not found', 404, 'CLASS_NOT_FOUND');
    }

    // Verify access
    if (req.user.role === 'student') {
      const isEnrolled = await Enrollment.exists({
        classId: cls._id,
        studentId: req.user._id,
        status: 'enrolled',
      });
      if (!isEnrolled) {
        throw new AppError('You are not enrolled in this class', 403, 'FORBIDDEN');
      }
    }

    const studentCount = await Enrollment.countDocuments({
      classId: cls._id,
      status: 'enrolled',
    });

    const sessions = await ClassroomSession.find({ classId: cls._id })
      .sort({ scheduledStart: -1 })
      .limit(10);

    const clsObj = cls.toObject();
    clsObj.studentCount = studentCount;
    clsObj.sessions = sessions;

    res.json({
      success: true,
      data: clsObj,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/classes/:id
 * Update class info
 */
export const updateClass = async (req, res, next) => {
  try {
    const cls = await Class.findById(req.params.id);

    if (!cls) {
      throw new AppError('Class not found', 404, 'CLASS_NOT_FOUND');
    }

    if (
      req.user.role !== 'admin' &&
      cls.instructor.toString() !== req.user._id.toString()
    ) {
      throw new AppError('Not authorized to modify this class', 403, 'FORBIDDEN');
    }

    const { name, description, subject, status, maxStudents, enrollmentType } = req.body;
    if (name) cls.name = name;
    if (description !== undefined) cls.description = description;
    if (subject !== undefined) cls.subject = subject;
    if (status) cls.status = status;
    if (maxStudents) cls.maxStudents = maxStudents;
    if (enrollmentType) cls.enrollmentType = enrollmentType;

    await cls.save();

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: cls,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/classes/:id
 * Archive / delete class
 */
export const deleteClass = async (req, res, next) => {
  try {
    const cls = await Class.findById(req.params.id);

    if (!cls) {
      throw new AppError('Class not found', 404, 'CLASS_NOT_FOUND');
    }

    if (
      req.user.role !== 'admin' &&
      cls.instructor.toString() !== req.user._id.toString()
    ) {
      throw new AppError('Not authorized to delete this class', 403, 'FORBIDDEN');
    }

    cls.status = 'archived';
    await cls.save();

    res.json({
      success: true,
      message: 'Class archived successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/classes/join
 * Student joins class using code
 */
export const joinClassByCode = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new AppError('Class code is required', 400, 'MISSING_CODE');
    }

    const cls = await Class.findOne({
      $or: [{ classCode: code.toUpperCase() }, { code: code.toUpperCase() }],
      status: 'active',
    });
    if (!cls) {
      throw new AppError('Invalid class code or class is no longer active', 404, 'CLASS_NOT_FOUND');
    }

    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      classId: cls._id,
      studentId: req.user._id,
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'enrolled') {
        throw new AppError('You are already enrolled in this class', 409, 'ALREADY_ENROLLED');
      }
      if (existingEnrollment.status === 'pending') {
        throw new AppError('Your enrollment request is pending approval', 409, 'ENROLLMENT_PENDING');
      }
      // Re-enroll if previously dropped
      existingEnrollment.status = 'enrolled';
      await existingEnrollment.save();
      return res.json({
        success: true,
        message: 'Successfully re-enrolled in class',
        data: cls,
      });
    }

    // Check capacity
    const currentCount = await Enrollment.countDocuments({
      classId: cls._id,
      status: 'enrolled',
    });

    if (currentCount >= cls.maxStudents) {
      throw new AppError('This class is at maximum student capacity', 400, 'CLASS_FULL');
    }

    const enrollmentStatus = cls.enrollmentType === 'approval' ? 'pending' : 'enrolled';

    await Enrollment.create({
      classId: cls._id,
      studentId: req.user._id,
      status: enrollmentStatus,
    });

    res.status(201).json({
      success: true,
      message:
        enrollmentStatus === 'enrolled'
          ? 'Successfully enrolled in class'
          : 'Enrollment request submitted for instructor approval',
      data: cls,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/classes/:id/students
 * Get student roster for a class
 */
export const getClassStudents = async (req, res, next) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) {
      throw new AppError('Class not found', 404, 'CLASS_NOT_FOUND');
    }

    if (
      req.user.role !== 'admin' &&
      cls.instructor.toString() !== req.user._id.toString()
    ) {
      throw new AppError('Only the instructor can view class roster', 403, 'FORBIDDEN');
    }

    const enrollments = await Enrollment.find({ classId: cls._id })
      .populate('studentId', 'name email avatar createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    next(error);
  }
};

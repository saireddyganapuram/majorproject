import { ClassroomSession, Class, Attendance, Enrollment } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * POST /api/sessions
 * Create a new classroom session (Instructor / Admin only)
 */
export const createSession = async (req, res, next) => {
  try {
    const { classId, title, description, scheduledStart, scheduledEnd } = req.body;

    const cls = await Class.findById(classId);
    if (!cls) {
      throw new AppError('Associated class not found', 404, 'CLASS_NOT_FOUND');
    }

    if (
      req.user.role !== 'admin' &&
      cls.instructor.toString() !== req.user._id.toString()
    ) {
      throw new AppError('Only the class instructor can create sessions', 403, 'FORBIDDEN');
    }

    const session = await ClassroomSession.create({
      classId,
      instructor: req.user._id,
      instructorId: req.user._id,
      title,
      description,
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: new Date(scheduledEnd),
    });

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sessions/class/:classId
 * Get all sessions for a class
 */
export const getSessionsByClass = async (req, res, next) => {
  try {
    const { classId } = req.params;

    const sessions = await ClassroomSession.find({ classId })
      .populate('instructor', 'name email')
      .sort({ scheduledStart: -1 });

    res.json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sessions/:id
 * Get single session details
 */
export const getSessionById = async (req, res, next) => {
  try {
    const session = await ClassroomSession.findById(req.params.id)
      .populate('classId', 'name subject code instructor')
      .populate('instructor', 'name email avatar');

    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    // Check student authorization: student must be enrolled in class
    if (req.user.role === 'student') {
      const isEnrolled = await Enrollment.exists({
        classId: session.classId._id,
        studentId: req.user._id,
        status: 'enrolled',
      });
      if (!isEnrolled) {
        throw new AppError('You are not enrolled in this class session', 403, 'FORBIDDEN');
      }
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/sessions/:id/start
 * Instructor starts live session
 */
export const startSession = async (req, res, next) => {
  try {
    const session = await ClassroomSession.findById(req.params.id);

    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    if (
      req.user.role !== 'admin' &&
      session.instructorId.toString() !== req.user._id.toString()
    ) {
      throw new AppError('Only the session instructor can start the class', 403, 'FORBIDDEN');
    }

    if (session.status === 'completed') {
      throw new AppError('Completed sessions cannot be restarted', 400, 'ALREADY_COMPLETED');
    }

    session.status = 'active';
    session.actualStart = session.actualStart || new Date();
    await session.save();

    res.json({
      success: true,
      message: 'Session started successfully',
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/sessions/:id/end
 * Instructor ends live session
 */
export const endSession = async (req, res, next) => {
  try {
    const session = await ClassroomSession.findById(req.params.id);

    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    if (
      req.user.role !== 'admin' &&
      session.instructorId.toString() !== req.user._id.toString()
    ) {
      throw new AppError('Only the session instructor can end the class', 403, 'FORBIDDEN');
    }

    session.status = 'completed';
    session.actualEnd = new Date();
    await session.save();

    // Close any unclosed attendance records
    const unclosedAttendances = await Attendance.find({
      sessionId: session._id,
      'intervals.leaveTime': { $exists: false },
    });

    const now = new Date();
    for (const record of unclosedAttendances) {
      if (record.intervals && record.intervals.length > 0) {
        const lastInterval = record.intervals[record.intervals.length - 1];
        if (!lastInterval.leaveTime) {
          lastInterval.leaveTime = now;
          const durationMins = Math.round((now - lastInterval.joinTime) / 60000);
          record.totalDurationMinutes = (record.totalDurationMinutes || 0) + durationMins;
          await record.save();
        }
      }
    }

    res.json({
      success: true,
      message: 'Session ended successfully',
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sessions/:id/attendance/join
 * Student joins session attendance
 */
export const recordJoinAttendance = async (req, res, next) => {
  try {
    const session = await ClassroomSession.findById(req.params.id);
    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    const now = new Date();

    let record = await Attendance.findOne({
      sessionId: session._id,
      studentId: req.user._id,
    });

    if (!record) {
      record = await Attendance.create({
        sessionId: session._id,
        studentId: req.user._id,
        status: 'present',
        intervals: [{ joinTime: now }],
        totalDurationMinutes: 0,
      });
    } else {
      // Add new interval if last was closed
      const lastInterval = record.intervals[record.intervals.length - 1];
      if (!lastInterval || lastInterval.leaveTime) {
        record.intervals.push({ joinTime: now });
        record.status = 'present';
        await record.save();
      }
    }

    res.json({
      success: true,
      message: 'Join attendance recorded',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sessions/:id/attendance/leave
 * Student leaves session attendance
 */
export const recordLeaveAttendance = async (req, res, next) => {
  try {
    const record = await Attendance.findOne({
      sessionId: req.params.id,
      studentId: req.user._id,
    });

    if (record && record.intervals.length > 0) {
      const now = new Date();
      const lastInterval = record.intervals[record.intervals.length - 1];
      if (!lastInterval.leaveTime) {
        lastInterval.leaveTime = now;
        const durationMins = Math.round((now - lastInterval.joinTime) / 60000);
        record.totalDurationMinutes = (record.totalDurationMinutes || 0) + durationMins;
        await record.save();
      }
    }

    res.json({
      success: true,
      message: 'Leave attendance recorded',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sessions/:id/attendance
 * Get session attendance summary and student records
 */
export const getSessionAttendance = async (req, res, next) => {
  try {
    const session = await ClassroomSession.findById(req.params.id);
    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    const attendanceRecords = await Attendance.find({ sessionId: session._id })
      .populate('studentId', 'name email avatar')
      .sort({ createdAt: 1 });

    const enrolledCount = await Enrollment.countDocuments({
      classId: session.classId,
      status: 'enrolled',
    });

    const attendedCount = attendanceRecords.length;
    const attendanceRate = enrolledCount > 0 ? Math.round((attendedCount / enrolledCount) * 100) : 0;
    const avgDuration =
      attendedCount > 0
        ? Math.round(
            attendanceRecords.reduce((acc, r) => acc + (r.totalDurationMinutes || 0), 0) /
              attendedCount
          )
        : 0;

    res.json({
      success: true,
      data: {
        enrolledCount,
        attendedCount,
        attendanceRate,
        averageDurationMinutes: avgDuration,
        records: attendanceRecords,
      },
    });
  } catch (error) {
    next(error);
  }
};

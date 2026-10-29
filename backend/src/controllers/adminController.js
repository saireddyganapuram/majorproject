import {
  User,
  Class,
  ClassroomSession,
  Attendance,
  EngagementRecord,
  ModerationEvent,
  SecurityEvent,
} from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';
import mongoose from 'mongoose';

/**
 * GET /api/v1/admin/stats
 * System-wide high-level activity and account overview
 */
export const getSystemOverviewStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      studentCount,
      instructorCount,
      totalClasses,
      totalSessions,
      activeSessions,
      totalAttendances,
      totalObservations,
      pendingModerationCount,
      recentSecurityEvents,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'instructor' }),
      Class.countDocuments({ status: 'active' }),
      ClassroomSession.countDocuments(),
      ClassroomSession.countDocuments({ status: 'active' }),
      Attendance.countDocuments(),
      EngagementRecord.countDocuments(),
      ModerationEvent.countDocuments({ reviewStatus: 'pending' }),
      SecurityEvent.find().sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          students: studentCount,
          instructors: instructorCount,
          admins: totalUsers - studentCount - instructorCount,
        },
        classroom: {
          activeClasses: totalClasses,
          totalSessions,
          activeLiveSessions: activeSessions,
          attendanceRecords: totalAttendances,
        },
        telemetry: {
          engagementObservations: totalObservations,
          pendingModerationEvents: pendingModerationCount,
        },
        recentSecurityAudit: recentSecurityEvents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/users
 * Manage user accounts list with filtering
 */
export const getAdminUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 }).limit(100);

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/users/:id/status
 * Activate, suspend, or deactivate a user account
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      throw new AppError('Invalid status value. Must be active, inactive, or suspended', 400, 'INVALID_STATUS');
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Prevent modifying self
    if (targetUser._id.toString() === req.user._id.toString()) {
      throw new AppError('Administrators cannot change their own status', 400, 'CANNOT_MODIFY_SELF');
    }

    targetUser.status = status;
    await targetUser.save();

    // Log security event
    await SecurityEvent.create({
      eventType: 'account_status_changed',
      userId: targetUser._id,
      outcome: 'success',
      details: `Account status updated to ${status} by admin ${req.user.email}`,
    });

    res.json({
      success: true,
      message: `User status updated to ${status}`,
      data: targetUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/security-events
 * Review security logs, failed auth, and unauthorized access attempts
 */
export const getSecurityAuditLogs = async (req, res, next) => {
  try {
    const logs = await SecurityEvent.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/system-health
 * Diagnostic service availability
 */
export const getSystemHealthDiagnostics = async (req, res, next) => {
  try {
    const mongoState = mongoose.connection.readyState === 1 ? 'connected' : 'degraded';

    let aiStatus = 'unknown';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const aiRes = await fetch(`${config.aiServiceUrl}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      aiStatus = aiRes.ok ? 'operational' : 'degraded';
    } catch {
      aiStatus = 'offline';
    }

    res.json({
      success: true,
      data: {
        server: {
          uptimeSeconds: Math.round(process.uptime()),
          nodeVersion: process.version,
          memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          environment: config.nodeEnv,
        },
        services: {
          database: { name: 'MongoDB', status: mongoState },
          aiMicroservice: { name: 'FastAPI / Python 3.13', status: aiStatus, url: config.aiServiceUrl },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

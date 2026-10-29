import { EngagementRecord, ConsentRecord, ClassroomSession, Enrollment } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * POST /api/analytics/consent
 * Record or update user consent for engagement analytics
 */
export const updateConsent = async (req, res, next) => {
  try {
    const { sessionId, analysisType = 'face_landmarks', granted } = req.body;

    if (!sessionId) {
      throw new AppError('Session ID is required', 400, 'MISSING_SESSION_ID');
    }

    const consent = await ConsentRecord.findOneAndUpdate(
      {
        studentId: req.user._id,
        sessionId,
        analysisType,
      },
      {
        granted: Boolean(granted),
        consentDate: new Date(),
        ipAddress: req.ip,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: granted ? 'Analytics consent granted' : 'Analytics consent revoked',
      data: consent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/consent/:sessionId
 * Get current user consent status for a session
 */
export const getConsentStatus = async (req, res, next) => {
  try {
    const consent = await ConsentRecord.findOne({
      studentId: req.user._id,
      sessionId: req.params.sessionId,
      analysisType: 'face_landmarks',
    });

    res.json({
      success: true,
      data: {
        granted: consent ? consent.granted : false,
        record: consent,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/analytics/engagement
 * Ingest derived engagement metrics (Privacy: No raw video saved)
 */
export const recordEngagement = async (req, res, next) => {
  try {
    const {
      sessionId,
      overallScore,
      facialState,
      attentionScore,
      headPoseState,
      eyeGazeScore,
      distractionFlag,
      notes,
    } = req.body;

    const studentId = req.user.role === 'student' ? req.user._id : req.body.studentId;

    if (!sessionId) {
      throw new AppError('Session ID is required', 400, 'MISSING_SESSION_ID');
    }

    // Verify student consent
    const consent = await ConsentRecord.findOne({
      studentId,
      sessionId,
      analysisType: 'face_landmarks',
    });

    if (!consent || !consent.granted) {
      return res.status(200).json({
        success: false,
        message: 'Metrics discarded: Student has not consented to engagement analytics',
        code: 'CONSENT_NOT_GRANTED',
      });
    }

    const record = await EngagementRecord.create({
      sessionId,
      studentId,
      overallScore: Math.min(100, Math.max(0, Math.round(overallScore || 0))),
      facialState: facialState || 'attentive',
      attentionScore: attentionScore !== undefined ? attentionScore : overallScore,
      headPoseState: headPoseState || 'facing_camera',
      eyeGazeScore: eyeGazeScore !== undefined ? eyeGazeScore : 85,
      distractionFlag: Boolean(distractionFlag),
      notes: notes || '',
      timestamp: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Engagement metric recorded',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/session/:sessionId
 * Aggregated session engagement analytics for instructor dashboard
 */
export const getSessionAnalytics = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await ClassroomSession.findById(sessionId).populate('classId');

    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    // Authorization check
    if (
      req.user.role !== 'admin' &&
      session.instructorId.toString() !== req.user._id.toString()
    ) {
      throw new AppError('Only the instructor or admin can view class session analytics', 403, 'FORBIDDEN');
    }

    const records = await EngagementRecord.find({ sessionId })
      .populate('studentId', 'name email avatar')
      .sort({ timestamp: 1 });

    if (records.length === 0) {
      return res.json({
        success: true,
        data: {
          hasData: false,
          totalRecords: 0,
          averageScore: 0,
          distribution: { attentive: 0, neutral: 0, distracted: 0, drowsy: 0 },
          timeline: [],
          studentBreakdown: [],
        },
      });
    }

    // Calculate overall average
    const totalScore = records.reduce((sum, r) => sum + r.overallScore, 0);
    const averageScore = Math.round(totalScore / records.length);

    // Calculate state distribution
    const distribution = { attentive: 0, neutral: 0, distracted: 0, drowsy: 0 };
    records.forEach((r) => {
      if (distribution[r.facialState] !== undefined) {
        distribution[r.facialState]++;
      }
    });

    // Generate timeline (aggregate by 1-minute buckets)
    const timelineMap = new Map();
    records.forEach((r) => {
      const timeKey = new Date(r.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      if (!timelineMap.has(timeKey)) {
        timelineMap.set(timeKey, { scores: [], distractions: 0 });
      }
      timelineMap.get(timeKey).scores.push(r.overallScore);
      if (r.distractionFlag) timelineMap.get(timeKey).distractions++;
    });

    const timeline = Array.from(timelineMap.entries()).map(([time, val]) => ({
      time,
      engagement: Math.round(val.scores.reduce((a, b) => a + b, 0) / val.scores.length),
      distractions: val.distractions,
    }));

    // Student breakdown
    const studentMap = new Map();
    records.forEach((r) => {
      const sId = r.studentId?._id?.toString() || 'unknown';
      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          student: r.studentId,
          scores: [],
          distractionCount: 0,
        });
      }
      studentMap.get(sId).scores.push(r.overallScore);
      if (r.distractionFlag) studentMap.get(sId).distractionCount++;
    });

    const studentBreakdown = Array.from(studentMap.values()).map((s) => ({
      student: s.student,
      averageScore: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
      totalSamples: s.scores.length,
      distractionCount: s.distractionCount,
    }));

    res.json({
      success: true,
      data: {
        hasData: true,
        totalRecords: records.length,
        averageScore,
        distribution,
        timeline,
        studentBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/student/:studentId/session/:sessionId
 * Student's personal private reflection insights
 */
export const getStudentSessionAnalytics = async (req, res, next) => {
  try {
    const { studentId, sessionId } = req.params;

    // A student can only view their own insights unless requested by instructor/admin
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      throw new AppError('You can only view your own engagement insights', 403, 'FORBIDDEN');
    }

    const records = await EngagementRecord.find({ sessionId, studentId }).sort({
      timestamp: 1,
    });

    if (records.length === 0) {
      return res.json({
        success: true,
        data: {
          hasData: false,
          message: 'No analytics recorded for this session. (Ensure camera & analytics consent was enabled)',
          timeline: [],
          averageScore: 0,
          recommendations: [],
        },
      });
    }

    const total = records.reduce((sum, r) => sum + r.overallScore, 0);
    const averageScore = Math.round(total / records.length);

    const timeline = records.map((r) => ({
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      score: r.overallScore,
      state: r.facialState,
      headPose: r.headPoseState,
    }));

    // Generate constructive non-punitive recommendations
    const recommendations = [];
    if (averageScore >= 80) {
      recommendations.push('Outstanding attention! You maintained steady focus throughout discussions.');
      recommendations.push('Keep up active participation by contributing to chat questions.');
    } else if (averageScore >= 60) {
      recommendations.push('Good engagement overall with occasional attention lapses.');
      recommendations.push('Consider taking micro-stretches between class segments to refresh concentration.');
    } else {
      recommendations.push('Noticeable periods of looking away or fatigue were detected.');
      recommendations.push('Try minimizing secondary browser tabs and background distractions during live lectures.');
    }

    res.json({
      success: true,
      data: {
        hasData: true,
        averageScore,
        totalSamples: records.length,
        timeline,
        recommendations,
      },
    });
  } catch (error) {
    next(error);
  }
};

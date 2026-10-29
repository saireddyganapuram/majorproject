import { ClassroomSession, Attendance, EngagementRecord, Enrollment } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * GET /api/reports/session/:sessionId/summary
 * Academic summary report of the classroom session
 */
export const getSessionSummaryReport = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await ClassroomSession.findById(sessionId)
      .populate('classId', 'name subject code')
      .populate('instructor', 'name email');

    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    // Attendance stats
    const attendances = await Attendance.find({ sessionId }).populate('studentId', 'name email');
    const totalEnrolled = await Enrollment.countDocuments({
      classId: session.classId._id,
      status: 'enrolled',
    });

    // Engagement stats
    const records = await EngagementRecord.find({ sessionId });
    const totalScore = records.reduce((sum, r) => sum + r.overallScore, 0);
    const avgScore = records.length > 0 ? Math.round(totalScore / records.length) : 0;

    // Build student performance rows
    const studentPerformance = attendances.map((att) => {
      const studentRecords = records.filter(
        (r) => r.studentId?.toString() === att.studentId?._id?.toString()
      );
      const studentAvg =
        studentRecords.length > 0
          ? Math.round(studentRecords.reduce((s, r) => s + r.overallScore, 0) / studentRecords.length)
          : null;

      return {
        studentId: att.studentId?._id,
        name: att.studentId?.name || 'Unknown',
        email: att.studentId?.email || 'Unknown',
        attendanceStatus: att.status,
        durationMinutes: att.totalDurationMinutes,
        averageEngagement: studentAvg,
      };
    });

    const report = {
      meta: {
        generatedAt: new Date(),
        system: 'AI-Based Virtual Classroom Analytics',
      },
      sessionInfo: {
        sessionId: session._id,
        title: session.title,
        courseName: session.classId?.name,
        courseSubject: session.classId?.subject,
        instructor: session.instructor?.name || session.instructorId?.name || 'Assigned Instructor',
        scheduledStart: session.scheduledStart,
        actualStart: session.actualStart,
        actualEnd: session.actualEnd,
        status: session.status,
      },
      metrics: {
        enrolledStudents: totalEnrolled,
        attendedStudents: attendances.length,
        attendanceRate: totalEnrolled > 0 ? Math.round((attendances.length / totalEnrolled) * 100) : 0,
        classAverageEngagement: avgScore,
        totalMetricsCollected: records.length,
      },
      students: studentPerformance,
    };

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/session/:sessionId/csv
 * Download CSV report
 */
export const exportSessionCsv = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await ClassroomSession.findById(sessionId).populate('classId', 'name');
    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    const attendances = await Attendance.find({ sessionId }).populate('studentId', 'name email');
    const records = await EngagementRecord.find({ sessionId });

    let csv = 'Student Name,Student Email,Attendance Status,Duration (Minutes),Average Engagement Score (%)\n';

    attendances.forEach((att) => {
      const studentRecords = records.filter(
        (r) => r.studentId?.toString() === att.studentId?._id?.toString()
      );
      const studentAvg =
        studentRecords.length > 0
          ? Math.round(studentRecords.reduce((s, r) => s + r.overallScore, 0) / studentRecords.length)
          : 'N/A';

      const name = `"${att.studentId?.name || 'Unknown'}"`;
      const email = `"${att.studentId?.email || 'Unknown'}"`;
      csv += `${name},${email},${att.status},${att.totalDurationMinutes},${studentAvg}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Session_Report_${session._id}.csv"`
    );

    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

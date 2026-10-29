import { ModerationEvent, ClassroomSession } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * GET /api/v1/moderation/sessions/:sessionId/events
 * Retrieve moderation events for a classroom session (Instructor / Admin only)
 */
export const getSessionModerationEvents = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await ClassroomSession.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    if (
      req.user.role !== 'admin' &&
      session.instructor.toString() !== req.user._id.toString() &&
      session.instructorId?.toString() !== req.user._id.toString()
    ) {
      throw new AppError('Only the session instructor or admin can review moderation events', 403, 'FORBIDDEN');
    }

    const events = await ModerationEvent.find({ sessionId })
      .populate('sender', 'name email role avatar')
      .populate('reviewer', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/moderation/events/:eventId
 * Retrieve a single moderation event by ID
 */
export const getModerationEventById = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const event = await ModerationEvent.findById(eventId)
      .populate('sender', 'name email role avatar')
      .populate('reviewer', 'name email')
      .populate('sessionId', 'title classId');

    if (!event) {
      throw new AppError('Moderation event not found', 404, 'EVENT_NOT_FOUND');
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/moderation/events/:eventId/review
 * Instructor or admin reviews, confirms, or dismisses a flagged moderation event
 */
export const reviewModerationEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { reviewStatus, reviewNotes } = req.body;

    const allowedStatuses = ['pending', 'reviewed', 'dismissed', 'confirmed'];
    if (!allowedStatuses.includes(reviewStatus)) {
      throw new AppError(
        `Invalid review status. Allowed: ${allowedStatuses.join(', ')}`,
        400,
        'INVALID_STATUS'
      );
    }

    const event = await ModerationEvent.findById(eventId);
    if (!event) {
      throw new AppError('Moderation event not found', 404, 'EVENT_NOT_FOUND');
    }

    event.reviewStatus = reviewStatus;
    event.reviewer = req.user._id;
    event.reviewedAt = new Date();
    if (reviewNotes !== undefined) {
      event.reviewNotes = reviewNotes;
    }

    await event.save();
    await event.populate('reviewer', 'name email');

    res.json({
      success: true,
      message: `Moderation event updated to ${reviewStatus}`,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/moderation/me/history
 * Student's view of moderation feedback for their own messages
 */
export const getMyModerationHistory = async (req, res, next) => {
  try {
    const events = await ModerationEvent.find({ sender: req.user._id })
      .populate('sessionId', 'title scheduledStart')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

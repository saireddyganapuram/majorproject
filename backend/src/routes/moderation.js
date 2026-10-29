import express from 'express';
import {
  getSessionModerationEvents,
  getModerationEventById,
  reviewModerationEvent,
  getMyModerationHistory,
} from '../controllers/moderationController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { mongoIdParam } from '../validators/index.js';

const router = express.Router();

router.use(authenticate);

// Student personal moderation history
router.get('/me/history', getMyModerationHistory);

// Instructor / Admin moderation review endpoints
router.get(
  '/sessions/:sessionId/events',
  authorize('instructor', 'admin'),
  mongoIdParam('sessionId'),
  getSessionModerationEvents
);

router.get(
  '/events/:eventId',
  authorize('instructor', 'admin'),
  mongoIdParam('eventId'),
  getModerationEventById
);

router.patch(
  '/events/:eventId/review',
  authorize('instructor', 'admin'),
  mongoIdParam('eventId'),
  reviewModerationEvent
);

export default router;

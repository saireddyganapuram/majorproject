import express from 'express';
import {
  getSessionChatMessages,
  sendChatMessage,
  moderateMessage,
} from '../controllers/chatController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { mongoIdParam } from '../validators/index.js';

const router = express.Router();

router.use(authenticate);

router.get('/session/:sessionId', mongoIdParam('sessionId'), getSessionChatMessages);
router.post('/session/:sessionId', mongoIdParam('sessionId'), sendChatMessage);
router.patch('/message/:id/moderate', authorize('instructor', 'admin'), mongoIdParam('id'), moderateMessage);

export default router;

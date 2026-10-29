import express from 'express';
import {
  updateConsent,
  getConsentStatus,
  recordEngagement,
  getSessionAnalytics,
  getStudentSessionAnalytics,
} from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { mongoIdParam } from '../validators/index.js';

const router = express.Router();

router.use(authenticate);

router.post('/consent', updateConsent);
router.get('/consent/:sessionId', mongoIdParam('sessionId'), getConsentStatus);

router.post('/engagement', recordEngagement);
router.get('/session/:sessionId', mongoIdParam('sessionId'), getSessionAnalytics);
router.get('/student/:studentId/session/:sessionId', getStudentSessionAnalytics);

export default router;

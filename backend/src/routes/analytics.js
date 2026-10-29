import express from 'express';
import {
  updateConsent,
  getConsentStatus,
  recordEngagement,
  getSessionAnalytics,
  getStudentSessionAnalytics,
  getMyEngagementHistory,
} from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { mongoIdParam } from '../validators/index.js';

const router = express.Router();

router.use(authenticate);

// Consent endpoints
router.post('/consent', updateConsent);
router.get('/consent/:sessionId', mongoIdParam('sessionId'), getConsentStatus);

// Ingestion endpoints (supports /engagement and /observations)
router.post('/engagement', recordEngagement);
router.post('/observations', recordEngagement);

// Session analytics endpoints
router.get('/session/:sessionId', mongoIdParam('sessionId'), getSessionAnalytics);
router.get('/sessions/:sessionId/summary', mongoIdParam('sessionId'), getSessionAnalytics);

// Student personal analytics
router.get('/students/me/history', getMyEngagementHistory);
router.get('/me/history', getMyEngagementHistory);
router.get('/student/:studentId/session/:sessionId', getStudentSessionAnalytics);

export default router;

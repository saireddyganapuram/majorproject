import express from 'express';
import {
  getSessionSummaryReport,
  exportSessionCsv,
} from '../controllers/reportController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { mongoIdParam } from '../validators/index.js';

const router = express.Router();

router.use(authenticate);

router.get('/session/:sessionId/summary', mongoIdParam('sessionId'), getSessionSummaryReport);
router.get('/session/:sessionId/csv', mongoIdParam('sessionId'), exportSessionCsv);

export default router;

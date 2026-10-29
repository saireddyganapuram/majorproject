import express from 'express';
import {
  createSession,
  getSessionsByClass,
  getSessionById,
  startSession,
  endSession,
  recordJoinAttendance,
  recordLeaveAttendance,
  getSessionAttendance,
} from '../controllers/sessionController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createSessionValidator, mongoIdParam } from '../validators/index.js';

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('instructor', 'admin'), createSessionValidator, createSession);
router.get('/class/:classId', mongoIdParam('classId'), getSessionsByClass);
router.get('/:id', mongoIdParam('id'), getSessionById);

router.patch('/:id/start', authorize('instructor', 'admin'), mongoIdParam('id'), startSession);
router.patch('/:id/end', authorize('instructor', 'admin'), mongoIdParam('id'), endSession);

router.post('/:id/attendance/join', mongoIdParam('id'), recordJoinAttendance);
router.post('/:id/attendance/leave', mongoIdParam('id'), recordLeaveAttendance);
router.get('/:id/attendance', mongoIdParam('id'), getSessionAttendance);

export default router;

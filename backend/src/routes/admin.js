import express from 'express';
import {
  getSystemOverviewStats,
  getAdminUsers,
  updateUserStatus,
  getSecurityAuditLogs,
  getSystemHealthDiagnostics,
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { mongoIdParam } from '../validators/index.js';

const router = express.Router();

// Strict RBAC: All admin routes require admin role
router.use(authenticate, authorize('admin'));

router.get('/stats', getSystemOverviewStats);
router.get('/users', getAdminUsers);
router.patch('/users/:id/status', mongoIdParam('id'), updateUserStatus);
router.get('/security-events', getSecurityAuditLogs);
router.get('/health', getSystemHealthDiagnostics);

export default router;

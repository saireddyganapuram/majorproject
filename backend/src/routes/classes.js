import express from 'express';
import {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  joinClassByCode,
  getClassStudents,
} from '../controllers/classController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createClassValidator, updateClassValidator, mongoIdParam } from '../validators/index.js';

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(getClasses)
  .post(authorize('instructor', 'admin'), createClassValidator, createClass);

router.post('/join', authorize('student'), joinClassByCode);

router.route('/:id')
  .get(mongoIdParam('id'), getClassById)
  .put(authorize('instructor', 'admin'), updateClassValidator, updateClass)
  .delete(authorize('instructor', 'admin'), mongoIdParam('id'), deleteClass);

router.get('/:id/students', authorize('instructor', 'admin'), mongoIdParam('id'), getClassStudents);

export default router;

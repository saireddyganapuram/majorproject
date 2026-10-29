import { body, param, query } from 'express-validator';
import { validationResult } from 'express-validator';

/**
 * Middleware to check validation results and return errors.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Auth validators
 */
export const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/\d/).withMessage('Password must contain a number'),
  body('role')
    .optional()
    .isIn(['student', 'instructor']).withMessage('Role must be student or instructor'),
  validate,
];

export const loginValidator = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate,
];

/**
 * Class validators
 */
export const createClassValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Class name is required')
    .isLength({ min: 3, max: 150 }).withMessage('Class name must be 3-150 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Subject must not exceed 100 characters'),
  body('enrollmentType')
    .optional()
    .isIn(['open', 'approval', 'code']).withMessage('Invalid enrollment type'),
  body('maxStudents')
    .optional()
    .isInt({ min: 1, max: 500 }).withMessage('Max students must be 1-500'),
  validate,
];

export const updateClassValidator = [
  param('id').isMongoId().withMessage('Invalid class ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 150 }).withMessage('Class name must be 3-150 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('status')
    .optional()
    .isIn(['active', 'archived', 'draft']).withMessage('Invalid class status'),
  validate,
];

/**
 * Session validators
 */
export const createSessionValidator = [
  body('classId')
    .isMongoId().withMessage('Invalid class ID'),
  body('title')
    .trim()
    .notEmpty().withMessage('Session title is required')
    .isLength({ max: 200 }).withMessage('Title must not exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('scheduledStart')
    .isISO8601().withMessage('Invalid start date format'),
  body('scheduledEnd')
    .isISO8601().withMessage('Invalid end date format'),
  validate,
];

/**
 * Enrollment validators
 */
export const enrollValidator = [
  body('classId')
    .isMongoId().withMessage('Invalid class ID'),
  body('classCode')
    .optional()
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage('Class code must be 6 characters'),
  validate,
];

/**
 * Common param validators
 */
export const mongoIdParam = (paramName = 'id') => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
  validate,
];

/**
 * Pagination query validators
 */
export const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  validate,
];

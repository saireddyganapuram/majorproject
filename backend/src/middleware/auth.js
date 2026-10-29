import { User } from '../models/index.js';
import { SecurityEvent } from '../models/index.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from './errorHandler.js';

/**
 * Authentication middleware.
 * Verifies JWT from HttpOnly cookie and attaches user to request.
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401, 'AUTH_REQUIRED');
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new AppError('User not found. Account may have been deleted.', 401, 'USER_NOT_FOUND');
    }

    if (user.status !== 'active') {
      throw new AppError('Account is not active. Contact an administrator.', 403, 'ACCOUNT_INACTIVE');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token. Please log in again.', 401, 'INVALID_TOKEN'));
    }
    next(error);
  }
};

/**
 * Role-based authorization middleware.
 * @param  {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    if (!roles.includes(req.user.role)) {
      // Log the unauthorized access attempt
      SecurityEvent.create({
        eventType: 'forbidden_access',
        userId: req.user._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')?.substring(0, 500),
        outcome: 'blocked',
        details: `Role ${req.user.role} attempted to access ${req.method} ${req.originalUrl}`,
      }).catch(() => {}); // Non-blocking

      return next(
        new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN')
      );
    }

    next();
  };
};

/**
 * Optional authentication — attaches user if token is valid, but doesn't fail.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;
    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
  } catch {
    // Token invalid or expired — continue without user
  }
  next();
};

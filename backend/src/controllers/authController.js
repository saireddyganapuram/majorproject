import { User, SecurityEvent } from '../models/index.js';
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  verifyRefreshToken,
} from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * POST /api/v1/auth/register
 * Register a new user account.
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('An account with this email already exists', 409, 'DUPLICATE_EMAIL');
    }

    // Prevent admin registration through public API
    const safeRole = role === 'instructor' ? 'instructor' : 'student';

    const user = await User.create({
      name,
      email,
      password,
      role: safeRole,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    // Log security event
    await SecurityEvent.create({
      eventType: 'login_success',
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 500),
      outcome: 'success',
      details: 'New account registration',
    });

    const userResponse = user.toJSON();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/login
 * Authenticate a user with email and password.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password field included
    const user = await User.findOne({ email }).select('+password');

    // Prevent account enumeration — use generic error
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Check if account is locked
    if (user.isLocked()) {
      await SecurityEvent.create({
        eventType: 'account_locked',
        userId: user._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')?.substring(0, 500),
        outcome: 'blocked',
        details: 'Login attempt on locked account',
      });
      throw new AppError(
        'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
        423,
        'ACCOUNT_LOCKED'
      );
    }

    // Check account status
    if (user.status !== 'active') {
      throw new AppError('Account is not active. Contact an administrator.', 403, 'ACCOUNT_INACTIVE');
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();

      await SecurityEvent.create({
        eventType: 'login_failure',
        userId: user._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')?.substring(0, 500),
        outcome: 'failure',
        details: 'Invalid password',
      });

      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    // Log security event
    await SecurityEvent.create({
      eventType: 'login_success',
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 500),
      outcome: 'success',
    });

    const userResponse = user.toJSON();

    res.json({
      success: true,
      message: 'Login successful',
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 * Clear auth cookies and log the event.
 */
export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await SecurityEvent.create({
        eventType: 'logout',
        userId: req.user._id,
        ipAddress: req.ip,
        outcome: 'success',
      });
    }

    clearAuthCookies(res);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 * Get current authenticated user's profile.
 */
export const getMe = async (req, res) => {
  res.json({
    success: true,
    message: 'User profile retrieved',
    data: req.user,
  });
};

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token cookie.
 */
export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      throw new AppError('No refresh token provided', 401, 'NO_REFRESH_TOKEN');
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);

    if (!user || user.status !== 'active') {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Generate new access token
    const accessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    setAuthCookies(res, accessToken, newRefreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: user.toJSON(),
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      clearAuthCookies(res);
      return next(new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN'));
    }
    next(error);
  }
};

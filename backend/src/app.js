import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import classRoutes from './routes/classes.js';
import sessionRoutes from './routes/sessions.js';
import analyticsRoutes from './routes/analytics.js';
import chatRoutes from './routes/chat.js';
import reportRoutes from './routes/reports.js';

/**
 * Create and configure the Express application.
 */
const createApp = () => {
  const app = express();

  // ── Security middleware ──
  app.use(helmet());
  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ── Rate limiting ──
  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
    },
  });
  app.use('/api/', limiter);

  // ── Body parsing ──
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ── Logging ──
  if (config.nodeEnv !== 'test') {
    app.use(morgan(config.logLevel));
  }

  // ── API routes (support both /api and /api/v1) ──
  app.use('/api', healthRoutes);
  app.use('/api/v1', healthRoutes);

  app.use('/api/auth', authRoutes);
  app.use('/api/v1/auth', authRoutes);

  app.use('/api/classes', classRoutes);
  app.use('/api/v1/classes', classRoutes);

  app.use('/api/sessions', sessionRoutes);
  app.use('/api/v1/sessions', sessionRoutes);

  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);

  app.use('/api/chat', chatRoutes);
  app.use('/api/v1/chat', chatRoutes);

  app.use('/api/reports', reportRoutes);
  app.use('/api/v1/reports', reportRoutes);

  // ── 404 and error handling ──
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;

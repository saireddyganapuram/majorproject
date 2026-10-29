import { Router } from 'express';
import mongoose from 'mongoose';
import { config } from '../config/index.js';

const router = Router();

/**
 * GET /api/health
 * Returns the health status of the backend and its dependencies.
 */
router.get('/health', async (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongoStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  // Check AI service availability
  let aiServiceStatus = 'unknown';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${config.aiServiceUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    aiServiceStatus = response.ok ? 'healthy' : 'unhealthy';
  } catch {
    aiServiceStatus = 'unavailable';
  }

  const isHealthy = mongoState === 1;

  res.status(isHealthy ? 200 : 503).json({
    success: true,
    message: isHealthy ? 'All services operational' : 'Some services are degraded',
    data: {
      service: 'virtual-classroom-backend',
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      dependencies: {
        mongodb: mongoStates[mongoState] || 'unknown',
        aiService: aiServiceStatus,
      },
    },
  });
});

/**
 * GET /api/health/ready
 * Readiness probe — only returns 200 if all critical dependencies are available.
 */
router.get('/health/ready', (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;

  if (mongoReady) {
    return res.status(200).json({
      success: true,
      message: 'Service is ready',
      data: { ready: true },
    });
  }

  return res.status(503).json({
    success: false,
    message: 'Service is not ready',
    data: { ready: false, reason: 'Database not connected' },
  });
});

export default router;

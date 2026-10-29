import http from 'http';
import { config, validateConfig } from './config/index.js';
import connectDB from './config/database.js';
import createApp from './app.js';
import initializeSocket from './sockets/index.js';

/**
 * Server entry point.
 * 1. Validates configuration
 * 2. Connects to MongoDB
 * 3. Creates Express app
 * 4. Initializes Socket.IO
 * 5. Starts HTTP server
 */
const startServer = async () => {
  try {
    // Step 1: Validate environment configuration
    validateConfig();

    // Step 2: Connect to MongoDB
    await connectDB();

    // Step 3: Create Express application
    const app = createApp();

    // Step 4: Create HTTP server and attach Socket.IO
    const httpServer = http.createServer(app);
    const io = initializeSocket(httpServer);

    // Make io accessible to route handlers via app.locals
    app.locals.io = io;

    // Step 5: Start listening
    httpServer.listen(config.port, () => {
      console.log(`\n🚀 Backend server running on http://localhost:${config.port}`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Health check: http://localhost:${config.port}/api/health`);
      console.log(`   Frontend URL: ${config.frontendUrl}`);
      console.log(`   AI Service URL: ${config.aiServiceUrl}\n`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n⏻ Received ${signal}. Shutting down gracefully...`);
      io.close();
      httpServer.close(async () => {
        const { default: mongoose } = await import('mongoose');
        await mongoose.connection.close();
        console.log('✅ Server shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Could not close connections in time. Forcing shutdown.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason) => {
      console.error('❌ Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

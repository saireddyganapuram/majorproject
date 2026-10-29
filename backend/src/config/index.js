import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  mongoUri: process.env.MONGODB_URI || '',

  // JWT
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // AI Service
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',

  // Cookie
  cookieSecure: process.env.NODE_ENV === 'production',
  cookieSameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'dev',
};

// Validate critical configuration
const validateConfig = () => {
  const errors = [];

  if (!config.mongoUri) {
    errors.push('MONGODB_URI is required. Set it in the .env file.');
  }

  if (!config.jwtSecret) {
    errors.push('JWT_SECRET is required. Set it in the .env file.');
  }

  if (config.jwtSecret && config.jwtSecret.length < 32) {
    errors.push('JWT_SECRET should be at least 32 characters long.');
  }

  if (errors.length > 0) {
    console.error('\n❌ Configuration Errors:');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.error('\nPlease check your .env file. See .env.example for reference.\n');
    process.exit(1);
  }
};

export { config, validateConfig };

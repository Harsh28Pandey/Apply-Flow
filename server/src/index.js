import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { createApp } from './app.js';
import { startCampaignScheduler } from './services/campaignScheduler.js';

async function bootstrap() {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Initialize App
    const app = createApp();

    // 3. Start background scheduler
    startCampaignScheduler();

    // 4. Start HTTP Server
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Apply Flow Server running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`🔗 Public Base URL: ${env.PUBLIC_BASE_URL}`);
      logger.info(`📡 Client Origin: ${env.CLIENT_ORIGIN}`);
    });

    // Graceful Shutdown
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error({ err }, 'Failed to bootstrap server');
    process.exit(1);
  }
}

bootstrap();

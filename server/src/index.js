import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { createApp } from './app.js';
import { startCampaignScheduler } from './services/campaignScheduler.js';

const app = createApp();

// Only listen on port in non-production environments (local development)
// In production (Vercel serverless), the exported app is invoked per request
if (env.NODE_ENV !== 'production') {
  connectDB()
    .then(() => {
      startCampaignScheduler();
      const server = app.listen(env.PORT, () => {
        logger.info(`Apply Flow Server running on port ${env.PORT} [${env.NODE_ENV}]`);
        logger.info(`Public Base URL: ${env.PUBLIC_BASE_URL}`);
        logger.info(`Client Origin: ${env.CLIENT_ORIGIN}`);
      });

      const shutdown = async (signal) => {
        logger.info(`Received ${signal}. Shutting down gracefully...`);
        server.close(() => {
          logger.info('HTTP server closed.');
          process.exit(0);
        });
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
    })
    .catch((err) => {
      logger.error({ err }, 'Failed to start local development server');
      process.exit(1);
    });
}

export default app;

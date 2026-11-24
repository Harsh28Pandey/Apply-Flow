import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/authRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import resumesRoutes from './routes/resumesRoutes.js';
import jdsRoutes from './routes/jdsRoutes.js';
import templatesRoutes from './routes/templatesRoutes.js';
import emailsRoutes from './routes/emailsRoutes.js';
import campaignsRoutes from './routes/campaignsRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import publicRoutes from './routes/publicRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Trust proxy for proper IP resolution behind proxies/load balancers
  app.set('trust proxy', 1);

  // Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // Let React app handle resources smoothly
    })
  );

  // Flexible and secure CORS configuration
  const configuredOrigins = (env.CLIENT_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed =
          configuredOrigins.includes(origin) ||
          origin.endsWith('.vercel.app') ||
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

        if (isAllowed) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Body and cookie parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Public unauthenticated tracking, unsubscribe, and health routes
  app.use('/', publicRoutes);

  // Versioned API v1 routes with rate limiting
  app.use('/api/', generalLimiter);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/settings', settingsRoutes);
  app.use('/api/v1/resumes', resumesRoutes);
  app.use('/api/v1/jds', jdsRoutes);
  app.use('/api/v1/templates', templatesRoutes);
  app.use('/api/v1/emails', emailsRoutes);
  app.use('/api/v1/campaigns', campaignsRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/tracking', trackingRoutes);

  // Serve built client SPA if client/dist exists or in production
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(path.join(clientDistPath, 'index.html')) || env.NODE_ENV === 'production') {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (
        req.originalUrl.startsWith('/api/') ||
        req.originalUrl.startsWith('/t/') ||
        req.originalUrl.startsWith('/u/') ||
        req.originalUrl.startsWith('/health')
      ) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `API endpoint ${req.method} ${req.originalUrl} not found.`,
      },
    });
  });

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
}

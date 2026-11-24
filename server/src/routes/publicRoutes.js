import { Router } from 'express';
import { trackOpen, trackClick, unsubscribe } from '../controllers/trackingController.js';

const router = Router();

// Root endpoint - verifies serverless function boots without database dependency
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Apply Flow API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoints (both /health and /api/health)
const healthHandler = (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Apply Flow API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

router.get('/health', healthHandler);
router.get('/api/health', healthHandler);

// Public open tracking pixel
router.get('/t/o/:trackingId', trackOpen);

// Public click tracking redirect
router.get('/t/c/:trackingId/:linkId', trackClick);

// Public unsubscribe endpoint
router.get('/u/:token', unsubscribe);
router.post('/u/:token', unsubscribe);

export default router;

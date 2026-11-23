import { Router } from 'express';
import { trackOpen, trackClick, unsubscribe } from '../controllers/trackingController.js';

const router = Router();

// Public open tracking pixel
router.get('/t/o/:trackingId', trackOpen);

// Public click tracking redirect
router.get('/t/c/:trackingId/:linkId', trackClick);

// Public unsubscribe endpoint
router.get('/u/:token', unsubscribe);
router.post('/u/:token', unsubscribe);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Apply Flow API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;

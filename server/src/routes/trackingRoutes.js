import { Router } from 'express';
import { streamTrackingEvents } from '../controllers/trackingController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Authenticated SSE stream for live tracking updates
router.get('/stream', authenticate, streamTrackingEvents);

export default router;

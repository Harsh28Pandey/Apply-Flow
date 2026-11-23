import { Router } from 'express';
import { getSettings, updateSettings, testSmtp, testAi } from '../controllers/settingsController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/test-smtp', testSmtp);
router.post('/test-ai', testAi);

export default router;

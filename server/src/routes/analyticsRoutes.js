import { Router } from 'express';
import { getSummary, getTimeseries, getBreakdowns } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/timeseries', getTimeseries);
router.get('/breakdowns', getBreakdowns);

export default router;

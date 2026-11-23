import { Router } from 'express';
import {
  generate,
  refine,
  createDraft,
  updateDraft,
  sendNow,
  schedule,
  cancelSchedule,
  listEmails,
  getEmail,
  markReplied,
  deleteEmail,
  exportCsv,
} from '../controllers/emailsController.js';
import { authenticate } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(authenticate);

router.post('/generate', aiLimiter, generate);
router.post('/refine', aiLimiter, refine);
router.post('/drafts', createDraft);
router.put('/drafts/:id', updateDraft);
router.post('/send', sendNow);
router.post('/schedule', schedule);
router.post('/:id/cancel-schedule', cancelSchedule);
router.get('/', listEmails);
router.get('/export/csv', exportCsv);
router.get('/:id', getEmail);
router.post('/:id/replied', markReplied);
router.patch('/:id/reply', markReplied);
router.patch('/:id/replied', markReplied);
router.post('/:id/reply', markReplied);
router.delete('/:id', deleteEmail);

export default router;

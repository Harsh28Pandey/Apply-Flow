import { Router } from 'express';
import {
  createCampaign,
  listCampaigns,
  getCampaign,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  updateRecipient,
  batchApprove,
  batchGenerate,
  deleteCampaign,
} from '../controllers/campaignsController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listCampaigns);
router.post('/', createCampaign);
router.get('/:id', getCampaign);
router.post('/:id/start', startCampaign);
router.post('/:id/pause', pauseCampaign);
router.post('/:id/resume', resumeCampaign);
router.post('/:id/cancel', cancelCampaign);
router.patch('/:id/recipients/:recipientId', updateRecipient);
router.post('/:id/batch-approve', batchApprove);
router.post('/:id/batch-generate', batchGenerate);
router.delete('/:id', deleteCampaign);

export default router;

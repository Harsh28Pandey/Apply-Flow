import { Router } from 'express';
import { listJds, createJd, getJd, updateJd, deleteJd } from '../controllers/jdsController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listJds);
router.post('/', createJd);
router.get('/:id', getJd);
router.put('/:id', updateJd);
router.delete('/:id', deleteJd);

export default router;

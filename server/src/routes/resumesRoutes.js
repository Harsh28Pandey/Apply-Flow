import { Router } from 'express';
import multer from 'multer';
import {
  uploadResume,
  listResumes,
  getResume,
  downloadResume,
  renameResume,
  updateExtractedText,
  setDefaultResume,
  deleteResume,
} from '../controllers/resumesController.js';
import { authenticate } from '../middleware/auth.js';

// Memory storage for PDF uploads (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.use(authenticate);

router.post('/upload', upload.single('resume'), uploadResume);
router.get('/', listResumes);
router.get('/:id', getResume);
router.get('/:id/download', downloadResume);
router.patch('/:id/rename', renameResume);
router.patch('/:id/text', updateExtractedText);
router.patch('/:id/set-default', setDefaultResume);
router.delete('/:id', deleteResume);

export default router;

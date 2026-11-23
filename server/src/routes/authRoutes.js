import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Authenticated user profile routes
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);
router.delete('/me', authenticate, deleteAccount);

export default router;

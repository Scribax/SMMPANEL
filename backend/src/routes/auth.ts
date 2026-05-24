import { Router } from 'express';
import { register, login, getMe, changePassword, getMyReferrals } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getMe);
router.get('/my-referrals', authenticate, getMyReferrals);
router.put('/change-password', authenticate, changePassword);

export default router;

import { Router } from 'express';
import { createCheckout, handleWebhook, getPaymentStatus, createDeposit, getMyDeposits } from '../controllers/paymentController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { orderLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/checkout', orderLimiter, optionalAuth, createCheckout);
router.post('/webhook', handleWebhook);
router.get('/status/:orderId', authenticate, getPaymentStatus);
router.post('/deposit', orderLimiter, authenticate, createDeposit);
router.get('/deposits', authenticate, getMyDeposits);

export default router;

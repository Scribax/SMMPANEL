import { Router } from 'express';
import { createCheckout, handleWebhook, getPaymentStatus, createDeposit, getMyDeposits, verifyDeposit } from '../controllers/paymentController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { orderLimiter } from '../middleware/rateLimiter';
import { createPromoCheckout } from '../controllers/promoCheckoutController';

const router = Router();

router.post('/checkout', orderLimiter, optionalAuth, createCheckout);
router.post('/promo-checkout', orderLimiter, authenticate, createPromoCheckout);
router.post('/webhook', handleWebhook);
router.get('/status/:orderId', authenticate, getPaymentStatus);
router.post('/deposit', orderLimiter, authenticate, createDeposit);
router.get('/deposits', authenticate, getMyDeposits);
router.post('/verify-deposit', authenticate, verifyDeposit);

export default router;

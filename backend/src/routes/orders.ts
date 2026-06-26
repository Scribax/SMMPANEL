import { Router } from 'express';
import { getMyOrders, getOrderById, requestRefill, cancelOrder } from '../controllers/orderController';
import { authenticate } from '../middleware/auth';
import { orderLimiter, refillLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

router.get('/', getMyOrders);
router.get('/:id', getOrderById);
router.post('/:id/refill', refillLimiter, requestRefill);
router.post('/:id/cancel', cancelOrder);

export default router;

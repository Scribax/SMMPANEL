import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getVapidKey, subscribePush, unsubscribePush } from '../controllers/pushController';

const router = Router();

// Public: clients need the VAPID key before they can subscribe
router.get('/vapid-key', getVapidKey);

// Authenticated: subscribe / unsubscribe
router.post('/subscribe', authenticate, subscribePush);
router.delete('/unsubscribe', authenticate, unsubscribePush);

export default router;

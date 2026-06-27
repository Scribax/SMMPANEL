import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import {
  getAllServices,
  getServiceById,
  getServicesByPlatform,
  calculatePrice,
} from '../controllers/serviceController';

const router = Router();

router.get('/', getAllServices);
router.get('/platform/:platform', getServicesByPlatform);
router.get('/:id', getServiceById);
router.post('/calculate-price', optionalAuth, calculatePrice);

export default router;

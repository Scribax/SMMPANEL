import { Router } from 'express';
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
router.post('/calculate-price', calculatePrice);

export default router;

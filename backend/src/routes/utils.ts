import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getLinkPreview } from '../controllers/utilsController';

const router = Router();

router.use(authenticate);
router.get('/link-preview', getLinkPreview);

export default router;

import { Router } from 'express';
import { getLinkPreview } from '../controllers/utilsController';

const router = Router();

router.get('/link-preview', getLinkPreview);

export default router;

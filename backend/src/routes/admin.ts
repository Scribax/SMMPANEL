import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import {
  getDashboardStats,
  adminGetServices, adminCreateService, adminUpdateService, adminDeleteService,
  adminGetProviders, adminCreateProvider, adminUpdateProvider,
  adminGetProviderBalance, adminSyncProviderServices,
  adminGetOrders, adminUpdateOrderStatus, adminRefundOrder, adminRetryOrder,
  adminGetUsers, adminToggleUser,
  adminGetCoupons, adminCreateCoupon, adminUpdateCoupon,
} from '../controllers/adminController';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/stats', getDashboardStats);

router.get('/services', adminGetServices);
router.post('/services', adminCreateService);
router.put('/services/:id', adminUpdateService);
router.delete('/services/:id', adminDeleteService);

router.get('/providers', adminGetProviders);
router.post('/providers', adminCreateProvider);
router.put('/providers/:id', adminUpdateProvider);
router.get('/providers/:id/balance', adminGetProviderBalance);
router.post('/providers/:id/sync-services', adminSyncProviderServices);

router.get('/orders', adminGetOrders);
router.put('/orders/:id/status', adminUpdateOrderStatus);
router.post('/orders/:id/refund', adminRefundOrder);
router.post('/orders/:id/retry', adminRetryOrder);

router.get('/users', adminGetUsers);
router.post('/users/:id/toggle', adminToggleUser);

router.get('/coupons', adminGetCoupons);
router.post('/coupons', adminCreateCoupon);
router.put('/coupons/:id', adminUpdateCoupon);

export default router;

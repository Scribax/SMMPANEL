import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import {
  getDashboardStats,
  adminGetServices, adminCreateService, adminUpdateService, adminDeleteService,
  adminGetProviders, adminCreateProvider, adminUpdateProvider,
  adminGetProviderBalance, adminSyncProviderServices,
  adminGetOrders, adminUpdateOrderStatus, adminRefundOrder, adminRetryOrder, adminCreateOrder, adminDeleteOrder,
  adminGetUsers, adminToggleUser, adminGetUserDetail, adminAdjustUserBalance, adminDeleteUser, adminChangeUserRole, adminUpdateUserReseller,
  adminGetCoupons, adminCreateCoupon, adminUpdateCoupon, adminDeleteCoupon,
  adminPreviewMarketingEmail, adminSendMarketingEmail,
} from '../controllers/adminController';
import {
  adminGetPromotions,
  adminCreatePromotion,
  adminUpdatePromotion,
  adminDeletePromotion,
} from '../controllers/promotionController';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/dashboard-stats', getDashboardStats);

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
router.post('/orders', adminCreateOrder);
router.put('/orders/:id/status', adminUpdateOrderStatus);
router.post('/orders/:id/refund', adminRefundOrder);
router.post('/orders/:id/retry', adminRetryOrder);

router.get('/users', adminGetUsers);
router.get('/users/:id', adminGetUserDetail);
router.post('/users/:id/toggle', adminToggleUser);
router.post('/users/:id/balance', adminAdjustUserBalance);
router.put('/users/:id/role', adminChangeUserRole);
router.put('/users/:id/reseller', adminUpdateUserReseller);
router.delete('/users/:id', adminDeleteUser);

router.delete('/orders/:id', adminDeleteOrder);

router.get('/coupons', adminGetCoupons);
router.post('/coupons', adminCreateCoupon);
router.put('/coupons/:id', adminUpdateCoupon);
router.delete('/coupons/:id', adminDeleteCoupon);

router.get('/promotions', adminGetPromotions);
router.post('/promotions', adminCreatePromotion);
router.put('/promotions/:id', adminUpdatePromotion);
router.delete('/promotions/:id', adminDeletePromotion);

router.post('/marketing-email/preview', adminPreviewMarketingEmail);
router.post('/marketing-email/send', adminSendMarketingEmail);

export default router;

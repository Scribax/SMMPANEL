import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createPaymentPreference, getPaymentDetails } from '../services/paymentService';
import { sendOrderToProvider } from '../services/providerService';
import { sendOrderConfirmation } from '../services/emailService';
import { logger } from '../utils/logger';

interface ServiceRow {
  id: string;
  name: string;
  price_per_unit: number;
  min_quantity: number;
  max_quantity: number;
  provider_id: string;
  provider_service_id: number;
}

interface CouponRow {
  id: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
}

export const createDeposit = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { amount } = req.body;
  const parsedAmount = parseFloat(String(amount));
  if (!parsedAmount || parsedAmount < 100) {
    res.status(400).json({ success: false, message: 'El monto mínimo es $100 ARS' });
    return;
  }

  try {
    const depositResult = await query<{ id: string }>(
      `INSERT INTO deposits (user_id, amount, status) VALUES ($1, $2, 'pending') RETURNING id`,
      [userId, parsedAmount]
    );
    const depositId = depositResult.rows[0].id;

    const pref = await createPaymentPreference({
      orderId: `deposit_${depositId}`,
      title: 'Recarga de saldo — BoostIns',
      quantity: 1,
      unitPrice: parsedAmount,
      payerEmail: req.user!.email,
      payerName: req.user!.name,
    });

    await query(`UPDATE deposits SET preference_id = $1 WHERE id = $2`, [pref.id, depositId]);

    logger.info('Deposit created', { depositId, amount: parsedAmount });
    res.status(201).json({
      success: true,
      depositId,
      preferenceId: pref.id,
      initPoint: pref.initPoint,
      sandboxInitPoint: pref.sandboxInitPoint,
    });
  } catch (err: unknown) {
    const mpError = err as { message?: string; cause?: unknown; status?: number };
    logger.error('Error creating deposit', {
      message: mpError?.message,
      cause: JSON.stringify(mpError?.cause ?? err),
      status: mpError?.status,
    });
    res.status(500).json({ success: false, message: 'Error al procesar el pago con MercadoPago' });
  }
};

export const getMyDeposits = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const result = await query(
    `SELECT id, amount, status, created_at FROM deposits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
    [userId]
  );
  res.json({ success: true, deposits: result.rows });
};

export const createCheckout = async (req: AuthRequest, res: Response): Promise<void> => {
  const { serviceId, quantity, link, email, couponCode } = req.body;

  if (!serviceId || !quantity || !link || !email) {
    res.status(400).json({ success: false, message: 'serviceId, quantity, link and email are required' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ success: false, message: 'Invalid email address' });
    return;
  }

  const serviceResult = await query<ServiceRow>(
    'SELECT id, name, price_per_unit, min_quantity, max_quantity, provider_id, provider_service_id FROM services WHERE id = $1 AND is_active = true',
    [serviceId]
  );

  if (!serviceResult.rows.length) {
    res.status(404).json({ success: false, message: 'Service not found or inactive' });
    return;
  }

  const service = serviceResult.rows[0];
  const qty = parseInt(String(quantity), 10);

  if (qty < service.min_quantity || qty > service.max_quantity) {
    res.status(400).json({
      success: false,
      message: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}`,
    });
    return;
  }

  let originalPrice = parseFloat((service.price_per_unit * qty).toFixed(2));
  let finalPrice = originalPrice;
  let couponId: string | null = null;

  if (couponCode) {
    const couponResult = await query<CouponRow>(
      `SELECT id, discount_type, discount_value, min_order_value, max_uses, used_count, expires_at
       FROM coupons
       WHERE UPPER(code) = UPPER($1) AND is_active = true`,
      [couponCode]
    );

    if (couponResult.rows.length) {
      const coupon = couponResult.rows[0];
      const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
      const isMaxed = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses;
      const meetsMinValue = originalPrice >= coupon.min_order_value;

      if (!isExpired && !isMaxed && meetsMinValue) {
        couponId = coupon.id;
        if (coupon.discount_type === 'percentage') {
          finalPrice = originalPrice * (1 - coupon.discount_value / 100);
        } else {
          finalPrice = originalPrice - coupon.discount_value;
        }
        finalPrice = Math.max(parseFloat(finalPrice.toFixed(2)), 0.01);
      }
    }
  }

  const userId = req.user?.id ?? null;

  // ── Pay with balance if user is authenticated and has enough funds ──
  if (userId && req.user) {
    const balResult = await query<{ balance: number }>(
      'SELECT balance FROM users WHERE id = $1',
      [userId]
    );
    const userBalance = parseFloat(String(balResult.rows[0]?.balance ?? 0));

    if (userBalance >= finalPrice) {
      const orderResult = await query<{ id: string }>(
        `INSERT INTO orders (user_id, service_id, link, quantity, price, original_price, coupon_id, status, email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing', $8)
         RETURNING id`,
        [userId, serviceId, link, qty, finalPrice, originalPrice, couponId, email]
      );
      const orderId = orderResult.rows[0].id;

      await query('UPDATE users SET balance = balance - $1 WHERE id = $2', [finalPrice, userId]);

      if (couponId) {
        await query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [couponId]).catch(() => {});
      }

      try {
        const providerResult = await sendOrderToProvider({
          providerId: service.provider_id,
          serviceId: service.provider_service_id,
          link,
          quantity: qty,
        });
        await query(
          `UPDATE orders SET provider_order_id = $1, updated_at = NOW() WHERE id = $2`,
          [String(providerResult.orderId), orderId]
        );
      } catch (provErr) {
        logger.error('Provider error on balance checkout', { orderId, error: provErr });
        await query(`UPDATE orders SET status = 'failed', notes = $1 WHERE id = $2`, [String(provErr), orderId]);
      }

      sendOrderConfirmation(email, req.user.name, orderId, service.name, qty, finalPrice).catch(() => {});

      logger.info('Order paid with balance', { orderId, userId, amount: finalPrice });
      res.status(201).json({
        success: true,
        orderId,
        paidWithBalance: true,
        price: finalPrice,
        originalPrice,
      });
      return;
    }
  }

  // ── Normal MercadoPago flow ──
  const orderResult = await query<{ id: string }>(
    `INSERT INTO orders (user_id, service_id, link, quantity, price, original_price, coupon_id, status, email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'awaiting_payment', $8)
     RETURNING id`,
    [userId, serviceId, link, qty, finalPrice, originalPrice, couponId, email]
  );

  const orderId = orderResult.rows[0].id;
  const userName = req.user?.name ?? email.split('@')[0];

  const preference = await createPaymentPreference({
    orderId,
    title: `${service.name} x${qty.toLocaleString()}`,
    quantity: 1,
    unitPrice: finalPrice,
    payerEmail: email,
    payerName: userName,
  });

  await query(
    `INSERT INTO payments (order_id, user_id, amount, preference_id, status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [orderId, userId, finalPrice, preference.id]
  );

  if (couponId) {
    await query(
      'UPDATE coupons SET used_count = used_count + 1 WHERE id = $1',
      [couponId]
    ).catch(() => {});
  }

  logger.info('Checkout created', { orderId, amount: finalPrice });
  res.status(201).json({
    success: true,
    orderId,
    preferenceId: preference.id,
    initPoint: preference.initPoint,
    sandboxInitPoint: preference.sandboxInitPoint,
    price: finalPrice,
    originalPrice,
  });
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const { type, data } = req.body;
  logger.info('MercadoPago webhook received', { type, dataId: data?.id });

  res.status(200).json({ received: true });

  if (type !== 'payment' || !data?.id) return;

  try {
    const mpPayment = await getPaymentDetails(String(data.id));
    const externalRef = mpPayment.external_reference;
    const mpStatus = mpPayment.status;

    if (!externalRef) return;

    // ── Handle deposit top-ups ──
    if (externalRef.startsWith('deposit_')) {
      const depositId = externalRef.replace('deposit_', '');
      if (mpStatus === 'approved') {
        const depResult = await query<{ user_id: string; amount: number; status: string }>(
          'SELECT user_id, amount, status FROM deposits WHERE id = $1',
          [depositId]
        );
        if (depResult.rows.length && depResult.rows[0].status === 'pending') {
          const dep = depResult.rows[0];
          await query(
            `UPDATE deposits SET status = 'approved', external_id = $1, updated_at = NOW() WHERE id = $2`,
            [String(data.id), depositId]
          );
          await query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2',
            [dep.amount, dep.user_id]
          );
          logger.info('Deposit approved, balance credited', { depositId, amount: dep.amount });
        }
      } else if (['rejected', 'cancelled'].includes(mpStatus ?? '')) {
        await query(
          `UPDATE deposits SET status = 'rejected', external_id = $1, updated_at = NOW() WHERE id = $2`,
          [String(data.id), depositId]
        );
      }
      return;
    }

    const orderId = externalRef;
    if (!orderId) return;

    if (mpStatus === 'approved') {
      const orderResult = await query<{
        id: string;
        service_id: string;
        link: string;
        quantity: number;
        price: number;
        email: string;
        status: string;
        provider_id: string;
        provider_service_id: number;
        user_id: string;
        user_name: string;
        service_name: string;
      }>(
        `SELECT o.id, o.service_id, o.link, o.quantity, o.price, o.email, o.status, o.user_id,
                s.provider_id, s.provider_service_id, s.name AS service_name,
                u.name AS user_name
         FROM orders o
         LEFT JOIN services s ON o.service_id = s.id
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = $1`,
        [orderId]
      );

      if (!orderResult.rows.length || orderResult.rows[0].status !== 'awaiting_payment') return;

      const order = orderResult.rows[0];

      await query(
        `UPDATE payments SET external_id = $1, status = 'approved', updated_at = NOW()
         WHERE order_id = $2`,
        [String(data.id), orderId]
      );

      try {
        const providerResult = await sendOrderToProvider({
          providerId: order.provider_id,
          serviceId: order.provider_service_id,
          link: order.link,
          quantity: order.quantity,
        });

        await query(
          `UPDATE orders SET status = 'processing', provider_order_id = $1, updated_at = NOW()
           WHERE id = $2`,
          [String(providerResult.orderId), orderId]
        );

        sendOrderConfirmation(
          order.email,
          order.user_name ?? 'Customer',
          orderId,
          order.service_name,
          order.quantity,
          order.price
        ).catch(() => {});

        if (order.user_id) {
          const referral = await query(
            `SELECT r.id, r.referrer_id, r.reward_amount
             FROM referrals r
             WHERE r.referred_id = $1 AND r.status = 'pending'`,
            [order.user_id]
          );
          if (referral.rows.length) {
            const ref = referral.rows[0] as { id: string; referrer_id: string; reward_amount: number };
            await query(
              'UPDATE users SET balance = balance + $1 WHERE id = $2',
              [ref.reward_amount, ref.referrer_id]
            );
            await query('UPDATE referrals SET status = $1 WHERE id = $2', ['paid', ref.id]);
          }
        }

        logger.info('Order sent to provider after payment', { orderId });
      } catch (providerErr) {
        logger.error('Failed to send order to provider', { orderId, error: providerErr });
        await query(
          `UPDATE orders SET status = 'failed', notes = $1, updated_at = NOW() WHERE id = $2`,
          [`Provider error: ${String(providerErr)}`, orderId]
        );
      }
    } else if (['rejected', 'cancelled'].includes(mpStatus ?? '')) {
      await query(
        `UPDATE orders SET status = 'failed', updated_at = NOW() WHERE id = $1 AND status = 'awaiting_payment'`,
        [orderId]
      );
      await query(
        `UPDATE payments SET external_id = $1, status = $2, updated_at = NOW() WHERE order_id = $3`,
        [String(data.id), mpStatus, orderId]
      );
    }
  } catch (err) {
    logger.error('Webhook processing error', { error: err });
  }
};

export const verifyDeposit = async (req: AuthRequest, res: Response): Promise<void> => {
  const { paymentId } = req.body;
  const userId = req.user!.id;

  if (!paymentId) {
    res.status(400).json({ success: false, message: 'paymentId is required' });
    return;
  }

  try {
    const mpPayment = await getPaymentDetails(String(paymentId));
    const externalRef = mpPayment.external_reference;
    const mpStatus = mpPayment.status;

    if (!externalRef?.startsWith('deposit_') || mpStatus !== 'approved') {
      res.status(400).json({ success: false, message: 'Payment not approved or not a deposit' });
      return;
    }

    const depositId = externalRef.replace('deposit_', '');
    const depResult = await query<{ user_id: string; amount: number; status: string }>(
      'SELECT user_id, amount, status FROM deposits WHERE id = $1',
      [depositId]
    );

    if (!depResult.rows.length) {
      res.status(404).json({ success: false, message: 'Deposit not found' });
      return;
    }

    const dep = depResult.rows[0];

    if (dep.user_id !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    if (dep.status !== 'pending') {
      res.json({ success: true, alreadyProcessed: true, amount: dep.amount });
      return;
    }

    await query(
      `UPDATE deposits SET status = 'approved', external_id = $1, updated_at = NOW() WHERE id = $2`,
      [String(paymentId), depositId]
    );
    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [dep.amount, dep.user_id]);

    logger.info('Deposit verified and credited via fallback', { depositId, amount: dep.amount, userId });
    res.json({ success: true, amount: dep.amount });
  } catch (err) {
    logger.error('Error verifying deposit', { error: err });
    res.status(500).json({ success: false, message: 'Error verifying payment' });
  }
};

export const getPaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { orderId } = req.params;
  const result = await query(
    'SELECT status, external_id, amount, created_at FROM payments WHERE order_id = $1',
    [orderId]
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: 'Payment not found' });
    return;
  }

  res.json({ success: true, payment: result.rows[0] });
};

import { Request, Response } from "express";
import { query, getClient } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import {
  createPaymentPreference,
  getPaymentDetails,
} from "../services/paymentService";
import { sendOrderToProvider } from "../services/providerService";
import {
  sendOrderConfirmation,
  sendAdminProviderFailAlert,
} from "../services/emailService";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import {
  applyResellerDiscount,
  getResellerPricingProfile,
} from "../services/resellerService";

interface ServiceRow {
  id: string;
  name: string;
  price_per_unit: number;
  min_quantity: number;
  max_quantity: number;
  provider_id: string;
  provider_service_id: number;
  platform: string;
  category: string;
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

export const createDeposit = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const userId = req.user!.id;
  const { amount } = req.body;
  const parsedAmount = parseFloat(String(amount));
  if (!parsedAmount || parsedAmount < 100) {
    res
      .status(400)
      .json({ success: false, message: "El monto mínimo es $100 ARS" });
    return;
  }

  try {
    const depositResult = await query<{ id: string }>(
      `INSERT INTO deposits (user_id, amount, status) VALUES ($1, $2, 'pending') RETURNING id`,
      [userId, parsedAmount],
    );
    const depositId = depositResult.rows[0].id;

    const pref = await createPaymentPreference({
      orderId: `deposit_${depositId}`,
      title: "Recarga de saldo — FollowArg",
      quantity: 1,
      unitPrice: parsedAmount,
      payerEmail: req.user!.email,
      payerName: req.user!.name,
    });

    await query(`UPDATE deposits SET preference_id = $1 WHERE id = $2`, [
      pref.id,
      depositId,
    ]);

    logger.info("Deposit created", { depositId, amount: parsedAmount });
    res.status(201).json({
      success: true,
      depositId,
      preferenceId: pref.id,
      initPoint: pref.initPoint,
      sandboxInitPoint: pref.sandboxInitPoint,
    });
  } catch (err: unknown) {
    const mpError = err as {
      message?: string;
      cause?: unknown;
      status?: number;
    };
    logger.error("Error creating deposit", {
      message: mpError?.message,
      cause: JSON.stringify(mpError?.cause ?? err),
      status: mpError?.status,
    });
    res.status(500).json({
      success: false,
      message: "Error al procesar el pago con MercadoPago",
    });
  }
};

export const getMyDeposits = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const userId = req.user!.id;
  const result = await query(
    `SELECT id, amount, status, created_at FROM deposits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
    [userId],
  );
  res.json({ success: true, deposits: result.rows });
};

export const createCheckout = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { serviceId, quantity, link, email, couponCode } = req.body;

  if (!serviceId || !quantity || !link || !email) {
    res.status(400).json({
      success: false,
      message: "serviceId, quantity, link and email are required",
    });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ success: false, message: "Invalid email address" });
    return;
  }

  const serviceResult = await query<ServiceRow>(
    "SELECT id, name, price_per_unit, min_quantity, max_quantity, provider_id, provider_service_id, platform, category FROM services WHERE id = $1 AND is_active = true",
    [serviceId],
  );

  if (!serviceResult.rows.length) {
    res
      .status(404)
      .json({ success: false, message: "Service not found or inactive" });
    return;
  }

  const service = serviceResult.rows[0];
  const qty = parseInt(String(quantity), 10);

  const normalizeLink = (
    rawLink: string,
    platform: string,
    category: string,
  ): string => {
    const trimmed = rawLink.trim();
    if (category === "followers") {
      const username = trimmed
        .replace(/^@/, "")
        .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
        .replace(/\/$/, "");
      if (platform === "instagram")
        return `https://www.instagram.com/${username}/`;
      if (platform === "tiktok") return `https://www.tiktok.com/@${username}`;
      if (platform === "youtube")
        return trimmed.startsWith("http")
          ? trimmed
          : `https://www.youtube.com/@${username}`;
    }
    return trimmed;
  };
  const normalizedLink = normalizeLink(
    link.trim(),
    service.platform,
    service.category,
  );

  if (qty < service.min_quantity || qty > service.max_quantity) {
    res.status(400).json({
      success: false,
      message: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}`,
    });
    return;
  }

  const publicPrice = parseFloat((service.price_per_unit * qty).toFixed(2));
  let originalPrice = publicPrice;
  let finalPrice = originalPrice;
  let couponId: string | null = null;
  const userId = req.user?.id ?? null;

  if (couponCode) {
    const couponResult = await query<CouponRow>(
      `SELECT id, discount_type, discount_value, min_order_value, max_uses, used_count, expires_at
       FROM coupons
       WHERE UPPER(code) = UPPER($1) AND is_active = true`,
      [couponCode],
    );

    if (couponResult.rows.length) {
      const coupon = couponResult.rows[0];
      const isExpired =
        coupon.expires_at && new Date(coupon.expires_at) < new Date();
      const isMaxed =
        coupon.max_uses !== null && coupon.used_count >= coupon.max_uses;
      const meetsMinValue = originalPrice >= coupon.min_order_value;

      if (!isExpired && !isMaxed && meetsMinValue) {
        couponId = coupon.id;
        if (coupon.discount_type === "percentage") {
          finalPrice = originalPrice * (1 - coupon.discount_value / 100);
        } else {
          finalPrice = originalPrice - coupon.discount_value;
        }
        finalPrice = Math.max(parseFloat(finalPrice.toFixed(2)), 0.01);
      }
    }
  }

  const resellerProfile = await getResellerPricingProfile(userId);
  const resellerPricing = applyResellerDiscount(finalPrice, resellerProfile);
  finalPrice = resellerPricing.price;

  // ── Balance-only checkout ──
  if (!userId || !req.user) {
    res.status(401).json({
      success: false,
      message: "Debés iniciar sesión para hacer un pedido",
    });
    return;
  }

  const balResult = await query<{ balance: number }>(
    "SELECT balance FROM users WHERE id = $1",
    [userId],
  );
  const userBalance = parseFloat(String(balResult.rows[0]?.balance ?? 0));

  if (userBalance < finalPrice) {
    res.status(402).json({
      success: false,
      insufficientBalance: true,
      message: "Saldo insuficiente",
      required: finalPrice,
      current: userBalance,
    });
    return;
  }

  // Wrap balance deduction, order creation, coupon count update, and cashback credit
  // in a single SQL transaction to guarantee absolute data integrity.
  const client = await getClient();
  let orderId: string;
  const cashbackAmount = parseFloat(
    (finalPrice * (env.CASHBACK_PERCENT / 100)).toFixed(2),
  );

  try {
    await client.query("BEGIN");

    // Atomically deduct balance, guarded by balance >= finalPrice
    const deductResult = await client.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING id",
      [finalPrice, userId],
    );
    if (!deductResult.rowCount) {
      await client.query("ROLLBACK");
      res.status(402).json({
        success: false,
        insufficientBalance: true,
        message: "Saldo insuficiente",
        required: finalPrice,
        current: userBalance,
      });
      return;
    }

    const orderResult = await client.query<{ id: string }>(
      `INSERT INTO orders (user_id, service_id, link, quantity, price, original_price, coupon_id, status, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing', $8)
       RETURNING id`,
      [
        userId,
        serviceId,
        normalizedLink,
        qty,
        finalPrice,
        originalPrice,
        couponId,
        email,
      ],
    );
    orderId = orderResult.rows[0].id;

    // Increment coupon used count (inside transaction)
    if (couponId) {
      await client.query(
        "UPDATE coupons SET used_count = used_count + 1 WHERE id = $1",
        [couponId],
      );
    }

    // Credit cashback to user balance (inside transaction)
    if (cashbackAmount > 0) {
      await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [
        cashbackAmount,
        userId,
      ]);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Provider API call happens OUTSIDE the transaction — it cannot be rolled back.
  try {
    const providerResult = await sendOrderToProvider({
      providerId: service.provider_id,
      serviceId: service.provider_service_id,
      link: normalizedLink,
      quantity: qty,
    });
    await query(
      `UPDATE orders SET provider_order_id = $1, updated_at = NOW() WHERE id = $2`,
      [String(providerResult.orderId), orderId],
    );
  } catch (provErr) {
    logger.error("Provider error on balance checkout", {
      orderId,
      error: provErr,
    });
    await query(
      `UPDATE orders SET status = 'pending', notes = $1 WHERE id = $2`,
      [String(provErr), orderId],
    );
    sendAdminProviderFailAlert(
      orderId,
      service.name,
      qty,
      normalizedLink,
      String(provErr),
    ).catch(() => {});
  }

  sendOrderConfirmation(
    email,
    req.user.name,
    orderId,
    service.name,
    qty,
    finalPrice,
  ).catch(() => {});

  // Check referral milestone after successful order
  checkReferralMilestone(userId).catch((err) =>
    logger.warn("Referral milestone check failed", {
      userId,
      error: String(err),
    }),
  );

  logger.info("Order paid with balance", {
    orderId,
    userId,
    amount: finalPrice,
    cashback: cashbackAmount,
  });
  res.status(201).json({
    success: true,
    orderId,
    paidWithBalance: true,
    price: finalPrice,
    originalPrice,
    publicPrice,
    reseller:
      resellerProfile?.enabled
        ? {
            active: resellerProfile.active,
            discountPercent: resellerProfile.discountPercent,
            discountAmount: resellerPricing.discountAmount,
            minDeposit: resellerProfile.minDeposit,
            approvedDeposits: resellerProfile.approvedDeposits,
            remainingToActivate: resellerProfile.remainingToActivate,
          }
        : null,
    cashback:
      cashbackAmount > 0
        ? { amount: cashbackAmount, percent: env.CASHBACK_PERCENT }
        : null,
  });
};

/**
 * Check if a user (the referred) has spent enough to unlock the referral reward.
 * Called after every successful order.
 */
const checkReferralMilestone = async (userId: string): Promise<void> => {
  // Find pending referral where this user is the referred
  const refResult = await query<{
    id: string;
    referrer_id: string;
    reward_amount: number;
  }>(
    `SELECT id, referrer_id, reward_amount FROM referrals WHERE referred_id = $1 AND status = 'pending'`,
    [userId],
  );
  if (!refResult.rows.length) return;

  const ref = refResult.rows[0];

  // Calculate total spent by referred user (only completed/processing orders)
  const spentResult = await query<{ total: string }>(
    `SELECT COALESCE(SUM(price), 0) AS total FROM orders
     WHERE user_id = $1 AND status IN ('completed', 'processing', 'in_progress', 'partial')`,
    [userId],
  );
  const totalSpent = parseFloat(spentResult.rows[0].total);

  // Update tracking column
  await query(`UPDATE referrals SET referred_total_spent = $1 WHERE id = $2`, [
    totalSpent,
    ref.id,
  ]);

  // Check if threshold met
  if (totalSpent < env.REFERRAL_SPEND_THRESHOLD) return;

  // Check if referrer is an active user (anti-abuse: must have spent money themselves)
  const referrerSpent = await query<{ total: string }>(
    `SELECT COALESCE(SUM(price), 0) AS total FROM orders
     WHERE user_id = $1 AND status IN ('completed', 'processing', 'in_progress', 'partial')`,
    [ref.referrer_id],
  );
  const referrerTotal = parseFloat(referrerSpent.rows[0].total);

  if (referrerTotal < env.REFERRAL_MIN_REFERRER_SPENT) {
    logger.info("Referral milestone met but referrer has not spent enough", {
      referralId: ref.id,
      referrerSpent: referrerTotal,
      required: env.REFERRAL_MIN_REFERRER_SPENT,
    });
    return;
  }

  // Pay the reward
  await query("UPDATE users SET balance = balance + $1 WHERE id = $2", [
    ref.reward_amount,
    ref.referrer_id,
  ]);
  await query(
    `UPDATE referrals SET status = 'qualified', paid_at = NOW() WHERE id = $1`,
    [ref.id],
  );

  logger.info("Referral reward paid!", {
    referralId: ref.id,
    referrerId: ref.referrer_id,
    referredId: userId,
    amount: ref.reward_amount,
    referredSpent: totalSpent,
  });
};

export const handleWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { type, data } = req.body;
  logger.info("MercadoPago webhook received", { type, dataId: data?.id });

  res.status(200).json({ received: true });

  if (type !== "payment" || !data?.id) return;

  try {
    const mpPayment = await getPaymentDetails(String(data.id));
    const externalRef = mpPayment.external_reference;
    const mpStatus = mpPayment.status;

    if (!externalRef) return;

    // ── Handle deposit top-ups ──
    if (externalRef.startsWith("deposit_")) {
      const depositId = externalRef.replace("deposit_", "");
      if (mpStatus === "approved") {
        const depResult = await query<{
          user_id: string;
          amount: number;
          status: string;
        }>("SELECT user_id, amount, status FROM deposits WHERE id = $1", [
          depositId,
        ]);
        if (depResult.rows.length && depResult.rows[0].status === "pending") {
          const dep = depResult.rows[0];
          await query(
            `UPDATE deposits SET status = 'approved', external_id = $1, updated_at = NOW() WHERE id = $2`,
            [String(data.id), depositId],
          );
          await query("UPDATE users SET balance = balance + $1 WHERE id = $2", [
            dep.amount,
            dep.user_id,
          ]);
          logger.info("Deposit approved, balance credited", {
            depositId,
            amount: dep.amount,
          });
        }
      } else if (["rejected", "cancelled"].includes(mpStatus ?? "")) {
        await query(
          `UPDATE deposits SET status = 'rejected', external_id = $1, updated_at = NOW() WHERE id = $2`,
          [String(data.id), depositId],
        );
      }
      return;
    }

    const orderId = externalRef;
    if (!orderId) return;

    if (mpStatus === "approved") {
      const paymentMetaResult = await query<{ metadata: any }>(
        "SELECT metadata FROM payments WHERE order_id = $1",
        [orderId],
      );
      const metadata = paymentMetaResult.rows[0]?.metadata ?? null;
      const bundleOrderIds = Array.isArray(metadata?.orderIds)
        ? metadata.orderIds.map(String).filter(Boolean)
        : [];

      if (bundleOrderIds.length > 1) {
        const bundleOrders = await query<{
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
          promotion_id: string | null;
        }>(
          `SELECT o.id, o.service_id, o.link, o.quantity, o.price, o.email, o.status, o.user_id, o.promotion_id,
                  s.provider_id, s.provider_service_id, s.name AS service_name,
                  u.name AS user_name
           FROM orders o
           LEFT JOIN services s ON o.service_id = s.id
           LEFT JOIN users u ON o.user_id = u.id
           WHERE o.id = ANY($1::uuid[]) AND o.status = 'awaiting_payment'`,
          [bundleOrderIds],
        );

        await query(
          `UPDATE payments SET external_id = $1, status = 'approved', updated_at = NOW()
           WHERE order_id = $2`,
          [String(data.id), orderId],
        );

        let promotionCounted = false;
        for (const order of bundleOrders.rows) {
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
              [String(providerResult.orderId), order.id],
            );

            if (order.promotion_id && !promotionCounted) {
              await query(
                `UPDATE promotions
                 SET used_count = used_count + 1, updated_at = NOW()
                 WHERE id = $1`,
                [order.promotion_id],
              );
              promotionCounted = true;
            }

            sendOrderConfirmation(
              order.email,
              order.user_name ?? "Customer",
              order.id,
              order.service_name,
              order.quantity,
              order.price,
            ).catch(() => {});
          } catch (providerErr) {
            logger.error("Failed to send bundled promo order to provider", {
              orderId: order.id,
              error: providerErr,
            });
            await query(
              `UPDATE orders SET status = 'pending', notes = $1, updated_at = NOW() WHERE id = $2`,
              [`Provider error: ${String(providerErr)}`, order.id],
            );
            sendAdminProviderFailAlert(
              order.id,
              order.service_name,
              order.quantity,
              order.link,
              String(providerErr),
            ).catch(() => {});
          }
        }

        logger.info("Bundled promo payment processed", { orderIds: bundleOrderIds });
        return;
      }

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
        promotion_id: string | null;
      }>(
        `SELECT o.id, o.service_id, o.link, o.quantity, o.price, o.email, o.status, o.user_id, o.promotion_id,
                s.provider_id, s.provider_service_id, s.name AS service_name,
                u.name AS user_name
         FROM orders o
         LEFT JOIN services s ON o.service_id = s.id
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = $1`,
        [orderId],
      );

      if (
        !orderResult.rows.length ||
        orderResult.rows[0].status !== "awaiting_payment"
      )
        return;

      const order = orderResult.rows[0];

      await query(
        `UPDATE payments SET external_id = $1, status = 'approved', updated_at = NOW()
         WHERE order_id = $2`,
        [String(data.id), orderId],
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
          [String(providerResult.orderId), orderId],
        );

        if (order.promotion_id) {
          await query(
            `UPDATE promotions
             SET used_count = used_count + 1, updated_at = NOW()
             WHERE id = $1`,
            [order.promotion_id],
          );
        }

        sendOrderConfirmation(
          order.email,
          order.user_name ?? "Customer",
          orderId,
          order.service_name,
          order.quantity,
          order.price,
        ).catch(() => {});

        if (order.user_id) {
          checkReferralMilestone(order.user_id).catch((err: unknown) =>
            logger.warn("Referral milestone check failed (webhook)", {
              userId: order.user_id,
              error: String(err),
            }),
          );
        }

        logger.info("Order sent to provider after payment", { orderId });
      } catch (providerErr) {
        logger.error("Failed to send order to provider", {
          orderId,
          error: providerErr,
        });
        await query(
          `UPDATE orders SET status = 'pending', notes = $1, updated_at = NOW() WHERE id = $2`,
          [`Provider error: ${String(providerErr)}`, orderId],
        );
        sendAdminProviderFailAlert(
          orderId,
          order.service_name,
          order.quantity,
          order.link,
          String(providerErr),
        ).catch(() => {});
      }
    } else if (["rejected", "cancelled"].includes(mpStatus ?? "")) {
      const paymentMetaResult = await query<{ metadata: any }>(
        "SELECT metadata FROM payments WHERE order_id = $1",
        [orderId],
      );
      const metadata = paymentMetaResult.rows[0]?.metadata ?? null;
      const bundleOrderIds = Array.isArray(metadata?.orderIds)
        ? metadata.orderIds.map(String).filter(Boolean)
        : [];

      if (bundleOrderIds.length > 1) {
        await query(
          `UPDATE orders SET status = 'failed', updated_at = NOW()
           WHERE id = ANY($1::uuid[]) AND status = 'awaiting_payment'`,
          [bundleOrderIds],
        );
      } else {
        await query(
          `UPDATE orders SET status = 'failed', updated_at = NOW() WHERE id = $1 AND status = 'awaiting_payment'`,
          [orderId],
        );
      }

      await query(
        `UPDATE payments SET external_id = $1, status = $2, updated_at = NOW() WHERE order_id = $3`,
        [String(data.id), mpStatus, orderId],
      );
    }
  } catch (err) {
    logger.error("Webhook processing error", { error: err });
  }
};

export const verifyDeposit = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { paymentId } = req.body;
  const userId = req.user!.id;

  if (!paymentId) {
    res.status(400).json({ success: false, message: "paymentId is required" });
    return;
  }

  try {
    const mpPayment = await getPaymentDetails(String(paymentId));
    const externalRef = mpPayment.external_reference;
    const mpStatus = mpPayment.status;

    if (!externalRef?.startsWith("deposit_") || mpStatus !== "approved") {
      res.status(400).json({
        success: false,
        message: "Payment not approved or not a deposit",
      });
      return;
    }

    const depositId = externalRef.replace("deposit_", "");
    const depResult = await query<{
      user_id: string;
      amount: number;
      status: string;
    }>("SELECT user_id, amount, status FROM deposits WHERE id = $1", [
      depositId,
    ]);

    if (!depResult.rows.length) {
      res.status(404).json({ success: false, message: "Deposit not found" });
      return;
    }

    const dep = depResult.rows[0];

    if (dep.user_id !== userId) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    // Use SELECT FOR UPDATE inside a transaction to prevent double-credit race condition
    const client = await getClient();
    try {
      await client.query("BEGIN");
      const locked = await client.query<{
        amount: number;
        user_id: string;
        status: string;
      }>(
        `SELECT amount, user_id, status FROM deposits WHERE id = $1 FOR UPDATE`,
        [depositId],
      );
      if (!locked.rows.length || locked.rows[0].status !== "pending") {
        await client.query("ROLLBACK");
        res.json({ success: true, alreadyProcessed: true, amount: dep.amount });
        return;
      }
      await client.query(
        `UPDATE deposits SET status = 'approved', external_id = $1, updated_at = NOW() WHERE id = $2`,
        [String(paymentId), depositId],
      );
      await client.query(
        "UPDATE users SET balance = balance + $1 WHERE id = $2",
        [locked.rows[0].amount, locked.rows[0].user_id],
      );
      await client.query("COMMIT");
      logger.info("Deposit verified and credited via fallback", {
        depositId,
        amount: locked.rows[0].amount,
        userId,
      });
      res.json({ success: true, amount: locked.rows[0].amount });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error("Error verifying deposit", { error: err });
    res
      .status(500)
      .json({ success: false, message: "Error verifying payment" });
  }
};

export const getPaymentStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { orderId } = req.params;
  const result = await query(
    "SELECT status, external_id, amount, created_at FROM payments WHERE order_id = $1",
    [orderId],
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: "Payment not found" });
    return;
  }

  res.json({ success: true, payment: result.rows[0] });
};

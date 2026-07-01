import { Response } from "express";
import { query, getClient } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { createPaymentPreference } from "../services/paymentService";
import { sendOrderToProvider } from "../services/providerService";
import { sendAdminProviderFailAlert, sendOrderConfirmation } from "../services/emailService";
import { logger } from "../utils/logger";
import { env } from "../config/env";

interface PromotionCheckoutRow {
  id: string;
  title: string;
  quantity: number;
  promo_price: number;
  compare_at_price: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  service_id: string;
  service_name: string;
  platform: string;
  category: string;
  min_quantity: number;
  max_quantity: number;
  provider_id: string;
  provider_service_id: number;
  service_active: boolean;
}

const normalizeLink = (rawLink: string, platform: string, category: string): string => {
  const trimmed = rawLink.trim();
  if (category === "followers") {
    const username = trimmed
      .replace(/^@/, "")
      .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
      .replace(/\/$/, "");
    if (platform === "instagram") return `https://www.instagram.com/${username}/`;
    if (platform === "tiktok") return `https://www.tiktok.com/@${username}`;
    if (platform === "youtube") {
      return trimmed.startsWith("http") ? trimmed : `https://www.youtube.com/@${username}`;
    }
  }
  return trimmed;
};

const getPromotionForCheckout = async (promotionId: string) => {
  const result = await query<PromotionCheckoutRow>(
    `SELECT p.id, p.title, p.quantity, p.promo_price, p.compare_at_price,
            p.max_uses, p.used_count, p.starts_at, p.expires_at, p.is_active,
            s.id AS service_id, s.name AS service_name, s.platform, s.category,
            s.min_quantity, s.max_quantity, s.provider_id, s.provider_service_id,
            s.is_active AS service_active
     FROM promotions p
     JOIN services s ON s.id = p.service_id
     WHERE p.id = $1`,
    [promotionId],
  );
  return result.rows[0] ?? null;
};

const validatePromotion = (promo: PromotionCheckoutRow | null): string | null => {
  if (!promo) return "La promoción no está disponible";
  if (!promo.is_active || !promo.service_active) return "La promoción no está activa";
  const now = Date.now();
  if (promo.starts_at && new Date(promo.starts_at).getTime() > now) {
    return "La promoción todavía no está activa";
  }
  if (promo.expires_at && new Date(promo.expires_at).getTime() <= now) {
    return "La promoción ya finalizó";
  }
  if (promo.max_uses !== null && Number(promo.used_count) >= Number(promo.max_uses)) {
    return "La promoción agotó sus cupos";
  }
  const qty = Number(promo.quantity);
  if (qty < Number(promo.min_quantity) || qty > Number(promo.max_quantity)) {
    return "La cantidad de la promoción ya no es válida para este servicio";
  }
  if (!promo.provider_id || !promo.provider_service_id) {
    return "El servicio no está disponible para compra automática";
  }
  return null;
};

export const createPromoCheckout = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = req.user!;
  const { promotionId, link, email } = req.body;
  const paymentMethod = req.body.paymentMethod === "mercadopago" ? "mercadopago" : "balance";

  if (!promotionId || !link || !email) {
    res.status(400).json({
      success: false,
      message: "promotionId, link and email are required",
    });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email))) {
    res.status(400).json({ success: false, message: "Email inválido" });
    return;
  }

  const promo = await getPromotionForCheckout(String(promotionId));
  const validationError = validatePromotion(promo);
  if (validationError || !promo) {
    res.status(400).json({ success: false, message: validationError });
    return;
  }

  const quantity = Number(promo.quantity);
  const finalPrice = Number(promo.promo_price);
  const originalPrice = promo.compare_at_price
    ? Number(promo.compare_at_price)
    : finalPrice;
  const normalizedLink = normalizeLink(String(link), promo.platform, promo.category);

  if (paymentMethod === "balance") {
    const client = await getClient();
    let orderId = "";
    const cashbackAmount = parseFloat(
      (finalPrice * (env.CASHBACK_PERCENT / 100)).toFixed(2),
    );

    try {
      await client.query("BEGIN");

      const deductResult = await client.query(
        "UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING id",
        [finalPrice, user.id],
      );
      if (!deductResult.rowCount) {
        await client.query("ROLLBACK");
        res.status(402).json({
          success: false,
          insufficientBalance: true,
          message: "Saldo insuficiente",
          required: finalPrice,
        });
        return;
      }

      const useResult = await client.query(
        `UPDATE promotions
         SET used_count = used_count + 1, updated_at = NOW()
         WHERE id = $1 AND (max_uses IS NULL OR used_count < max_uses)
         RETURNING id`,
        [promo.id],
      );
      if (!useResult.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ success: false, message: "La promoción agotó sus cupos" });
        return;
      }

      const orderResult = await client.query<{ id: string }>(
        `INSERT INTO orders
         (user_id, service_id, promotion_id, link, quantity, price, original_price, status, email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing', $8)
         RETURNING id`,
        [
          user.id,
          promo.service_id,
          promo.id,
          normalizedLink,
          quantity,
          finalPrice,
          originalPrice,
          email,
        ],
      );
      orderId = orderResult.rows[0].id;

      if (cashbackAmount > 0) {
        await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [
          cashbackAmount,
          user.id,
        ]);
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    try {
      const providerResult = await sendOrderToProvider({
        providerId: promo.provider_id,
        serviceId: promo.provider_service_id,
        link: normalizedLink,
        quantity,
      });
      await query(
        "UPDATE orders SET provider_order_id = $1, updated_at = NOW() WHERE id = $2",
        [String(providerResult.orderId), orderId],
      );
    } catch (providerErr) {
      logger.error("Provider error on promo balance checkout", { orderId, error: providerErr });
      await query(
        "UPDATE orders SET status = 'pending', notes = $1, updated_at = NOW() WHERE id = $2",
        [String(providerErr), orderId],
      );
      sendAdminProviderFailAlert(
        orderId,
        promo.service_name,
        quantity,
        normalizedLink,
        String(providerErr),
      ).catch(() => {});
    }

    sendOrderConfirmation(
      String(email),
      user.name,
      orderId,
      promo.title,
      quantity,
      finalPrice,
    ).catch(() => {});

    res.status(201).json({
      success: true,
      paidWithBalance: true,
      orderId,
      price: finalPrice,
      originalPrice,
    });
    return;
  }

  const orderResult = await query<{ id: string }>(
    `INSERT INTO orders
     (user_id, service_id, promotion_id, link, quantity, price, original_price, status, email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'awaiting_payment', $8)
     RETURNING id`,
    [
      user.id,
      promo.service_id,
      promo.id,
      normalizedLink,
      quantity,
      finalPrice,
      originalPrice,
      email,
    ],
  );
  const orderId = orderResult.rows[0].id;

  try {
    const pref = await createPaymentPreference({
      orderId,
      title: promo.title,
      quantity: 1,
      unitPrice: finalPrice,
      payerEmail: user.email,
      payerName: user.name,
    });

    await query(
      `INSERT INTO payments
       (order_id, user_id, amount, currency, payment_method, payment_provider, preference_id, status, metadata)
       VALUES ($1, $2, $3, 'ARS', 'mercadopago', 'mercadopago', $4, 'pending', $5)`,
      [orderId, user.id, finalPrice, pref.id, JSON.stringify({ promotionId: promo.id })],
    );

    res.status(201).json({
      success: true,
      orderId,
      preferenceId: pref.id,
      initPoint: pref.initPoint,
      sandboxInitPoint: pref.sandboxInitPoint,
      price: finalPrice,
      originalPrice,
    });
  } catch (err) {
    await query("UPDATE orders SET status = 'failed', updated_at = NOW() WHERE id = $1", [orderId]);
    logger.error("Error creating promo MercadoPago checkout", { orderId, error: err });
    res.status(500).json({
      success: false,
      message: "Error al procesar el pago con MercadoPago",
    });
  }
};

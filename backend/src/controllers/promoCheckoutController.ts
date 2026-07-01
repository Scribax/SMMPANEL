import { Response } from "express";
import { getClient, query } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { createPaymentPreference } from "../services/paymentService";
import { sendOrderToProvider } from "../services/providerService";
import { sendAdminProviderFailAlert, sendOrderConfirmation } from "../services/emailService";
import { logger } from "../utils/logger";
import { env } from "../config/env";

interface PromotionCheckoutItem {
  id: string;
  service_id: string;
  quantity: number;
  sort_order: number;
  service_name: string;
  price_per_unit: number;
  platform: string;
  category: string;
  min_quantity: number;
  max_quantity: number;
  provider_id: string;
  provider_service_id: number;
  service_active: boolean;
}

interface PromotionCheckoutRow {
  id: string;
  title: string;
  promo_price: number;
  compare_at_price: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  items: PromotionCheckoutItem[];
}

interface TargetPayload {
  promotionItemId: string;
  link: string;
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

const normalizeItems = (items: unknown): PromotionCheckoutItem[] => {
  const parsed = Array.isArray(items) ? items : [];
  return parsed.map((item: any) => ({
    ...item,
    quantity: Number(item.quantity),
    sort_order: Number(item.sort_order ?? 0),
    price_per_unit: Number(item.price_per_unit),
    min_quantity: Number(item.min_quantity),
    max_quantity: Number(item.max_quantity),
    service_active: item.service_active !== false,
  }));
};

const getPromotionForCheckout = async (promotionId: string) => {
  const result = await query<any>(
    `SELECT p.id, p.title, p.promo_price, p.compare_at_price,
            p.max_uses, p.used_count, p.starts_at, p.expires_at, p.is_active,
            COALESCE(items.items, '[]'::json) AS items
     FROM promotions p
     LEFT JOIN LATERAL (
       SELECT json_agg(
         json_build_object(
           'id', pi.id,
           'service_id', pi.service_id,
           'quantity', pi.quantity,
           'sort_order', pi.sort_order,
           'service_name', s.name,
           'price_per_unit', s.price_per_unit,
           'platform', s.platform,
           'category', s.category,
           'min_quantity', s.min_quantity,
           'max_quantity', s.max_quantity,
           'provider_id', s.provider_id,
           'provider_service_id', s.provider_service_id,
           'service_active', s.is_active
         ) ORDER BY pi.sort_order ASC, pi.created_at ASC
       ) AS items
       FROM promotion_items pi
       JOIN services s ON s.id = pi.service_id
       WHERE pi.promotion_id = p.id
     ) items ON true
     WHERE p.id = $1`,
    [promotionId],
  );

  const row = result.rows[0];
  if (!row) return null;
  return {
    ...row,
    promo_price: Number(row.promo_price),
    compare_at_price: row.compare_at_price === null ? null : Number(row.compare_at_price),
    max_uses: row.max_uses === null ? null : Number(row.max_uses),
    used_count: Number(row.used_count),
    items: normalizeItems(row.items),
  } as PromotionCheckoutRow;
};

const validatePromotion = (promo: PromotionCheckoutRow | null): string | null => {
  if (!promo) return "La promoción no está disponible";
  if (!promo.is_active) return "La promoción no está activa";
  const now = Date.now();
  if (promo.starts_at && new Date(promo.starts_at).getTime() > now) {
    return "La promoción todavía no está activa";
  }
  if (promo.expires_at && new Date(promo.expires_at).getTime() <= now) {
    return "La promoción ya finalizó";
  }
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return "La promoción agotó sus cupos";
  }
  if (!promo.items.length) return "La promoción no tiene servicios configurados";

  for (const item of promo.items) {
    if (!item.service_active) return "Uno de los servicios de la promoción no está activo";
    if (item.quantity < item.min_quantity || item.quantity > item.max_quantity) {
      return "Una cantidad de la promoción ya no es válida para su servicio";
    }
    if (!item.provider_id || !item.provider_service_id) {
      return "Uno de los servicios no está disponible para compra automática";
    }
  }
  return null;
};

const getTargetsByItemId = (promo: PromotionCheckoutRow, body: any) => {
  const rawTargets = Array.isArray(body.targets) ? body.targets : [];
  const map = new Map<string, string>();

  for (const target of rawTargets as TargetPayload[]) {
    if (target?.promotionItemId && target?.link) {
      map.set(String(target.promotionItemId), String(target.link));
    }
  }

  if (!map.size && body.link && promo.items.length === 1) {
    map.set(promo.items[0].id, String(body.link));
  }

  return map;
};

const splitPrice = (promo: PromotionCheckoutRow) => {
  const publicPrices = promo.items.map((item) =>
    parseFloat((item.price_per_unit * item.quantity).toFixed(2)),
  );
  const totalPublic = publicPrices.reduce((sum, price) => sum + price, 0) || promo.items.length;
  let assigned = 0;

  return promo.items.map((item, index) => {
    const isLast = index === promo.items.length - 1;
    const price = isLast
      ? parseFloat((promo.promo_price - assigned).toFixed(2))
      : parseFloat(((promo.promo_price * publicPrices[index]) / totalPublic).toFixed(2));
    assigned += price;
    return {
      item,
      price: Math.max(price, 0.01),
      originalPrice: publicPrices[index] || price,
    };
  });
};

const sendOrdersToProvider = async (
  orderRows: Array<{
    orderId: string;
    item: PromotionCheckoutItem;
    link: string;
    email: string;
    price: number;
    title: string;
    userName: string;
  }>,
) => {
  for (const row of orderRows) {
    try {
      const providerResult = await sendOrderToProvider({
        providerId: row.item.provider_id,
        serviceId: row.item.provider_service_id,
        link: row.link,
        quantity: row.item.quantity,
      });
      await query(
        "UPDATE orders SET provider_order_id = $1, updated_at = NOW() WHERE id = $2",
        [String(providerResult.orderId), row.orderId],
      );
      sendOrderConfirmation(
        row.email,
        row.userName,
        row.orderId,
        row.item.service_name || row.title,
        row.item.quantity,
        row.price,
      ).catch(() => {});
    } catch (providerErr) {
      logger.error("Provider error on promo checkout item", {
        orderId: row.orderId,
        error: providerErr,
      });
      await query(
        "UPDATE orders SET status = 'pending', notes = $1, updated_at = NOW() WHERE id = $2",
        [String(providerErr), row.orderId],
      );
      sendAdminProviderFailAlert(
        row.orderId,
        row.item.service_name,
        row.item.quantity,
        row.link,
        String(providerErr),
      ).catch(() => {});
    }
  }
};

export const createPromoCheckout = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = req.user!;
  const { promotionId, email } = req.body;
  const paymentMethod = req.body.paymentMethod === "mercadopago" ? "mercadopago" : "balance";

  if (!promotionId || !email) {
    res.status(400).json({
      success: false,
      message: "promotionId and email are required",
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

  const targetsByItemId = getTargetsByItemId(promo, req.body);
  const orderSplits = splitPrice(promo);
  const normalizedTargets = new Map<string, string>();

  for (const item of promo.items) {
    const rawTarget = targetsByItemId.get(item.id);
    if (!rawTarget?.trim()) {
      res.status(400).json({ success: false, message: "Faltan datos para completar la promoción" });
      return;
    }
    normalizedTargets.set(item.id, normalizeLink(rawTarget, item.platform, item.category));
  }

  if (paymentMethod === "balance") {
    const client = await getClient();
    const orderRows: Array<{
      orderId: string;
      item: PromotionCheckoutItem;
      link: string;
      email: string;
      price: number;
      title: string;
      userName: string;
    }> = [];
    const cashbackAmount = parseFloat(
      (promo.promo_price * (env.CASHBACK_PERCENT / 100)).toFixed(2),
    );

    try {
      await client.query("BEGIN");

      const deductResult = await client.query(
        "UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING id",
        [promo.promo_price, user.id],
      );
      if (!deductResult.rowCount) {
        await client.query("ROLLBACK");
        res.status(402).json({
          success: false,
          insufficientBalance: true,
          message: "Saldo insuficiente",
          required: promo.promo_price,
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

      for (const split of orderSplits) {
        const link = normalizedTargets.get(split.item.id)!;
        const orderResult = await client.query<{ id: string }>(
          `INSERT INTO orders
           (user_id, service_id, promotion_id, link, quantity, price, original_price, status, email)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing', $8)
           RETURNING id`,
          [
            user.id,
            split.item.service_id,
            promo.id,
            link,
            split.item.quantity,
            split.price,
            split.originalPrice,
            email,
          ],
        );
        orderRows.push({
          orderId: orderResult.rows[0].id,
          item: split.item,
          link,
          email: String(email),
          price: split.price,
          title: promo.title,
          userName: user.name,
        });
      }

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

    await sendOrdersToProvider(orderRows);

    res.status(201).json({
      success: true,
      paidWithBalance: true,
      orderIds: orderRows.map((row) => row.orderId),
      price: promo.promo_price,
      originalPrice: promo.compare_at_price,
    });
    return;
  }

  const client = await getClient();
  let orderIds: string[] = [];
  try {
    await client.query("BEGIN");
    for (const split of orderSplits) {
      const link = normalizedTargets.get(split.item.id)!;
      const orderResult = await client.query<{ id: string }>(
        `INSERT INTO orders
         (user_id, service_id, promotion_id, link, quantity, price, original_price, status, email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'awaiting_payment', $8)
         RETURNING id`,
        [
          user.id,
          split.item.service_id,
          promo.id,
          link,
          split.item.quantity,
          split.price,
          split.originalPrice,
          email,
        ],
      );
      orderIds.push(orderResult.rows[0].id);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  try {
    const pref = await createPaymentPreference({
      orderId: orderIds[0],
      title: promo.title,
      quantity: 1,
      unitPrice: promo.promo_price,
      payerEmail: user.email,
      payerName: user.name,
    });

    await query(
      `INSERT INTO payments
       (order_id, user_id, amount, currency, payment_method, payment_provider, preference_id, status, metadata)
       VALUES ($1, $2, $3, 'ARS', 'mercadopago', 'mercadopago', $4, 'pending', $5)`,
      [
        orderIds[0],
        user.id,
        promo.promo_price,
        pref.id,
        JSON.stringify({ promotionId: promo.id, orderIds }),
      ],
    );

    res.status(201).json({
      success: true,
      orderId: orderIds[0],
      orderIds,
      preferenceId: pref.id,
      initPoint: pref.initPoint,
      sandboxInitPoint: pref.sandboxInitPoint,
      price: promo.promo_price,
      originalPrice: promo.compare_at_price,
    });
  } catch (err) {
    await query("UPDATE orders SET status = 'failed', updated_at = NOW() WHERE id = ANY($1::uuid[])", [orderIds]);
    logger.error("Error creating promo MercadoPago checkout", { orderIds, error: err });
    res.status(500).json({
      success: false,
      message: "Error al procesar el pago con MercadoPago",
    });
  }
};

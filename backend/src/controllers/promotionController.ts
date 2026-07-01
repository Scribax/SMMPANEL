import { Request, Response } from "express";
import { getClient, query } from "../config/database";

interface PromotionItemRow {
  id: string;
  promotion_id: string;
  service_id: string;
  quantity: number;
  sort_order: number;
  service_name?: string;
  service_platform?: string;
  service_category?: string;
  service_delivery_speed?: string | null;
  service_min_quantity?: number;
  service_max_quantity?: number;
}

interface PromotionRow {
  id: string;
  service_id: string;
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  badge: string | null;
  quantity: number;
  promo_price: number;
  compare_at_price: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  service_name?: string;
  service_platform?: string;
  service_category?: string;
  service_delivery_speed?: string | null;
  service_min_quantity?: number;
  service_max_quantity?: number;
  items?: PromotionItemRow[];
}

const promotionSelect = `
  SELECT p.*,
         s.name AS service_name,
         s.platform AS service_platform,
         s.category AS service_category,
         s.delivery_speed AS service_delivery_speed,
         s.min_quantity AS service_min_quantity,
         s.max_quantity AS service_max_quantity,
         COALESCE(items.items, '[]'::json) AS items
  FROM promotions p
  LEFT JOIN services s ON s.id = p.service_id
  LEFT JOIN LATERAL (
    SELECT json_agg(
      json_build_object(
        'id', pi.id,
        'promotion_id', pi.promotion_id,
        'service_id', pi.service_id,
        'quantity', pi.quantity,
        'sort_order', pi.sort_order,
        'service_name', si.name,
        'service_platform', si.platform,
        'service_category', si.category,
        'service_delivery_speed', si.delivery_speed,
        'service_min_quantity', si.min_quantity,
        'service_max_quantity', si.max_quantity
      ) ORDER BY pi.sort_order ASC, pi.created_at ASC
    ) AS items
    FROM promotion_items pi
    JOIN services si ON si.id = pi.service_id
    WHERE pi.promotion_id = p.id
  ) items ON true
`;

const normalizeItems = (items: unknown): PromotionItemRow[] => {
  const parsed = Array.isArray(items) ? items : [];
  return parsed.map((item: any) => ({
    ...item,
    quantity: Number(item.quantity),
    sort_order: Number(item.sort_order ?? 0),
    service_min_quantity:
      item.service_min_quantity === undefined ? undefined : Number(item.service_min_quantity),
    service_max_quantity:
      item.service_max_quantity === undefined ? undefined : Number(item.service_max_quantity),
  }));
};

const normalizePromotion = (row: PromotionRow) => ({
  ...row,
  quantity: Number(row.quantity),
  promo_price: Number(row.promo_price),
  compare_at_price:
    row.compare_at_price === null ? null : Number(row.compare_at_price),
  max_uses: row.max_uses === null ? null : Number(row.max_uses),
  used_count: Number(row.used_count),
  sort_order: Number(row.sort_order),
  service_min_quantity:
    row.service_min_quantity === undefined ? undefined : Number(row.service_min_quantity),
  service_max_quantity:
    row.service_max_quantity === undefined ? undefined : Number(row.service_max_quantity),
  items: normalizeItems(row.items),
});

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

const hasOwn = (obj: unknown, key: string) =>
  Object.prototype.hasOwnProperty.call(obj, key);

const parseItems = (body: any, existing?: PromotionRow) => {
  const rawItems = Array.isArray(body.items) ? body.items : null;
  if (rawItems && rawItems.length > 0) {
    const items = rawItems.map((item: any, index: number) => ({
      serviceId: String(item.serviceId ?? item.service_id ?? ""),
      quantity: Number(item.quantity),
      sortOrder: Number(item.sortOrder ?? item.sort_order ?? index),
    }));
    return items;
  }

  if (existing?.items?.length) {
    return normalizeItems(existing.items).map((item) => ({
      serviceId: item.service_id,
      quantity: Number(item.quantity),
      sortOrder: Number(item.sort_order ?? 0),
    }));
  }

  const serviceId = body.serviceId ?? body.service_id ?? existing?.service_id;
  const quantity = Number(body.quantity ?? existing?.quantity);
  return serviceId ? [{ serviceId: String(serviceId), quantity, sortOrder: 0 }] : [];
};

const readPayload = (body: any, existing?: PromotionRow) => {
  const items = parseItems(body, existing);
  const primaryItem = items[0];
  const title = body.title ?? existing?.title;
  const rawSlug = body.slug ?? existing?.slug ?? title;
  const slug = slugify(String(rawSlug ?? ""));
  const description = hasOwn(body, "description")
    ? String(body.description ?? "").trim() || null
    : existing?.description ?? null;
  const imageUrl = hasOwn(body, "imageUrl") || hasOwn(body, "image_url")
    ? String(body.imageUrl ?? body.image_url ?? "").trim() || null
    : existing?.image_url ?? null;
  const badge = hasOwn(body, "badge")
    ? String(body.badge ?? "").trim() || null
    : existing?.badge ?? null;
  const promoPrice = Number(body.promoPrice ?? body.promo_price ?? existing?.promo_price);
  const compareAtRaw = body.compareAtPrice ?? body.compare_at_price;
  const compareAtPrice = hasOwn(body, "compareAtPrice") || hasOwn(body, "compare_at_price")
    ? compareAtRaw === "" || compareAtRaw === null || compareAtRaw === undefined
      ? null
      : Number(compareAtRaw)
    : existing?.compare_at_price ?? null;
  const maxUsesRaw = body.maxUses ?? body.max_uses;
  const maxUses = hasOwn(body, "maxUses") || hasOwn(body, "max_uses")
    ? maxUsesRaw === "" || maxUsesRaw === null || maxUsesRaw === undefined
      ? null
      : Number(maxUsesRaw)
    : existing?.max_uses ?? null;
  const startsAtRaw = body.startsAt ?? body.starts_at;
  const startsAt = hasOwn(body, "startsAt") || hasOwn(body, "starts_at")
    ? startsAtRaw ? String(startsAtRaw) : null
    : existing?.starts_at ?? null;
  const expiresAtRaw = body.expiresAt ?? body.expires_at;
  const expiresAt = hasOwn(body, "expiresAt") || hasOwn(body, "expires_at")
    ? expiresAtRaw ? String(expiresAtRaw) : null
    : existing?.expires_at ?? null;
  const isActive = hasOwn(body, "isActive") || hasOwn(body, "is_active")
    ? Boolean(body.isActive ?? body.is_active)
    : existing?.is_active ?? true;
  const sortOrder = Number(body.sortOrder ?? body.sort_order ?? existing?.sort_order ?? 0);

  if (!items.length) return { ok: false as const, message: "At least one promotion item is required" };
  if (!title || !String(title).trim()) return { ok: false as const, message: "title is required" };
  if (!slug) return { ok: false as const, message: "slug is required" };
  if (!Number.isFinite(promoPrice) || promoPrice <= 0) {
    return { ok: false as const, message: "promoPrice must be greater than 0" };
  }
  if (compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice <= 0)) {
    return { ok: false as const, message: "compareAtPrice must be greater than 0" };
  }
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
    return { ok: false as const, message: "maxUses must be a positive integer" };
  }
  if (!Number.isInteger(sortOrder)) {
    return { ok: false as const, message: "sortOrder must be an integer" };
  }
  if (startsAt && Number.isNaN(new Date(startsAt).getTime())) {
    return { ok: false as const, message: "startsAt must be a valid date" };
  }
  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
    return { ok: false as const, message: "expiresAt must be a valid date" };
  }

  for (const item of items) {
    if (!item.serviceId) return { ok: false as const, message: "Every item needs a service" };
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { ok: false as const, message: "Every item quantity must be a positive integer" };
    }
    if (!Number.isInteger(item.sortOrder)) {
      return { ok: false as const, message: "Every item sortOrder must be an integer" };
    }
  }

  return {
    ok: true as const,
    data: {
      serviceId: primaryItem.serviceId,
      quantity: primaryItem.quantity,
      items,
      slug,
      title: String(title).trim(),
      description,
      imageUrl,
      badge,
      promoPrice,
      compareAtPrice,
      maxUses,
      startsAt,
      expiresAt,
      isActive,
      sortOrder,
    },
  };
};

const validatePromotionItems = async (items: Array<{ serviceId: string; quantity: number }>) => {
  for (const item of items) {
    const service = await query<{ id: string; min_quantity: number; max_quantity: number }>(
      "SELECT id, min_quantity, max_quantity FROM services WHERE id = $1",
      [item.serviceId],
    );
    if (!service.rows.length) return "Service not found";
    const row = service.rows[0];
    if (item.quantity < row.min_quantity || item.quantity > row.max_quantity) {
      return `Quantity must be between ${row.min_quantity} and ${row.max_quantity}`;
    }
  }
  return null;
};

export const getPublicPromotions = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const result = await query<PromotionRow>(
    `${promotionSelect}
     WHERE p.is_active = true
       AND s.is_active = true
       AND (p.starts_at IS NULL OR p.starts_at <= NOW())
       AND (p.expires_at IS NULL OR p.expires_at > NOW())
       AND (p.max_uses IS NULL OR p.used_count < p.max_uses)
       AND NOT EXISTS (
         SELECT 1 FROM promotion_items pi
         JOIN services item_service ON item_service.id = pi.service_id
         WHERE pi.promotion_id = p.id AND item_service.is_active = false
       )
     ORDER BY p.sort_order ASC, p.created_at DESC`,
  );

  res.json({
    success: true,
    promotions: result.rows.map(normalizePromotion),
  });
};

export const adminGetPromotions = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const result = await query<PromotionRow>(
    `${promotionSelect}
     ORDER BY p.sort_order ASC, p.created_at DESC`,
  );
  res.json({ success: true, promotions: result.rows.map(normalizePromotion) });
};

export const adminCreatePromotion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const payload = readPayload(req.body);
  if (!payload.ok) {
    res.status(400).json({ success: false, message: payload.message });
    return;
  }

  const itemError = await validatePromotionItems(payload.data.items);
  if (itemError) {
    res.status(400).json({ success: false, message: itemError });
    return;
  }

  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await client.query<PromotionRow>(
      `INSERT INTO promotions
       (service_id, slug, title, description, image_url, badge, quantity,
        promo_price, compare_at_price, max_uses, starts_at, expires_at,
        is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        payload.data.serviceId,
        payload.data.slug,
        payload.data.title,
        payload.data.description,
        payload.data.imageUrl,
        payload.data.badge,
        payload.data.quantity,
        payload.data.promoPrice,
        payload.data.compareAtPrice,
        payload.data.maxUses,
        payload.data.startsAt,
        payload.data.expiresAt,
        payload.data.isActive,
        payload.data.sortOrder,
      ],
    );

    const promotionId = result.rows[0].id;
    for (const item of payload.data.items) {
      await client.query(
        `INSERT INTO promotion_items (promotion_id, service_id, quantity, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [promotionId, item.serviceId, item.quantity, item.sortOrder],
      );
    }
    await client.query("COMMIT");

    const full = await query<PromotionRow>(`${promotionSelect} WHERE p.id = $1`, [promotionId]);
    res.status(201).json({ success: true, promotion: normalizePromotion(full.rows[0]) });
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (err?.code === "23505") {
      res.status(409).json({ success: false, message: "Promotion slug already exists" });
      return;
    }
    throw err;
  } finally {
    client.release();
  }
};

export const adminUpdatePromotion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const existingResult = await query<PromotionRow>(`${promotionSelect} WHERE p.id = $1`, [id]);
  if (!existingResult.rows.length) {
    res.status(404).json({ success: false, message: "Promotion not found" });
    return;
  }

  const payload = readPayload(req.body, normalizePromotion(existingResult.rows[0]) as PromotionRow);
  if (!payload.ok) {
    res.status(400).json({ success: false, message: payload.message });
    return;
  }

  const itemError = await validatePromotionItems(payload.data.items);
  if (itemError) {
    res.status(400).json({ success: false, message: itemError });
    return;
  }

  const client = await getClient();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE promotions SET
         service_id = $1,
         slug = $2,
         title = $3,
         description = $4,
         image_url = $5,
         badge = $6,
         quantity = $7,
         promo_price = $8,
         compare_at_price = $9,
         max_uses = $10,
         starts_at = $11,
         expires_at = $12,
         is_active = $13,
         sort_order = $14,
         updated_at = NOW()
       WHERE id = $15`,
      [
        payload.data.serviceId,
        payload.data.slug,
        payload.data.title,
        payload.data.description,
        payload.data.imageUrl,
        payload.data.badge,
        payload.data.quantity,
        payload.data.promoPrice,
        payload.data.compareAtPrice,
        payload.data.maxUses,
        payload.data.startsAt,
        payload.data.expiresAt,
        payload.data.isActive,
        payload.data.sortOrder,
        id,
      ],
    );

    await client.query("DELETE FROM promotion_items WHERE promotion_id = $1", [id]);
    for (const item of payload.data.items) {
      await client.query(
        `INSERT INTO promotion_items (promotion_id, service_id, quantity, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [id, item.serviceId, item.quantity, item.sortOrder],
      );
    }
    await client.query("COMMIT");

    const full = await query<PromotionRow>(`${promotionSelect} WHERE p.id = $1`, [id]);
    res.json({ success: true, promotion: normalizePromotion(full.rows[0]) });
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (err?.code === "23505") {
      res.status(409).json({ success: false, message: "Promotion slug already exists" });
      return;
    }
    throw err;
  } finally {
    client.release();
  }
};

export const adminDeletePromotion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const result = await query<PromotionRow>(
    "UPDATE promotions SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *",
    [id],
  );
  if (!result.rows.length) {
    res.status(404).json({ success: false, message: "Promotion not found" });
    return;
  }
  res.json({
    success: true,
    promotion: normalizePromotion(result.rows[0]),
    message: "Promotion deactivated",
  });
};

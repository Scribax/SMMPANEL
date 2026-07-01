import { Request, Response } from "express";
import { query } from "../config/database";
import { encrypt } from "../services/encryptionService";
import {
  renderMarketingEmail,
  sendMarketingEmail,
} from "../services/emailService";
import { logger } from "../utils/logger";
import { invalidateServicesCache } from "./serviceController";
import { getResellerPricingProfile } from "../services/resellerService";

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

export const getDashboardStats = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const [users, orders, revenue, todayRevenue, monthRevenue, recentOrders] =
    await Promise.all([
      query<{ count: string }>("SELECT COUNT(*) FROM users WHERE role = $1", [
        "user",
      ]),
      query<{ count: string }>("SELECT COUNT(*) FROM orders"),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(price), 0) AS total FROM orders WHERE status NOT IN ('cancelled', 'awaiting_payment', 'failed')`,
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(price), 0) AS total FROM orders WHERE status NOT IN ('cancelled', 'awaiting_payment', 'failed') AND DATE(created_at) = CURRENT_DATE`,
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(price), 0) AS total FROM orders WHERE status NOT IN ('cancelled', 'awaiting_payment', 'failed') AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`,
      ),
      query(
        `SELECT o.id, o.link, o.quantity, o.price, o.status, o.created_at,
              o.promotion_id, p.title AS promotion_title, p.promo_price AS promotion_price,
              promo_items.item_count AS promotion_item_count,
              s.name AS service_name, s.platform,
              u.name AS user_name, u.email AS user_email
       FROM orders o
       LEFT JOIN services s ON o.service_id = s.id
       LEFT JOIN promotions p ON o.promotion_id = p.id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS item_count
         FROM promotion_items pi
         WHERE pi.promotion_id = p.id
       ) promo_items ON true
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC LIMIT 10`,
      ),
    ]);

  // Top 5 clientes por gasto total
  const topClientsResult = await query(
    `SELECT u.name, u.email, COALESCE(SUM(o.price), 0) as total_spent, COUNT(o.id) as order_count
     FROM users u
     LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed'
     WHERE u.role = 'user'
     GROUP BY u.id, u.name, u.email
     ORDER BY total_spent DESC
     LIMIT 5`,
  );

  // Servicios más vendidos
  const topServicesResult = await query(
    `SELECT s.name, COUNT(o.id) as order_count, COALESCE(SUM(o.price), 0) as revenue
     FROM services s
     LEFT JOIN orders o ON s.id = o.service_id AND o.status = 'completed'
     WHERE s.is_active = true
     GROUP BY s.id, s.name
     ORDER BY order_count DESC
     LIMIT 5`,
  );

  // Pedidos por estado
  const ordersByStatusResult = await query(
    `SELECT status, COUNT(*) as count FROM orders GROUP BY status`,
  );

  const dailySales = await query<{
    date: string;
    revenue: string;
    orders: string;
  }>(
    `SELECT DATE(created_at) AS date,
            COALESCE(SUM(price), 0) AS revenue,
            COUNT(*) AS orders
     FROM orders
     WHERE status NOT IN ('cancelled', 'awaiting_payment', 'failed')
       AND created_at >= NOW() - INTERVAL '30 days'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
  );

  res.json({
    success: true,
    stats: {
      totalUsers: parseInt(users.rows[0]?.count ?? "0"),
      totalOrders: parseInt(orders.rows[0]?.count ?? "0"),
      totalRevenue: parseFloat(revenue.rows[0]?.total ?? "0"),
      todayRevenue: parseFloat(todayRevenue.rows[0]?.total ?? "0"),
      monthRevenue: parseFloat(monthRevenue.rows[0]?.total ?? "0"),
    },
    recentOrders: recentOrders.rows,
    dailySales: dailySales.rows,
    topClients: topClientsResult.rows.map((row: any) => ({
      name: row.name,
      email: row.email,
      totalSpent: parseFloat(row.total_spent),
      orderCount: parseInt(row.order_count),
    })),
    topServices: topServicesResult.rows.map((row: any) => ({
      name: row.name,
      orderCount: parseInt(row.order_count),
      revenue: parseFloat(row.revenue),
    })),
    ordersByStatus: ordersByStatusResult.rows,
  });
};

// ─── SERVICES MANAGEMENT ─────────────────────────────────────────────────────

export const adminGetServices = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const result = await query(
    `SELECT s.*, p.name AS provider_name
     FROM services s
     LEFT JOIN providers p ON s.provider_id = p.id
     ORDER BY s.sort_order ASC, s.platform ASC`,
  );
  res.json({ success: true, services: result.rows });
};

export const adminCreateService = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const b = req.body;
  const providerId = b.providerId ?? b.provider_id ?? null;
  const providerServiceId =
    b.providerServiceId ?? b.provider_service_id ?? null;
  const name = b.name;
  const category = b.category;
  const platform = b.platform;
  const description = b.description ?? null;
  const pricePerUnit = b.pricePerUnit ?? b.price_per_unit;
  const minQuantity = b.minQuantity ?? b.min_quantity ?? 100;
  const maxQuantity = b.maxQuantity ?? b.max_quantity ?? 10000;
  const deliverySpeed = b.deliverySpeed ?? b.delivery_speed ?? null;
  const sortOrder = b.sortOrder ?? b.sort_order ?? 0;

  // If no provider explicitly set, use the first active provider
  const resolvedProvider =
    providerId ??
    (
      await query(
        "SELECT id FROM providers WHERE is_active = true ORDER BY created_at ASC LIMIT 1",
      )
    ).rows[0]?.id ??
    null;

  const result = await query(
    `INSERT INTO services
       (provider_id, provider_service_id, name, category, platform,
        description, price_per_unit, min_quantity, max_quantity, delivery_speed, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      resolvedProvider,
      providerServiceId,
      name,
      category,
      platform,
      description,
      pricePerUnit,
      minQuantity,
      maxQuantity,
      deliverySpeed,
      sortOrder,
    ],
  );
  invalidateServicesCache();
  res.status(201).json({ success: true, service: result.rows[0] });
};

export const adminUpdateService = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const b = req.body;
  const name = b.name ?? null;
  const category = b.category ?? null;
  const platform = b.platform ?? null;
  const description = b.description ?? null;
  const pricePerUnit = b.pricePerUnit ?? b.price_per_unit ?? null;
  const minQuantity = b.minQuantity ?? b.min_quantity ?? null;
  const maxQuantity = b.maxQuantity ?? b.max_quantity ?? null;
  const deliverySpeed = b.deliverySpeed ?? b.delivery_speed ?? null;
  const isActive = b.isActive ?? b.is_active ?? null;
  const sortOrder = b.sortOrder ?? b.sort_order ?? null;
  const providerServiceId =
    b.providerServiceId ?? b.provider_service_id ?? null;

  const result = await query(
    `UPDATE services SET
       name = COALESCE($1, name),
       category = COALESCE($2, category),
       platform = COALESCE($3, platform),
       description = COALESCE($4, description),
       price_per_unit = COALESCE($5, price_per_unit),
       min_quantity = COALESCE($6, min_quantity),
       max_quantity = COALESCE($7, max_quantity),
       delivery_speed = COALESCE($8, delivery_speed),
       is_active = COALESCE($9, is_active),
       sort_order = COALESCE($10, sort_order),
       provider_service_id = COALESCE($11, provider_service_id),
       updated_at = NOW()
     WHERE id = $12
     RETURNING *`,
    [
      name,
      category,
      platform,
      description,
      pricePerUnit,
      minQuantity,
      maxQuantity,
      deliverySpeed,
      isActive,
      sortOrder,
      providerServiceId,
      id,
    ],
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: "Service not found" });
    return;
  }
  invalidateServicesCache();
  res.json({ success: true, service: result.rows[0] });
};

export const adminDeleteService = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  await query("UPDATE services SET is_active = false WHERE id = $1", [id]);
  invalidateServicesCache();
  res.json({ success: true, message: "Service deactivated" });
};

// ─── PROVIDERS MANAGEMENT ────────────────────────────────────────────────────

export const adminGetProviders = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const result = await query(
    "SELECT id, name, api_url, is_active, created_at FROM providers ORDER BY created_at DESC",
  );
  res.json({ success: true, providers: result.rows });
};

export const adminCreateProvider = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { name, apiUrl, apiKey } = req.body;

  if (!name || !apiUrl || !apiKey) {
    res
      .status(400)
      .json({
        success: false,
        message: "name, apiUrl, and apiKey are required",
      });
    return;
  }

  const encryptedKey = encrypt(apiKey);
  const result = await query(
    "INSERT INTO providers (name, api_url, api_key_enc) VALUES ($1, $2, $3) RETURNING id, name, api_url, is_active, created_at",
    [name, apiUrl, encryptedKey],
  );
  res.status(201).json({ success: true, provider: result.rows[0] });
};

export const adminUpdateProvider = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { name, apiUrl, apiKey, isActive } = req.body;

  const encryptedKey = apiKey ? encrypt(apiKey) : null;
  const result = await query(
    `UPDATE providers SET
       name = COALESCE($1, name),
       api_url = COALESCE($2, api_url),
       api_key_enc = COALESCE($3, api_key_enc),
       is_active = COALESCE($4, is_active),
       updated_at = NOW()
     WHERE id = $5
     RETURNING id, name, api_url, is_active`,
    [name, apiUrl, encryptedKey, isActive, id],
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: "Provider not found" });
    return;
  }
  res.json({ success: true, provider: result.rows[0] });
};

export const adminGetProviderBalance = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  try {
    const { getProviderBalance } = await import("../services/providerService");
    const balance = await getProviderBalance(id);
    res.json({ success: true, balance });
  } catch (err) {
    res.status(400).json({ success: false, message: String(err) });
  }
};

export const adminSyncProviderServices = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  try {
    const { getProviderServices } = await import("../services/providerService");
    const services = await getProviderServices(id);
    invalidateServicesCache();
    res.json({ success: true, count: services.length, services });
  } catch (err) {
    res.status(400).json({ success: false, message: String(err) });
  }
};

// ─── ORDERS MANAGEMENT ───────────────────────────────────────────────────────

export const adminGetOrders = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const limit = parseInt(String(req.query.limit ?? "20"), 10);
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const validStatuses = [
    "pending",
    "processing",
    "in_progress",
    "completed",
    "partial",
    "failed",
    "refunded",
    "cancelled",
    "awaiting_payment",
  ];
  const safeStatus =
    status && validStatuses.includes(status) ? status : undefined;
  const whereClause = safeStatus ? "WHERE o.status = $3" : "";
  const params = safeStatus ? [limit, offset, safeStatus] : [limit, offset];

  const [orders, count] = await Promise.all([
    query(
      `SELECT o.id, o.link, o.quantity, o.price, o.status,
              o.provider_order_id, o.created_at, o.promotion_id,
              p.title AS promotion_title, p.promo_price AS promotion_price,
              promo_items.item_count AS promotion_item_count,
              s.name AS service_name, s.platform,
              u.name AS user_name, u.email AS user_email
       FROM orders o
       LEFT JOIN services s ON o.service_id = s.id
       LEFT JOIN promotions p ON o.promotion_id = p.id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS item_count
         FROM promotion_items pi
         WHERE pi.promotion_id = p.id
       ) promo_items ON true
       LEFT JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $1 OFFSET $2`,
      params,
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) FROM orders ${status ? "WHERE status = $1" : ""}`,
      status ? [status] : [],
    ),
  ]);

  res.json({
    success: true,
    orders: orders.rows,
    total: parseInt(count.rows[0]?.count ?? "0"),
    page,
    limit,
  });
};

export const adminUpdateOrderStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = [
    "pending",
    "processing",
    "in_progress",
    "completed",
    "partial",
    "failed",
    "refunded",
    "cancelled",
  ];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, message: "Invalid status" });
    return;
  }

  const existing = await query<{
    id: string;
    user_id: string;
    price: number;
    status: string;
  }>("SELECT id, user_id, price, status FROM orders WHERE id = $1", [id]);
  if (!existing.rows.length) {
    res.status(404).json({ success: false, message: "Order not found" });
    return;
  }

  const prev = existing.rows[0];
  // Devolver saldo si se marca como refunded/cancelled/failed y no estaba ya en ese estado
  const refundStatuses = ["refunded", "cancelled", "failed"];
  const wasAlreadyRefunded = refundStatuses.includes(prev.status);
  if (
    refundStatuses.includes(status) &&
    !wasAlreadyRefunded &&
    prev.user_id &&
    prev.price > 0
  ) {
    await query("UPDATE users SET balance = balance + $1 WHERE id = $2", [
      prev.price,
      prev.user_id,
    ]);
    logger.info("Balance refunded via status update", {
      orderId: id,
      amount: prev.price,
      newStatus: status,
    });
  }

  const result = await query(
    "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status",
    [status, id],
  );
  res.json({ success: true, order: result.rows[0] });
};

import { cancelOrderFromProvider } from "../services/providerService";

export const adminRefundOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  const order = await query<{
    id: string;
    user_id: string;
    price: number;
    status: string;
    provider_id: string;
    provider_order_id: string;
  }>(
    `SELECT o.id, o.user_id, o.price, o.status, s.provider_id, o.provider_order_id
     FROM orders o
     LEFT JOIN services s ON o.service_id = s.id
     WHERE o.id = $1`,
    [id],
  );

  if (!order.rows.length) {
    res.status(404).json({ success: false, message: "Order not found" });
    return;
  }

  const o = order.rows[0];
  if (o.status === "refunded") {
    res.status(400).json({ success: false, message: "Order already refunded" });
    return;
  }

  // Si tiene provider_order_id, intentamos cancelar en el proveedor primero
  if (o.provider_order_id && o.provider_id) {
    logger.info("Attempting to cancel order on provider before refund", {
      orderId: id,
      providerOrderId: o.provider_order_id,
    });
    const cancelResult = await cancelOrderFromProvider(
      o.provider_id,
      o.provider_order_id,
    );

    if (!cancelResult.success) {
      logger.warn(
        "Failed to cancel order on provider, but proceeding with refund",
        { orderId: id, error: cancelResult.message },
      );
      // Continuamos igual porque el pedido podría ya estar cancelado o parcial
    } else {
      logger.info("Order cancelled on provider successfully", { orderId: id });
    }
  }

  // Reembolsar al cliente
  if (o.user_id) {
    await query("UPDATE users SET balance = balance + $1 WHERE id = $2", [
      o.price,
      o.user_id,
    ]);
  }

  await query(
    `UPDATE orders SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
    [id],
  );
  await query(
    `UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE order_id = $1`,
    [id],
  );

  logger.info("Order refunded by admin", { orderId: id, amount: o.price });
  res.json({
    success: true,
    message:
      "Order refunded and cancelled on provider. Credit added to user balance.",
  });
};

export const adminRetryOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  const orderResult = await query<{
    id: string;
    link: string;
    quantity: number;
    status: string;
    provider_id: string;
    provider_service_id: number;
  }>(
    `SELECT o.id, o.link, o.quantity, o.status,
            s.provider_id, s.provider_service_id
     FROM orders o
     JOIN services s ON o.service_id = s.id
     WHERE o.id = $1`,
    [id],
  );

  if (!orderResult.rows.length) {
    res.status(404).json({ success: false, message: "Order not found" });
    return;
  }

  const order = orderResult.rows[0];

  if (!order.provider_id || !order.provider_service_id) {
    res
      .status(400)
      .json({
        success: false,
        message: "No provider configured for this service",
      });
    return;
  }

  try {
    const { sendOrderToProvider } = await import("../services/providerService");
    const providerResult = await sendOrderToProvider({
      providerId: order.provider_id,
      serviceId: order.provider_service_id,
      link: order.link,
      quantity: order.quantity,
    });

    await query(
      `UPDATE orders SET provider_order_id = $1, status = 'processing', updated_at = NOW() WHERE id = $2`,
      [String(providerResult.orderId), id],
    );

    logger.info("Order retried by admin", {
      orderId: id,
      providerOrderId: providerResult.orderId,
    });
    res.json({
      success: true,
      message: "Pedido reenviado al proveedor",
      providerOrderId: providerResult.orderId,
    });
  } catch (err) {
    logger.error("Retry order failed", { orderId: id, error: err });
    res
      .status(400)
      .json({ success: false, message: `Error del proveedor: ${String(err)}` });
  }
};

// ─── USERS MANAGEMENT ────────────────────────────────────────────────────────

export const adminGetUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const limit = parseInt(String(req.query.limit ?? "20"), 10);
  const offset = (page - 1) * limit;
  const search = req.query.search ? String(req.query.search).trim() : null;

  const searchClause = search
    ? `WHERE (LOWER(email) LIKE $3 OR LOWER(name) LIKE $3)`
    : "";
  const searchParam = search ? `%${search.toLowerCase()}%` : null;
  const params = search ? [limit, offset, searchParam] : [limit, offset];
  const countParams = search ? [searchParam] : [];
  const countWhere = search ? `WHERE (LOWER(email) LIKE $1 OR LOWER(name) LIKE $1)` : "";

  const [users, count] = await Promise.all([
    query(
      `SELECT id, email, name, role, balance, is_active, created_at,
              reseller_enabled, reseller_discount_percent, reseller_min_deposit,
              (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE user_id = users.id AND status = 'approved') AS approved_deposits,
              (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS order_count
       FROM users
       ${searchClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      params,
    ),
    query<{ count: string }>(`SELECT COUNT(*) FROM users ${countWhere}`, countParams),
  ]);

  res.json({
    success: true,
    users: users.rows,
    total: parseInt(count.rows[0]?.count ?? "0"),
    page,
    limit,
  });
};

export const adminToggleUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const result = await query(
    "UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active",
    [id],
  );
  if (!result.rows.length) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }
  const u = result.rows[0] as { id: string; is_active: boolean };
  res.json({
    success: true,
    message: u.is_active ? "User activated" : "User deactivated",
  });
};

export const adminGetUserDetail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  const userResult = await query(
    `SELECT id, email, name, role, balance, is_active, created_at,
            reseller_enabled, reseller_discount_percent, reseller_min_deposit,
            (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE user_id = users.id AND status = 'approved') AS approved_deposits
     FROM users WHERE id = $1`,
    [id],
  );

  if (!userResult.rows.length) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  const [ordersResult, statsResult] = await Promise.all([
    query(
      `SELECT o.id, o.link, o.quantity, o.price, o.status, o.provider_order_id,
              o.created_at, o.promotion_id, p.title AS promotion_title,
              p.promo_price AS promotion_price, promo_items.item_count AS promotion_item_count,
              s.name as service_name, s.platform
       FROM orders o
       LEFT JOIN services s ON o.service_id = s.id
       LEFT JOIN promotions p ON o.promotion_id = p.id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS item_count
         FROM promotion_items pi
         WHERE pi.promotion_id = p.id
       ) promo_items ON true
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [id],
    ),
    query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'refunded') THEN price ELSE 0 END), 0) as total_spent
       FROM orders
       WHERE user_id = $1`,
      [id],
    ),
  ]);

  res.json({
    success: true,
    user: {
      ...(userResult.rows[0] as Record<string, unknown>),
      reseller: await getResellerPricingProfile(id),
    },
    orders: ordersResult.rows,
    stats: statsResult.rows[0],
  });
};

export const adminAdjustUserBalance = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { amount, reason } = req.body;

  if (typeof amount !== "number" || amount === 0) {
    res.status(400).json({ success: false, message: "Amount must be a non-zero number" });
    return;
  }

  const userResult = await query<{ id: string; email: string; name: string; balance: string }>(
    "SELECT id, email, name, balance FROM users WHERE id = $1",
    [id],
  );

  if (!userResult.rows.length) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  const user = userResult.rows[0];
  const newBalance = parseFloat(user.balance) + amount;

  if (newBalance < 0) {
    res.status(400).json({ success: false, message: "Insufficient balance for deduction" });
    return;
  }

  await query(
    "UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2",
    [newBalance, id],
  );

  logger.info("User balance adjusted by admin", {
    userId: id,
    amount,
    newBalance,
    reason: reason || "No reason provided",
  });

  res.json({
    success: true,
    message: `Balance ${amount > 0 ? "added" : "deducted"} successfully`,
    newBalance,
    adjustment: amount,
  });
};

export const adminDeleteUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  const userResult = await query<{ id: string; role: string; email: string }>(
    "SELECT id, role, email FROM users WHERE id = $1",
    [id],
  );

  if (!userResult.rows.length) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  const user = userResult.rows[0];
  if (user.role === "admin") {
    res.status(400).json({
      success: false,
      message: "No se puede eliminar una cuenta de administrador",
    });
    return;
  }

  // Desasociar pedidos (preservar historial financiero)
  await query("UPDATE orders SET user_id = NULL WHERE user_id = $1", [id]);
  // Eliminar pagos asociados
  await query("DELETE FROM payments WHERE user_id = $1", [id]);
  // Eliminar tickets
  await query("DELETE FROM tickets WHERE user_id = $1", [id]);
  // Eliminar el usuario
  await query("DELETE FROM users WHERE id = $1", [id]);

  logger.info("User deleted by admin", { userId: id, email: user.email });
  res.json({ success: true, message: "Usuario eliminado correctamente" });
};

export const adminChangeUserRole = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['user', 'admin'].includes(role)) {
    res.status(400).json({ success: false, message: "Rol inválido. Debe ser 'user' o 'admin'" });
    return;
  }

  const result = await query(
    "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role",
    [role, id],
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  logger.info("User role changed by admin", { userId: id, newRole: role });
  res.json({ success: true, user: result.rows[0] });
};

export const adminUpdateUserReseller = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const enabled = Boolean(req.body.enabled ?? req.body.reseller_enabled);
  const discountPercent = Number(
    req.body.discountPercent ?? req.body.reseller_discount_percent ?? 0,
  );
  const minDeposit = Number(
    req.body.minDeposit ?? req.body.reseller_min_deposit ?? 5000,
  );

  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 80) {
    res.status(400).json({ success: false, message: "El descuento debe estar entre 0 y 80%" });
    return;
  }

  if (!Number.isFinite(minDeposit) || minDeposit < 0) {
    res.status(400).json({ success: false, message: "El depósito mínimo es inválido" });
    return;
  }

  const result = await query(
    `UPDATE users
     SET reseller_enabled = $1,
         reseller_discount_percent = $2,
         reseller_min_deposit = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, name, email, role, reseller_enabled, reseller_discount_percent, reseller_min_deposit`,
    [enabled, discountPercent, minDeposit, id],
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  logger.info("User reseller settings updated by admin", {
    userId: id,
    enabled,
    discountPercent,
    minDeposit,
  });

  res.json({
    success: true,
    user: result.rows[0],
    reseller: await getResellerPricingProfile(id),
  });
};

export const adminDeleteOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  const orderResult = await query<{ id: string; status: string; user_id: string; price: number }>(
    "SELECT id, status, user_id, price FROM orders WHERE id = $1",
    [id],
  );

  if (!orderResult.rows.length) {
    res.status(404).json({ success: false, message: "Order not found" });
    return;
  }

  await query("DELETE FROM payments WHERE order_id = $1", [id]);
  await query("DELETE FROM orders WHERE id = $1", [id]);

  logger.info("Order deleted by admin", { orderId: id });
  res.json({ success: true, message: "Pedido eliminado correctamente" });
};

export const adminCreateOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId, serviceId, quantity, link } = req.body;

  if (!userId || !serviceId || !quantity || !link) {
    res.status(400).json({
      success: false,
      message: "userId, serviceId, quantity, and link are required",
    });
    return;
  }

  const userResult = await query(
    "SELECT id, balance FROM users WHERE id = $1",
    [userId],
  );
  if (!userResult.rows.length) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  const serviceResult = await query<{
    id: string;
    name: string;
    price_per_unit: string;
    min_quantity: number;
    max_quantity: number;
    provider_id: string;
    provider_service_id: number;
    api_url: string;
    api_key_enc: string;
  }>(
    `SELECT s.id, s.name, s.price_per_unit, s.min_quantity, s.max_quantity,
            s.provider_id, s.provider_service_id, p.api_url, p.api_key_enc
     FROM services s
     LEFT JOIN providers p ON s.provider_id = p.id
     WHERE s.id = $1 AND s.is_active = true`,
    [serviceId],
  );
  if (!serviceResult.rows.length) {
    res.status(404).json({ success: false, message: "Service not found or inactive" });
    return;
  }

  const service = serviceResult.rows[0];
  const qty = parseInt(quantity as string, 10);

  if (qty < service.min_quantity || qty > service.max_quantity) {
    res.status(400).json({
      success: false,
      message: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}`,
    });
    return;
  }

  const price = parseFloat(service.price_per_unit) * qty;

  const orderId = await query<{ id: string }>(
    `INSERT INTO orders (user_id, service_id, quantity, price, link, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING id`,
    [userId, serviceId, qty, price, link, "pending"],
  );

  const newOrderId = orderId.rows[0].id;

  logger.info("Order created by admin", {
    orderId: newOrderId,
    userId,
    serviceId,
    quantity: qty,
    price,
  });

  if (service.provider_id && service.provider_service_id) {
    try {
      const { sendOrderToProvider } = await import("../services/providerService");
      const providerResult = await sendOrderToProvider({
        providerId: service.provider_id,
        serviceId: service.provider_service_id,
        link,
        quantity: qty,
      });

      await query(
        "UPDATE orders SET provider_order_id = $1, status = $2, updated_at = NOW() WHERE id = $3",
        [String(providerResult.orderId), "in_progress", newOrderId],
      );

      logger.info("Order sent to provider by admin", {
        orderId: newOrderId,
        providerOrderId: providerResult.orderId,
      });

      res.json({
        success: true,
        order: {
          id: newOrderId,
          provider_order_id: providerResult.orderId,
          status: "in_progress",
          price,
        },
        message: "Order created and sent to provider",
      });
      return;
    } catch (err) {
      logger.error("Failed to send order to provider", { orderId: newOrderId, error: err });
    }
  }

  res.json({
    success: true,
    order: {
      id: newOrderId,
      status: "pending",
      price,
    },
    message: "Order created (provider delivery pending)",
  });
};

// ─── COUPONS MANAGEMENT ──────────────────────────────────────────────────────

export const adminGetCoupons = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const result = await query("SELECT * FROM coupons ORDER BY created_at DESC");
  res.json({ success: true, coupons: result.rows });
};

const parseCouponPayload = (
  body: any,
  mode: "create" | "update",
):
  | {
      ok: true;
      data: {
        code?: string;
        discountType?: "percentage" | "fixed";
        discountValue?: number;
        minOrderValue?: number;
        maxUses?: number | null;
        expiresAt?: string | null;
        isActive?: boolean;
      };
    }
  | { ok: false; message: string } => {
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
  const rawCode = body.code;
  const rawDiscountType = body.discountType ?? body.discount_type;
  const rawDiscountValue = body.discountValue ?? body.discount_value;
  const rawMinOrderValue = body.minOrderValue ?? body.min_order_value;
  const rawMaxUses = body.maxUses ?? body.max_uses;
  const rawExpiresAt = body.expiresAt ?? body.expires_at;
  const rawIsActive = body.isActive ?? body.is_active;

  const data: {
    code?: string;
    discountType?: "percentage" | "fixed";
    discountValue?: number;
    minOrderValue?: number;
    maxUses?: number | null;
    expiresAt?: string | null;
    isActive?: boolean;
  } = {};

  if (mode === "create" && (!rawCode || !rawDiscountType || rawDiscountValue === undefined)) {
    return {
      ok: false,
      message: "code, discountType and discountValue are required",
    };
  }

  if (rawCode !== undefined) {
    const code = String(rawCode).trim().toUpperCase();
    if (!code || code.length > 50) {
      return { ok: false, message: "Coupon code must be 1 to 50 characters" };
    }
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      return {
        ok: false,
        message: "Coupon code can only contain letters, numbers, _ and -",
      };
    }
    data.code = code;
  }

  if (rawDiscountType !== undefined) {
    const discountType = String(rawDiscountType);
    if (!["percentage", "fixed"].includes(discountType)) {
      return { ok: false, message: "discountType must be percentage or fixed" };
    }
    data.discountType = discountType as "percentage" | "fixed";
  }

  if (rawDiscountValue !== undefined) {
    const discountValue = Number(rawDiscountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return { ok: false, message: "discountValue must be greater than 0" };
    }
    data.discountValue = discountValue;
  }

  const effectiveType = data.discountType ?? String(rawDiscountType || "");
  if (effectiveType === "percentage" && data.discountValue !== undefined && data.discountValue > 100) {
    return { ok: false, message: "percentage discount cannot be greater than 100" };
  }

  if (rawMinOrderValue !== undefined) {
    const minOrderValue = Number(rawMinOrderValue || 0);
    if (!Number.isFinite(minOrderValue) || minOrderValue < 0) {
      return { ok: false, message: "minOrderValue must be 0 or greater" };
    }
    data.minOrderValue = minOrderValue;
  }

  if (rawMaxUses !== undefined) {
    if (rawMaxUses === null || rawMaxUses === "") {
      data.maxUses = null;
    } else {
      const maxUses = Number(rawMaxUses);
      if (!Number.isInteger(maxUses) || maxUses <= 0) {
        return { ok: false, message: "maxUses must be a positive integer" };
      }
      data.maxUses = maxUses;
    }
  }

  if (rawExpiresAt !== undefined) {
    if (rawExpiresAt === null || rawExpiresAt === "") {
      data.expiresAt = null;
    } else if (Number.isNaN(new Date(String(rawExpiresAt)).getTime())) {
      return { ok: false, message: "expiresAt must be a valid date" };
    } else {
      data.expiresAt = String(rawExpiresAt);
    }
  }

  if (has("isActive") || has("is_active")) {
    data.isActive = Boolean(rawIsActive);
  }

  return { ok: true, data };
};

export const adminCreateCoupon = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const payload = parseCouponPayload(req.body, "create");
  if (!payload.ok) {
    res.status(400).json({ success: false, message: payload.message });
    return;
  }

  try {
    const result = await query(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_uses, expires_at, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
      [
        payload.data.code,
        payload.data.discountType,
        payload.data.discountValue,
        payload.data.minOrderValue ?? 0,
        payload.data.maxUses ?? null,
        payload.data.expiresAt ?? null,
        payload.data.isActive ?? true,
      ],
    );
    res.status(201).json({ success: true, coupon: result.rows[0] });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ success: false, message: "Coupon code already exists" });
      return;
    }
    throw err;
  }
};

export const adminUpdateCoupon = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const payload = parseCouponPayload(req.body, "update");
  if (!payload.ok) {
    res.status(400).json({ success: false, message: payload.message });
    return;
  }

  try {
    const existing = await query<{ max_uses: number | null; expires_at: string | null }>(
      "SELECT max_uses, expires_at FROM coupons WHERE id = $1",
      [id],
    );
    if (!existing.rows.length) {
      res.status(404).json({ success: false, message: "Coupon not found" });
      return;
    }

    const result = await query(
    `UPDATE coupons SET
       code = COALESCE($1, code),
       discount_type = COALESCE($2, discount_type),
       discount_value = COALESCE($3, discount_value),
       min_order_value = COALESCE($4, min_order_value),
       max_uses = $5,
       expires_at = $6,
       is_active = COALESCE($7, is_active)
     WHERE id = $8
     RETURNING *`,
      [
        payload.data.code ?? null,
        payload.data.discountType ?? null,
        payload.data.discountValue ?? null,
        payload.data.minOrderValue ?? null,
        Object.prototype.hasOwnProperty.call(payload.data, "maxUses")
          ? payload.data.maxUses
          : existing.rows[0].max_uses,
        Object.prototype.hasOwnProperty.call(payload.data, "expiresAt")
          ? payload.data.expiresAt
          : existing.rows[0].expires_at,
        payload.data.isActive ?? null,
        id,
      ],
    );

    if (!result.rows.length) {
      res.status(404).json({ success: false, message: "Coupon not found" });
      return;
    }
    res.json({ success: true, coupon: result.rows[0], message: "Coupon updated" });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ success: false, message: "Coupon code already exists" });
      return;
    }
    throw err;
  }
};

export const adminDeleteCoupon = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const result = await query(
    "UPDATE coupons SET is_active = false WHERE id = $1 RETURNING *",
    [id],
  );
  if (!result.rows.length) {
    res.status(404).json({ success: false, message: "Coupon not found" });
    return;
  }
  res.json({ success: true, coupon: result.rows[0], message: "Coupon deactivated" });
};

// ─── MARKETING EMAILS ───────────────────────────────────────────────────────

type MarketingAudience = "all" | "active" | "selected";

const getMarketingRecipients = async (
  audience: MarketingAudience,
  userIds: string[] = [],
) => {
  if (audience === "selected") {
    if (!userIds.length) return [];
    const placeholders = userIds.map((_, index) => `$${index + 1}`).join(",");
    const result = await query<{ id: string; email: string; name: string }>(
      `SELECT id, email, name FROM users
       WHERE role = 'user' AND id IN (${placeholders})
       ORDER BY created_at DESC`,
      userIds,
    );
    return result.rows;
  }

  const result = await query<{ id: string; email: string; name: string }>(
    `SELECT id, email, name FROM users
     WHERE role = 'user' ${audience === "active" ? "AND is_active = true" : ""}
     ORDER BY created_at DESC`,
  );
  return result.rows;
};

const validateMarketingPayload = (body: any) => {
  const subject = String(body.subject ?? "").trim();
  const title = String(body.title ?? "").trim();
  const message = String(body.message ?? body.body ?? "").trim();
  const ctaText = String(body.ctaText ?? "").trim();
  const ctaUrl = String(body.ctaUrl ?? "").trim();
  const customHtml = String(body.customHtml ?? "").trim();
  const audience = String(body.audience ?? "active") as MarketingAudience;
  const userIds = Array.isArray(body.userIds)
    ? body.userIds.map(String).filter(Boolean)
    : [];

  if (!subject || (!customHtml && (!title || !message))) {
    return {
      ok: false as const,
      message: "subject is required, plus either customHtml or title and message",
    };
  }

  if (!["all", "active", "selected"].includes(audience)) {
    return { ok: false as const, message: "Invalid audience" };
  }

  if (audience === "selected" && !userIds.length) {
    return {
      ok: false as const,
      message: "Select at least one user for selected audience",
    };
  }

  if ((ctaText && !ctaUrl) || (!ctaText && ctaUrl)) {
    return {
      ok: false as const,
      message: "ctaText and ctaUrl must be provided together",
    };
  }

  return {
    ok: true as const,
    data: { subject, title, message, ctaText, ctaUrl, customHtml, audience, userIds },
  };
};

export const adminPreviewMarketingEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const payload = validateMarketingPayload(req.body);
  if (!payload.ok) {
    res.status(400).json({ success: false, message: payload.message });
    return;
  }

  const sampleUser = {
    name: String(req.body.sampleName ?? "Franco"),
    email: String(req.body.sampleEmail ?? "cliente@followarg.com"),
  };

  const rendered = renderMarketingEmail({
    subject: payload.data.subject,
    title: payload.data.title,
    body: payload.data.message,
    ctaText: payload.data.ctaText,
    ctaUrl: payload.data.ctaUrl,
    customHtml: payload.data.customHtml,
    user: sampleUser,
  });

  res.json({ success: true, preview: rendered });
};

export const adminSendMarketingEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const payload = validateMarketingPayload(req.body);
  if (!payload.ok) {
    res.status(400).json({ success: false, message: payload.message });
    return;
  }

  const recipients = await getMarketingRecipients(
    payload.data.audience,
    payload.data.userIds,
  );

  if (!recipients.length) {
    res.status(400).json({ success: false, message: "No recipients found" });
    return;
  }

  let sent = 0;
  const failed: Array<{ email: string; message: string }> = [];

  for (const recipient of recipients) {
    try {
      await sendMarketingEmail({
        email: recipient.email,
        name: recipient.name,
        subject: payload.data.subject,
        title: payload.data.title,
        body: payload.data.message,
        ctaText: payload.data.ctaText,
        ctaUrl: payload.data.ctaUrl,
        customHtml: payload.data.customHtml,
      });
      sent += 1;
    } catch (err) {
      failed.push({
        email: recipient.email,
        message: err instanceof Error ? err.message : String(err),
      });
      logger.error("Failed to send marketing email", {
        email: recipient.email,
        error: err,
      });
    }
  }

  logger.info("Marketing email sent by admin", {
    audience: payload.data.audience,
    requested: recipients.length,
    sent,
    failed: failed.length,
  });

  res.json({
    success: true,
    sent,
    failed: failed.length,
    total: recipients.length,
    failures: failed.slice(0, 10),
  });
};

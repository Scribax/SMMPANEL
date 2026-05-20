import { Request, Response } from 'express';
import { query } from '../config/database';
import { encrypt } from '../services/encryptionService';
import { logger } from '../utils/logger';

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  const [users, orders, revenue, todayRevenue, monthRevenue, recentOrders] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*) FROM users WHERE role = $1', ['user']),
    query<{ count: string }>('SELECT COUNT(*) FROM orders'),
    query<{ total: string }>(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'approved'`),
    query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'approved' AND DATE(created_at) = CURRENT_DATE`
    ),
    query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'approved' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`
    ),
    query(
      `SELECT o.id, o.link, o.quantity, o.price, o.status, o.created_at,
              s.name AS service_name, s.platform,
              u.name AS user_name, u.email AS user_email
       FROM orders o
       LEFT JOIN services s ON o.service_id = s.id
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC LIMIT 10`
    ),
  ]);

  const dailySales = await query<{ date: string; revenue: string; orders: string }>(
    `SELECT DATE(created_at) AS date,
            COALESCE(SUM(amount), 0) AS revenue,
            COUNT(*) AS orders
     FROM payments
     WHERE status = 'approved'
       AND created_at >= NOW() - INTERVAL '30 days'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`
  );

  res.json({
    success: true,
    stats: {
      totalUsers: parseInt(users.rows[0]?.count ?? '0'),
      totalOrders: parseInt(orders.rows[0]?.count ?? '0'),
      totalRevenue: parseFloat(revenue.rows[0]?.total ?? '0'),
      todayRevenue: parseFloat(todayRevenue.rows[0]?.total ?? '0'),
      monthRevenue: parseFloat(monthRevenue.rows[0]?.total ?? '0'),
    },
    recentOrders: recentOrders.rows,
    dailySales: dailySales.rows,
  });
};

// ─── SERVICES MANAGEMENT ─────────────────────────────────────────────────────

export const adminGetServices = async (_req: Request, res: Response): Promise<void> => {
  const result = await query(
    `SELECT s.*, p.name AS provider_name
     FROM services s
     LEFT JOIN providers p ON s.provider_id = p.id
     ORDER BY s.sort_order ASC, s.platform ASC`
  );
  res.json({ success: true, services: result.rows });
};

export const adminCreateService = async (req: Request, res: Response): Promise<void> => {
  const b = req.body;
  const providerId        = b.providerId        ?? b.provider_id         ?? null;
  const providerServiceId = b.providerServiceId ?? b.provider_service_id ?? null;
  const name              = b.name;
  const category          = b.category;
  const platform          = b.platform;
  const description       = b.description       ?? null;
  const pricePerUnit      = b.pricePerUnit      ?? b.price_per_unit;
  const minQuantity       = b.minQuantity       ?? b.min_quantity        ?? 100;
  const maxQuantity       = b.maxQuantity       ?? b.max_quantity        ?? 10000;
  const deliverySpeed     = b.deliverySpeed     ?? b.delivery_speed      ?? null;
  const sortOrder         = b.sortOrder         ?? b.sort_order          ?? 0;

  // If no provider explicitly set, use the first active provider
  const resolvedProvider = providerId ?? (
    await query('SELECT id FROM providers WHERE is_active = true ORDER BY created_at ASC LIMIT 1')
  ).rows[0]?.id ?? null;

  const result = await query(
    `INSERT INTO services
       (provider_id, provider_service_id, name, category, platform,
        description, price_per_unit, min_quantity, max_quantity, delivery_speed, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [resolvedProvider, providerServiceId, name, category, platform,
     description, pricePerUnit, minQuantity, maxQuantity, deliverySpeed, sortOrder]
  );
  res.status(201).json({ success: true, service: result.rows[0] });
};

export const adminUpdateService = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const b = req.body;
  const name              = b.name              ?? null;
  const category          = b.category          ?? null;
  const platform          = b.platform          ?? null;
  const description       = b.description       ?? null;
  const pricePerUnit      = b.pricePerUnit      ?? b.price_per_unit      ?? null;
  const minQuantity       = b.minQuantity       ?? b.min_quantity        ?? null;
  const maxQuantity       = b.maxQuantity       ?? b.max_quantity        ?? null;
  const deliverySpeed     = b.deliverySpeed     ?? b.delivery_speed      ?? null;
  const isActive          = b.isActive          ?? b.is_active           ?? null;
  const sortOrder         = b.sortOrder         ?? b.sort_order          ?? null;
  const providerServiceId = b.providerServiceId ?? b.provider_service_id ?? null;

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
    [name, category, platform, description, pricePerUnit,
     minQuantity, maxQuantity, deliverySpeed, isActive, sortOrder, providerServiceId, id]
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: 'Service not found' });
    return;
  }
  res.json({ success: true, service: result.rows[0] });
};

export const adminDeleteService = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  await query('UPDATE services SET is_active = false WHERE id = $1', [id]);
  res.json({ success: true, message: 'Service deactivated' });
};

// ─── PROVIDERS MANAGEMENT ────────────────────────────────────────────────────

export const adminGetProviders = async (_req: Request, res: Response): Promise<void> => {
  const result = await query(
    'SELECT id, name, api_url, is_active, created_at FROM providers ORDER BY created_at DESC'
  );
  res.json({ success: true, providers: result.rows });
};

export const adminCreateProvider = async (req: Request, res: Response): Promise<void> => {
  const { name, apiUrl, apiKey } = req.body;

  if (!name || !apiUrl || !apiKey) {
    res.status(400).json({ success: false, message: 'name, apiUrl, and apiKey are required' });
    return;
  }

  const encryptedKey = encrypt(apiKey);
  const result = await query(
    'INSERT INTO providers (name, api_url, api_key_enc) VALUES ($1, $2, $3) RETURNING id, name, api_url, is_active, created_at',
    [name, apiUrl, encryptedKey]
  );
  res.status(201).json({ success: true, provider: result.rows[0] });
};

export const adminUpdateProvider = async (req: Request, res: Response): Promise<void> => {
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
    [name, apiUrl, encryptedKey, isActive, id]
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: 'Provider not found' });
    return;
  }
  res.json({ success: true, provider: result.rows[0] });
};

export const adminGetProviderBalance = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const { getProviderBalance } = await import('../services/providerService');
    const balance = await getProviderBalance(id);
    res.json({ success: true, balance });
  } catch (err) {
    res.status(400).json({ success: false, message: String(err) });
  }
};

export const adminSyncProviderServices = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const { getProviderServices } = await import('../services/providerService');
    const services = await getProviderServices(id);
    res.json({ success: true, count: services.length, services });
  } catch (err) {
    res.status(400).json({ success: false, message: String(err) });
  }
};

// ─── ORDERS MANAGEMENT ───────────────────────────────────────────────────────

export const adminGetOrders = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(String(req.query.page ?? '1'), 10);
  const limit = parseInt(String(req.query.limit ?? '20'), 10);
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const whereClause = status ? 'WHERE o.status = $3' : '';
  const params = status ? [limit, offset, status] : [limit, offset];

  const [orders, count] = await Promise.all([
    query(
      `SELECT o.id, o.link, o.quantity, o.price, o.status,
              o.provider_order_id, o.created_at,
              s.name AS service_name, s.platform,
              u.name AS user_name, u.email AS user_email
       FROM orders o
       LEFT JOIN services s ON o.service_id = s.id
       LEFT JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) FROM orders ${status ? 'WHERE status = $1' : ''}`,
      status ? [status] : []
    ),
  ]);

  res.json({
    success: true,
    orders: orders.rows,
    total: parseInt(count.rows[0]?.count ?? '0'),
    page,
    limit,
  });
};

export const adminUpdateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'processing', 'in_progress', 'completed', 'partial', 'failed', 'refunded', 'cancelled'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, message: 'Invalid status' });
    return;
  }

  const result = await query(
    'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status',
    [status, id]
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }
  res.json({ success: true, order: result.rows[0] });
};

export const adminRefundOrder = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const order = await query<{ id: string; user_id: string; price: number; status: string }>(
    'SELECT id, user_id, price, status FROM orders WHERE id = $1',
    [id]
  );

  if (!order.rows.length) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }

  const o = order.rows[0];
  if (o.status === 'refunded') {
    res.status(400).json({ success: false, message: 'Order already refunded' });
    return;
  }

  if (o.user_id) {
    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [o.price, o.user_id]);
  }

  await query(
    `UPDATE orders SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
    [id]
  );
  await query(
    `UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE order_id = $1`,
    [id]
  );

  logger.info('Order refunded by admin', { orderId: id });
  res.json({ success: true, message: 'Order refunded. Credit added to user balance.' });
};

export const adminRetryOrder = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const orderResult = await query<{
    id: string; link: string; quantity: number; status: string;
    provider_id: string; provider_service_id: number;
  }>(
    `SELECT o.id, o.link, o.quantity, o.status,
            s.provider_id, s.provider_service_id
     FROM orders o
     JOIN services s ON o.service_id = s.id
     WHERE o.id = $1`,
    [id]
  );

  if (!orderResult.rows.length) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }

  const order = orderResult.rows[0];

  if (!order.provider_id || !order.provider_service_id) {
    res.status(400).json({ success: false, message: 'No provider configured for this service' });
    return;
  }

  try {
    const { sendOrderToProvider } = await import('../services/providerService');
    const providerResult = await sendOrderToProvider({
      providerId: order.provider_id,
      serviceId: order.provider_service_id,
      link: order.link,
      quantity: order.quantity,
    });

    await query(
      `UPDATE orders SET provider_order_id = $1, status = 'processing', updated_at = NOW() WHERE id = $2`,
      [String(providerResult.orderId), id]
    );

    logger.info('Order retried by admin', { orderId: id, providerOrderId: providerResult.orderId });
    res.json({ success: true, message: 'Pedido reenviado al proveedor', providerOrderId: providerResult.orderId });
  } catch (err) {
    logger.error('Retry order failed', { orderId: id, error: err });
    res.status(400).json({ success: false, message: `Error del proveedor: ${String(err)}` });
  }
};

// ─── USERS MANAGEMENT ────────────────────────────────────────────────────────

export const adminGetUsers = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(String(req.query.page ?? '1'), 10);
  const limit = parseInt(String(req.query.limit ?? '20'), 10);
  const offset = (page - 1) * limit;

  const [users, count] = await Promise.all([
    query(
      `SELECT id, email, name, role, balance, is_active, created_at,
              (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS order_count
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    query<{ count: string }>('SELECT COUNT(*) FROM users'),
  ]);

  res.json({
    success: true,
    users: users.rows,
    total: parseInt(count.rows[0]?.count ?? '0'),
    page,
    limit,
  });
};

export const adminToggleUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await query(
    'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active',
    [id]
  );
  if (!result.rows.length) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  const u = result.rows[0] as { id: string; is_active: boolean };
  res.json({ success: true, message: u.is_active ? 'User activated' : 'User deactivated' });
};

// ─── COUPONS MANAGEMENT ──────────────────────────────────────────────────────

export const adminGetCoupons = async (_req: Request, res: Response): Promise<void> => {
  const result = await query('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json({ success: true, coupons: result.rows });
};

export const adminCreateCoupon = async (req: Request, res: Response): Promise<void> => {
  const { code, discountType, discountValue, minOrderValue, maxUses, expiresAt } = req.body;

  if (!code || !discountType || discountValue === undefined) {
    res.status(400).json({ success: false, message: 'code, discountType, and discountValue are required' });
    return;
  }

  const result = await query(
    `INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_uses, expires_at)
     VALUES (UPPER($1), $2, $3, $4, $5, $6)
     RETURNING *`,
    [code, discountType, discountValue, minOrderValue || 0, maxUses || null, expiresAt || null]
  );
  res.status(201).json({ success: true, coupon: result.rows[0] });
};

export const adminUpdateCoupon = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { isActive, discountValue, maxUses, expiresAt } = req.body;

  await query(
    `UPDATE coupons SET
       is_active = COALESCE($1, is_active),
       discount_value = COALESCE($2, discount_value),
       max_uses = COALESCE($3, max_uses),
       expires_at = COALESCE($4, expires_at)
     WHERE id = $5`,
    [isActive, discountValue, maxUses, expiresAt, id]
  );
  res.json({ success: true, message: 'Coupon updated' });
};

import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { requestRefillFromProvider } from '../services/providerService';
import { logger } from '../utils/logger';

interface OrderRow {
  id: string;
  user_id: string | null;
  service_id: string;
  service_name: string;
  platform: string;
  link: string;
  quantity: number;
  price: number;
  original_price: number | null;
  coupon_id: string | null;
  provider_order_id: string | null;
  status: string;
  start_count: number | null;
  remains: number | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

const isHqPremium365Service = (serviceName: string | null | undefined): boolean => {
  if (!serviceName) return false;
  const normalized = serviceName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  return (
    normalized.includes('HQ') &&
    normalized.includes('PREMIUM') &&
    normalized.includes('365') &&
    normalized.includes('DIAS')
  );
};

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const page = parseInt(String(req.query.page ?? '1'), 10);
  const limit = parseInt(String(req.query.limit ?? '10'), 10);
  const offset = (page - 1) * limit;

  const [orders, count] = await Promise.all([
    query<OrderRow>(
      `SELECT o.id, o.link, o.quantity, o.price, o.status,
              o.provider_order_id, o.start_count, o.remains,
              o.refill_requested_at,
              o.created_at, o.updated_at,
              s.name AS service_name, s.platform
       FROM orders o
       LEFT JOIN services s ON o.service_id = s.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) FROM orders WHERE user_id = $1',
      [userId]
    ),
  ]);

  res.json({
    success: true,
    orders: orders.rows,
    total: parseInt(count.rows[0]?.count ?? '0', 10),
    page,
    limit,
  });
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const whereClause = isAdmin ? 'WHERE o.id = $1' : 'WHERE o.id = $1 AND o.user_id = $2';
  const params = isAdmin ? [id] : [id, userId];

  const result = await query<OrderRow>(
    `SELECT o.*, s.name AS service_name, s.platform
     FROM orders o
     LEFT JOIN services s ON o.service_id = s.id
     ${whereClause}`,
    params
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }

  res.json({ success: true, order: result.rows[0] });
};

export const requestRefill = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  const result = await query<OrderRow & { provider_id: string | null; refill_requested_at: string | null }>(
    `SELECT o.id, o.status, o.provider_order_id, o.refill_requested_at,
            s.name AS service_name, s.provider_id
     FROM orders o
     LEFT JOIN services s ON o.service_id = s.id
     WHERE o.id = $1 AND o.user_id = $2`,
    [id, userId]
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }

  const order = result.rows[0];
  if (!['completed', 'partial'].includes(order.status)) {
    res.status(400).json({ success: false, message: 'Only completed or partial orders can be refilled' });
    return;
  }

  if (!isHqPremium365Service(order.service_name)) {
    res.status(403).json({
      success: false,
      message: 'La reposición gratuita solo está disponible para el paquete HQ PREMIUM 365 DÍAS.',
    });
    return;
  }

  if (!order.provider_id || !order.provider_order_id) {
    res.status(400).json({
      success: false,
      message: 'Este pedido todavía no tiene un ID válido del proveedor para solicitar reposición.',
    });
    return;
  }

  try {
    const refill = await requestRefillFromProvider(order.provider_id, order.provider_order_id);

    await query(
      `UPDATE orders
       SET refill_requested_at = NOW(),
           status = 'processing',
           notes = CONCAT_WS(E'\n', notes, $2),
           updated_at = NOW()
       WHERE id = $1`,
      [id, `Refill requested at ${new Date().toISOString()} (provider refill ID: ${refill.refillId})`]
    );

    logger.info('Refill requested from provider', {
      orderId: id,
      userId,
      providerOrderId: order.provider_order_id,
      refillId: refill.refillId,
    });

    res.json({ success: true, message: 'Reposición solicitada correctamente al proveedor.' });
  } catch (err) {
    logger.warn('Provider refill request failed', { orderId: id, userId, error: String(err) });
    res.status(502).json({
      success: false,
      message: 'El proveedor no aceptó la reposición en este momento. Contactá soporte.',
    });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  const result = await query<OrderRow>(
    'SELECT id, status, price, user_id FROM orders WHERE id = $1 AND user_id = $2',
    [id, userId]
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: 'Order not found' });
    return;
  }

  const order = result.rows[0];
  if (!['pending', 'awaiting_payment'].includes(order.status)) {
    res.status(400).json({ success: false, message: 'This order cannot be cancelled' });
    return;
  }

  await query(
    `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
    [id]
  );

  // Devolver saldo si ya fue descontado (status 'pending' = ya pagado con balance)
  if (order.status === 'pending' && order.price > 0 && order.user_id) {
    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [order.price, order.user_id]);
    logger.info('Balance refunded on cancel', { orderId: id, amount: order.price, userId });
  }

  res.json({ success: true, message: 'Order cancelled successfully' });
};

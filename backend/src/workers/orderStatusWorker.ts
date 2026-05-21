import cron from 'node-cron';
import { query } from '../config/database';
import { getBulkOrderStatus, normalizeProviderStatus } from '../services/providerService';
import { sendOrderStatusUpdate } from '../services/emailService';
import { logger } from '../utils/logger';

interface PendingOrder {
  id: string;
  provider_order_id: string;
  provider_id: string;
  status: string;
  email: string | null;
  user_name: string | null;
  user_id: string | null;
  price: number;
  start_count: number | null;
  remains: number | null;
}

const REFUND_STATUSES = new Set(['failed', 'cancelled', 'refunded']);

const TERMINAL_STATUSES = new Set(['completed', 'partial', 'failed', 'refunded', 'cancelled']);

const checkOrderStatuses = async (): Promise<void> => {
  logger.debug('Order status worker: checking pending orders...');

  const result = await query<PendingOrder>(
    `SELECT o.id, o.provider_order_id, o.status, o.email, o.start_count, o.remains,
            o.user_id, o.price,
            s.provider_id,
            u.name AS user_name
     FROM orders o
     LEFT JOIN services s ON o.service_id = s.id
     LEFT JOIN users u ON o.user_id = u.id
     WHERE o.status IN ('processing', 'in_progress')
       AND o.provider_order_id IS NOT NULL
     LIMIT 100`
  );

  if (!result.rows.length) {
    logger.debug('Order status worker: no pending orders');
    return;
  }

  logger.info(`Order status worker: checking ${result.rows.length} orders`);

  // Group orders by provider to use bulk status API
  const byProvider = result.rows.reduce<Record<string, PendingOrder[]>>((acc, o) => {
    if (!acc[o.provider_id]) acc[o.provider_id] = [];
    acc[o.provider_id].push(o);
    return acc;
  }, {});

  for (const [providerId, orders] of Object.entries(byProvider)) {
    try {
      const ids = orders.map((o) => o.provider_order_id);
      const bulkStatus = await getBulkOrderStatus(providerId, ids);

      for (const order of orders) {
        const providerStatus = bulkStatus[order.provider_order_id];
        if (!providerStatus || providerStatus.error) continue;

        const normalizedStatus = normalizeProviderStatus(providerStatus.status);
        const hasStatusChange = normalizedStatus !== order.status;
        const hasCountChange =
          (providerStatus.start_count !== undefined && Number(providerStatus.start_count) !== order.start_count) ||
          (providerStatus.remains !== undefined && Number(providerStatus.remains) !== order.remains);

        if (hasStatusChange || hasCountChange) {
          await query(
            `UPDATE orders
             SET status = $1,
                 start_count = COALESCE($2, start_count),
                 remains = COALESCE($3, remains),
                 updated_at = NOW()
             WHERE id = $4`,
            [
              normalizedStatus,
              providerStatus.start_count != null ? Number(providerStatus.start_count) : null,
              providerStatus.remains != null ? Number(providerStatus.remains) : null,
              order.id,
            ]
          );

          // Devolver saldo si el proveedor cancela/falla el pedido
          if (hasStatusChange && REFUND_STATUSES.has(normalizedStatus) && order.user_id && order.price > 0) {
            await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [order.price, order.user_id]);
            logger.info('Balance auto-refunded by provider status', { orderId: order.id, amount: order.price, status: normalizedStatus });
          }

          if (hasStatusChange && TERMINAL_STATUSES.has(normalizedStatus) && order.email) {
            sendOrderStatusUpdate(
              order.email,
              order.user_name ?? 'Customer',
              order.id,
              normalizedStatus
            ).catch(() => {});
          }

          logger.info('Order status updated', { orderId: order.id, from: order.status, to: normalizedStatus });
        }
      }
    } catch (err) {
      logger.warn(`Failed bulk status check for provider ${providerId}`, { error: String(err) });
    }
  }
};

export const startOrderStatusWorker = (): void => {
  logger.info('Starting order status background worker (every 60s)');
  cron.schedule('*/60 * * * * *', async () => {
    try {
      await checkOrderStatuses();
    } catch (err) {
      logger.error('Order status worker error', { error: err });
    }
  });
};

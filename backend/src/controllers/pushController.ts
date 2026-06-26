import { Request, Response } from 'express';
import { query } from '../config/database';
import { getVapidPublicKey } from '../services/pushService';
import { logger } from '../utils/logger';

/** GET /api/push/vapid-key — returns public VAPID key to clients */
export const getVapidKey = (_req: Request, res: Response): void => {
  res.json({ success: true, publicKey: getVapidPublicKey() });
};

/** POST /api/push/subscribe — save a push subscription */
export const subscribePush = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ success: false, message: 'Invalid subscription object' });
    return;
  }

  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4`,
    [userId, endpoint, keys.p256dh, keys.auth]
  );

  logger.info('Push subscription saved', { userId });
  res.json({ success: true, message: 'Suscrito a notificaciones' });
};

/** DELETE /api/push/unsubscribe — remove a push subscription */
export const unsubscribePush = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id;
  const { endpoint } = req.body;

  if (!endpoint) {
    res.status(400).json({ success: false, message: 'endpoint required' });
    return;
  }

  await query(
    'DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2',
    [endpoint, userId]
  );

  res.json({ success: true, message: 'Desuscripto de notificaciones' });
};

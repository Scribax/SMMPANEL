import webpush from 'web-push';
import { query } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Configure VAPID details once
webpush.setVapidDetails(
  env.VAPID_EMAIL,
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY
);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to all subscriptions of a user.
 * Silently removes expired/invalid subscriptions.
 */
export const sendPushToUser = async (
  userId: string,
  payload: PushPayload
): Promise<void> => {
  const result = await query<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );

  if (!result.rows.length) return;

  const payloadStr = JSON.stringify(payload);

  for (const sub of result.rows) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payloadStr
      );
    } catch (err: any) {
      // 410 Gone or 404 Not Found = subscription expired
      if (err.statusCode === 410 || err.statusCode === 404) {
        await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
        logger.info('Removed expired push subscription', { subId: sub.id });
      } else {
        logger.warn('Push notification failed', { subId: sub.id, error: String(err) });
      }
    }
  }
};

/**
 * Get the VAPID public key to send to clients.
 */
export const getVapidPublicKey = (): string => env.VAPID_PUBLIC_KEY;

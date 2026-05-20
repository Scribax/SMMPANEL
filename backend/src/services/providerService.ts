import axios from 'axios';
import { query } from '../config/database';
import { decrypt } from './encryptionService';
import { logger } from '../utils/logger';

export interface ProviderOrderRequest {
  providerId: string;
  serviceId: number;
  link: string;
  quantity: number;
}

export interface ProviderOrderResult {
  orderId: string | number;
}

export interface ProviderOrderStatus {
  status: string;
  start_count?: number;
  remains?: number;
  charge?: number;
  error?: string;
}

export interface ProviderBulkStatus {
  [orderId: string]: ProviderOrderStatus;
}

export interface ProviderService {
  service: number;
  name: string;
  rate: string;
  min: string;
  max: string;
  category: string;
  type: string;
  description?: string;
  refill: boolean;
  cancel: boolean;
}

interface ProviderRow {
  api_url: string;
  api_key_enc: string;
}

export const sendOrderToProvider = async (
  req: ProviderOrderRequest
): Promise<ProviderOrderResult> => {
  const result = await query<ProviderRow>(
    'SELECT api_url, api_key_enc FROM providers WHERE id = $1 AND is_active = true',
    [req.providerId]
  );

  if (!result.rows.length) {
    throw new Error(`Provider ${req.providerId} not found or inactive`);
  }

  const { api_url, api_key_enc } = result.rows[0];
  const apiKey = decrypt(api_key_enc);

  const params = new URLSearchParams({
    key: apiKey,
    action: 'add',
    service: String(req.serviceId),
    link: req.link,
    quantity: String(req.quantity),
  });

  logger.info(`Sending order to provider ${req.providerId}`, {
    service: req.serviceId,
    quantity: req.quantity,
  });

  const response = await axios.post<{ order: string | number; error?: string }>(
    api_url,
    params.toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    }
  );

  if (response.data.error) {
    throw new Error(`Provider error: ${response.data.error}`);
  }

  if (!response.data.order) {
    throw new Error('Provider returned no order ID');
  }

  return { orderId: response.data.order };
};

export const getOrderStatus = async (
  providerId: string,
  providerOrderId: string
): Promise<ProviderOrderStatus> => {
  const result = await query<ProviderRow>(
    'SELECT api_url, api_key_enc FROM providers WHERE id = $1 AND is_active = true',
    [providerId]
  );

  if (!result.rows.length) {
    throw new Error(`Provider ${providerId} not found`);
  }

  const { api_url, api_key_enc } = result.rows[0];
  const apiKey = decrypt(api_key_enc);

  const params = new URLSearchParams({
    key: apiKey,
    action: 'status',
    order: providerOrderId,
  });

  const response = await axios.post<ProviderOrderStatus>(
    api_url,
    params.toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    }
  );

  return response.data;
};

const STATUS_MAP: Record<string, string> = {
  Pending: 'processing',
  'In progress': 'in_progress',
  Processing: 'processing',
  Completed: 'completed',
  Partial: 'partial',
  Canceled: 'failed',
  Cancelled: 'failed',
  Error: 'failed',
};

export const normalizeProviderStatus = (providerStatus: string): string => {
  return STATUS_MAP[providerStatus] ?? 'processing';
};

export const getBulkOrderStatus = async (
  providerId: string,
  providerOrderIds: string[]
): Promise<ProviderBulkStatus> => {
  const result = await query<ProviderRow>(
    'SELECT api_url, api_key_enc FROM providers WHERE id = $1 AND is_active = true',
    [providerId]
  );

  if (!result.rows.length) throw new Error(`Provider ${providerId} not found`);

  const { api_url, api_key_enc } = result.rows[0];
  const apiKey = decrypt(api_key_enc);

  const params = new URLSearchParams({
    key: apiKey,
    action: 'status',
    orders: providerOrderIds.join(','),
  });

  const response = await axios.post<ProviderBulkStatus>(
    api_url,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
  );

  return response.data;
};

export const requestRefillFromProvider = async (
  providerId: string,
  providerOrderId: string
): Promise<{ refillId: string | number }> => {
  const result = await query<ProviderRow>(
    'SELECT api_url, api_key_enc FROM providers WHERE id = $1 AND is_active = true',
    [providerId]
  );

  if (!result.rows.length) throw new Error(`Provider ${providerId} not found`);

  const { api_url, api_key_enc } = result.rows[0];
  const apiKey = decrypt(api_key_enc);

  const params = new URLSearchParams({ key: apiKey, action: 'refill', order: providerOrderId });

  const response = await axios.post<{ refill?: string | number; error?: string }>(
    api_url,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
  );

  if (response.data.error) throw new Error(response.data.error);
  return { refillId: response.data.refill! };
};

export const getProviderServices = async (
  providerId: string
): Promise<ProviderService[]> => {
  const result = await query<ProviderRow>(
    'SELECT api_url, api_key_enc FROM providers WHERE id = $1 AND is_active = true',
    [providerId]
  );

  if (!result.rows.length) throw new Error(`Provider ${providerId} not found`);

  const { api_url, api_key_enc } = result.rows[0];
  const apiKey = decrypt(api_key_enc);

  const params = new URLSearchParams({ key: apiKey, action: 'services' });

  const response = await axios.post<ProviderService[]>(
    api_url,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
  );

  return response.data;
};

export const getProviderBalance = async (
  providerId: string
): Promise<{ balance: string; currency: string }> => {
  const result = await query<ProviderRow>(
    'SELECT api_url, api_key_enc FROM providers WHERE id = $1 AND is_active = true',
    [providerId]
  );

  if (!result.rows.length) throw new Error(`Provider ${providerId} not found`);

  const { api_url, api_key_enc } = result.rows[0];
  const apiKey = decrypt(api_key_enc);

  const params = new URLSearchParams({ key: apiKey, action: 'balance' });

  const response = await axios.post<{ balance: string; currency: string }>(
    api_url,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
  );

  return response.data;
};

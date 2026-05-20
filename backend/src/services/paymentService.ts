import MercadoPagoConfig, { Preference, Payment } from 'mercadopago';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const mpClient = new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN });
const preference = new Preference(mpClient);
const payment = new Payment(mpClient);

export interface CreatePreferenceOptions {
  orderId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  payerEmail: string;
  payerName: string;
}

export interface PreferenceResult {
  id: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export const createPaymentPreference = async (
  opts: CreatePreferenceOptions
): Promise<PreferenceResult> => {
  logger.info('Creating MercadoPago preference', { orderId: opts.orderId });

  const result = await preference.create({
    body: {
      items: [
        {
          id: opts.orderId,
          title: opts.title,
          quantity: 1,
          unit_price: opts.unitPrice,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: opts.payerEmail,
        name: opts.payerName,
      },
      external_reference: opts.orderId,
      back_urls: {
        success: `${env.FRONTEND_URL}/payment/success`,
        failure: `${env.FRONTEND_URL}/payment/failure`,
        pending: `${env.FRONTEND_URL}/payment/pending`,
      },
      auto_return: 'approved',
      notification_url: env.MP_WEBHOOK_URL || `${env.FRONTEND_URL}/api/payments/webhook`,
      statement_descriptor: 'BOOSTINS',
    },
  });

  return {
    id: result.id!,
    initPoint: result.init_point!,
    sandboxInitPoint: result.sandbox_init_point!,
  };
};

export const getPaymentDetails = async (paymentId: string) => {
  try {
    const result = await payment.get({ id: paymentId });
    return result;
  } catch (err) {
    logger.error('Failed to fetch MercadoPago payment', { paymentId, error: err });
    throw err;
  }
};

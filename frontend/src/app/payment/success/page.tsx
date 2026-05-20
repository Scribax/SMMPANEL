'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Package, ArrowRight, Loader2 } from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import { formatCurrency, STATUS_LABELS } from '@/lib/utils';

function PaymentSuccessContent() {
  const params = useSearchParams();
  const externalRef = params.get('external_reference') ?? '';
  const paymentId = params.get('payment_id') ?? params.get('collection_id') ?? '';
  const orderId = params.get('order_id') ?? externalRef;
  const isDeposit = externalRef.startsWith('deposit_');
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositCredited, setDepositCredited] = useState(false);

  useEffect(() => {
    if (isDeposit && paymentId) {
      paymentsApi.verifyDeposit(paymentId)
        .then(() => setDepositCredited(true))
        .catch(() => {})
        .finally(() => setLoading(false));
      return;
    }
    if (!orderId) { setLoading(false); return; }
    const fetch = () => {
      paymentsApi.getStatus(orderId)
        .then((res) => setOrder(res.data.order ?? null))
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    fetch();
    const timer = setTimeout(fetch, 3000);
    return () => clearTimeout(timer);
  }, [orderId, isDeposit, paymentId]);

  return (
    <div className="min-h-screen bg-dark-300 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-lg w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 mb-8"
        >
          <CheckCircle className="w-12 h-12 text-green-400" />
        </motion.div>

        <h1 className="text-4xl font-black text-white mb-3">¡Pago confirmado!</h1>
        <p className="text-slate-400 text-lg mb-8">
          Tu pedido fue recibido y está siendo procesado. Recibirás una actualización por email en breve.
        </p>

        {loading ? (
          <div className="glass-card p-6 mb-8 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
            <span className="text-slate-400">{isDeposit ? 'Acreditando saldo...' : 'Cargando detalles del pedido...'}</span>
          </div>
        ) : isDeposit ? (
          <div className="glass-card p-6 mb-8 text-center">
            <p className="text-green-400 font-semibold text-lg">
              {depositCredited ? '¡Saldo acreditado en tu cuenta!' : 'El saldo será acreditado en breve.'}
            </p>
          </div>
        ) : order ? (
          <div className="glass-card p-6 mb-8 text-left space-y-3">
            <h3 className="text-white font-semibold mb-4">Detalle del pedido</h3>
            {[
              { label: 'ID del pedido', value: String(order.id ?? '').slice(0, 8) + '...' },
              { label: 'Servicio', value: String(order.service_name ?? '') },
              { label: 'Cantidad', value: Number(order.quantity ?? 0).toLocaleString() },
              { label: 'Total pagado', value: formatCurrency(Number(order.price ?? 0)) },
              { label: 'Estado', value: STATUS_LABELS[String(order.status ?? '') as keyof typeof STATUS_LABELS] ?? String(order.status ?? '') },
            ].map((item) => (
              <div key={item.label} className="flex justify-between py-2 border-b border-white/[0.04]">
                <span className="text-slate-400 text-sm">{item.label}</span>
                <span className="text-white text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="btn-primary flex items-center justify-center gap-2">
            <Package className="w-4 h-4" /> Ver mis pedidos
          </Link>
          <Link href="/order" className="btn-secondary flex items-center justify-center gap-2">
            Nuevo pedido <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-300 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

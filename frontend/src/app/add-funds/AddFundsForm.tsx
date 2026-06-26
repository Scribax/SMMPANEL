'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Wallet, CreditCard, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { paymentsApi } from '@/lib/api';
import { getStoredUser, isAuthenticated } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';

const PRESETS = [500, 1000, 2000, 5000, 10000];

function safeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

function AddFundsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [amount, setAmount] = useState<number>(0);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const draftKey = 'followarg_add_funds_amount';
  const redirectTo = safeRedirect(searchParams.get('redirect'));

  useEffect(() => {
    if (!isAuthenticated()) {
      const query = searchParams.toString();
      const currentPath = `/add-funds${query ? `?${query}` : ''}`;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    const u = getStoredUser();
    setBalance(parseFloat(String(u?.balance ?? 0)));
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (saved) {
        setCustom(saved);
        setAmount(0);
      }
    } catch {
      /* ignore storage issues */
    }
    const suggested = parseInt(searchParams.get('amount') ?? '0', 10);
    if (suggested >= 100) {
      const preset = PRESETS.find((p) => p >= suggested) ?? suggested;
      setAmount(preset);
    } else {
      setAmount(PRESETS[1]);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(draftKey, custom);
    } catch {
      /* ignore storage issues */
    }
  }, [custom]);

  const displayAmount = amount || parseInt(custom || '0', 10);

  const handleDeposit = async () => {
    if (!displayAmount || displayAmount < 100) {
      toast.error('El monto mínimo es $100 ARS');
      return;
    }
    setLoading(true);
    try {
      const res = await paymentsApi.createDeposit(displayAmount);
      window.location.href = res.data.initPoint;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al procesar';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-300">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-lg mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-8"
          >
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
            <h1 className="text-3xl font-black text-white mb-2">
              Cargar <span className="text-gradient">Saldo</span>
            </h1>
            <p className="text-slate-400 text-sm">
              Acreditá saldo a tu cuenta vía MercadoPago para pagar servicios.
            </p>
          </motion.div>

          {/* Current balance card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-card p-5 mb-4 flex items-center gap-4 bg-gradient-to-r from-primary-500/10 to-purple-500/10 border-primary-500/20"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold leading-none mb-1.5">Saldo disponible</p>
              <p className="text-2xl font-black text-white leading-none">{formatCurrency(balance)}</p>
            </div>
          </motion.div>

          {/* Select amount */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-card p-5 sm:p-6 mb-4 bg-dark-200"
          >
            <h2 className="text-white font-bold text-base mb-4">¿Cuánto querés cargar?</h2>
            
            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setAmount(p);
                    setCustom('');
                  }}
                  className={`rounded-xl py-3 text-center border transition-all text-sm font-bold min-h-[44px] ${
                    amount === p && !custom
                      ? 'border-primary-500 bg-primary-500/20 text-primary-300 shadow-md shadow-primary-500/10'
                      : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  ${p.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="border-t border-white/[0.06] pt-4">
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                O ingresá un monto personalizado (mín. $100 ARS)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={custom}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setCustom(val);
                    setAmount(0);
                  }}
                  placeholder="Ej: 3500"
                  className="input-field pl-7 py-3 text-sm"
                />
              </div>
            </div>
          </motion.div>

          {/* Checkout summary */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-card p-5 sm:p-6 bg-dark-200"
          >
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="text-slate-400">Vas a acreditar</span>
              <span className="text-white font-bold text-lg">
                {displayAmount ? `$${displayAmount.toLocaleString()} ARS` : '—'}
              </span>
            </div>
            
            <div className="flex justify-between items-center mb-5 text-xs text-slate-500 border-b border-white/[0.06] pb-3">
              <span>Saldo resultante</span>
              <span className="text-green-400 font-semibold">
                {displayAmount ? formatCurrency(balance + displayAmount) : formatCurrency(balance)}
              </span>
            </div>

            <button
              onClick={handleDeposit}
              disabled={loading || !displayAmount || displayAmount < 100}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base font-semibold disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" /> Pagar con MercadoPago
                </>
              )}
            </button>

            <div className="mt-5 space-y-2.5">
              {[
                'El saldo se acredita automáticamente al confirmar el pago.',
                'Podés usar tu saldo para pagar cualquier servicio.'
              ].map((t) => (
                <p key={t} className="flex items-start gap-2 text-xs text-slate-500 leading-snug">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                  {t}
                </p>
              ))}
            </div>

            {redirectTo && (
              <button
                onClick={() => router.push(redirectTo)}
                className="mt-5 w-full text-sm text-slate-400 hover:text-white transition-colors pt-4 border-t border-white/[0.06] font-semibold"
              >
                Volver al pedido
              </button>
            )}
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function AddFundsForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-300 px-4 py-10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    }>
      <AddFundsContent />
    </Suspense>
  );
}

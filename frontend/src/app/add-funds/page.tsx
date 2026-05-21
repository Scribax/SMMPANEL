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

function AddFundsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [amount, setAmount] = useState<number>(0);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login?redirect=/add-funds');
      return;
    }
    const u = getStoredUser();
    setBalance(parseFloat(String(u?.balance ?? 0)));

    const suggested = parseInt(searchParams.get('amount') ?? '0', 10);
    if (suggested >= 100) {
      const preset = PRESETS.find((p) => p >= suggested) ?? suggested;
      setAmount(preset);
    } else {
      setAmount(PRESETS[1]);
    }
  }, []);

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

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <button onClick={() => router.back()} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
            <h1 className="text-3xl font-black text-white mb-2">Cargar <span className="gradient-text">Saldo</span></h1>
            <p className="text-slate-400 text-sm">Acreditá saldo a tu cuenta vía MercadoPago para pagar servicios.</p>
          </motion.div>

          {/* Current balance */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="glass-card p-5 mb-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Saldo actual</p>
              <p className="text-xl font-black text-white">{formatCurrency(balance)}</p>
            </div>
          </motion.div>

          {/* Amount selector */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card p-6 mb-4"
          >
            <h2 className="text-white font-bold mb-4">¿Cuánto querés cargar?</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setAmount(p); setCustom(''); }}
                  className={`rounded-xl p-3 text-center border transition-all text-sm font-bold ${
                    amount === p && !custom
                      ? 'border-primary-500 bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/40'
                      : 'border-white/10 bg-white/5 text-white hover:border-primary-500/40 hover:bg-primary-500/10'
                  }`}
                >
                  ${p.toLocaleString()}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">O ingresá un monto personalizado (mín. $100 ARS)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min={100}
                  value={custom}
                  onChange={(e) => { setCustom(e.target.value); setAmount(0); }}
                  placeholder="Ej: 3500"
                  className="input-field pl-7"
                />
              </div>
            </div>
          </motion.div>

          {/* Summary + button */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass-card p-6"
          >
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="text-slate-400">Vas a acreditar</span>
              <span className="text-white font-bold text-lg">{displayAmount ? `$${displayAmount.toLocaleString()} ARS` : '—'}</span>
            </div>
            <div className="flex justify-between items-center mb-5 text-xs text-slate-500">
              <span>Saldo resultante</span>
              <span className="text-green-400 font-semibold">{displayAmount ? formatCurrency(balance + displayAmount) : formatCurrency(balance)}</span>
            </div>

            <button
              onClick={handleDeposit}
              disabled={loading || !displayAmount || displayAmount < 100}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50"
            >
              {loading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <><CreditCard className="w-5 h-5" /> Pagar con MercadoPago</>
              }
            </button>

            <div className="mt-4 space-y-2">
              {['El saldo se acredita automáticamente al confirmar el pago.', 'Podés usar tu saldo para pagar cualquier servicio.'].map((t) => (
                <p key={t} className="flex items-start gap-2 text-xs text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />{t}
                </p>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function AddFundsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-300 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AddFundsContent />
    </Suspense>
  );
}

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { XCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function PaymentFailurePage() {
  return (
    <div className="min-h-screen bg-dark-300 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-lg w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 mb-8"
        >
          <XCircle className="w-12 h-12 text-red-400" />
        </motion.div>

        <h1 className="text-4xl font-black text-white mb-3">Pago fallido</h1>
        <p className="text-slate-400 text-lg mb-8">
          No se pudo procesar el pago. No se realizó ningún cargo.
          Intentá de nuevo o contactá soporte.
        </p>

        <div className="glass-card p-6 mb-8 text-left">
          <h3 className="text-white font-semibold mb-3">Posibles causas:</h3>
          <ul className="space-y-2 text-slate-400 text-sm">
            {[
              'Saldo insuficiente en tu cuenta',
              'Tarjeta rechazada por el banco',
              'Sesión de pago expirada (más de 30 min)',
              'Conexión interrumpida durante el pago',
            ].map((reason) => (
              <li key={reason} className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/order" className="btn-primary flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Intentar de nuevo
          </Link>
          <Link href="/" className="btn-secondary flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

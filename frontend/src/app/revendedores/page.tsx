"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgePercent,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const BENEFITS = [
  "Precios mayoristas con descuento aprobado por el equipo.",
  "Pedidos ilimitados para tus clientes desde la misma cuenta.",
  "Pago con saldo prepago para operar rápido y sin esperas.",
  "Historial, estados y recargas desde tu panel.",
];

const STEPS = [
  {
    title: "Creá tu cuenta",
    text: "Registrate con tus datos reales para que podamos identificar tu solicitud.",
  },
  {
    title: "Solicitá aprobación",
    text: "Escribinos desde soporte o por el canal comercial indicando que querés vender nuestros servicios.",
  },
  {
    title: "Cargá saldo inicial",
    text: "La cuenta revendedor se desbloquea con una carga aprobada mínima de $5.000 ARS.",
  },
  {
    title: "Empezá a operar",
    text: "Cuando esté activa, tus pedidos toman el descuento reseller automáticamente.",
  },
];

export default function RevendedoresPage() {
  return (
    <div className="min-h-screen bg-dark-300">
      <Navbar />

      <main className="pt-24 pb-16">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="inline-flex items-center gap-2 glass-card px-3 py-2 mb-6 border-primary-500/30">
                <BadgePercent className="w-4 h-4 text-primary-400" />
                <span className="text-xs sm:text-sm text-primary-300 font-semibold">
                  Programa para revendedores
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
                ¿Querés ser <span className="gradient-text">reseller</span>?
              </h1>
              <p className="text-slate-400 text-sm sm:text-lg leading-relaxed max-w-2xl mb-8">
                Accedé a precios mayoristas para vender servicios de crecimiento
                en redes a tus propios clientes. La cuenta requiere aprobación
                manual y una carga inicial mínima de $5.000 ARS.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register?reseller=true"
                  className="btn-primary flex items-center justify-center gap-2 px-6 py-3"
                >
                  <Zap className="w-4 h-4" /> Crear cuenta
                </Link>
                <Link
                  href="/dashboard/tickets"
                  className="btn-secondary flex items-center justify-center gap-2 px-6 py-3"
                >
                  Solicitar aprobación <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              className="glass-card p-5 sm:p-7 border-primary-500/20"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                  <Wallet className="w-5 h-5 text-green-400 mb-3" />
                  <div className="text-white font-bold">$5.000</div>
                  <div className="text-slate-500 text-xs">carga mínima</div>
                </div>
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                  <BadgePercent className="w-5 h-5 text-primary-400 mb-3" />
                  <div className="text-white font-bold">Descuento</div>
                  <div className="text-slate-500 text-xs">configurable</div>
                </div>
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                  <ShieldCheck className="w-5 h-5 text-blue-400 mb-3" />
                  <div className="text-white font-bold">Manual</div>
                  <div className="text-slate-500 text-xs">aprobación</div>
                </div>
              </div>

              <div className="space-y-3">
                {BENEFITS.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {benefit}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {STEPS.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="glass-card p-5"
              >
                <div className="text-primary-400/50 text-3xl font-black mb-4">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h2 className="text-white font-bold mb-2">{step.title}</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {step.text}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

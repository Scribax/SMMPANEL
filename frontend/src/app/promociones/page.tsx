"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Clock,
  Instagram,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PROMO_ORDER_HREF = "/order?platform=instagram&category=followers";

const PROMO_STEPS = [
  "Elegís la promo de seguidores Instagram.",
  "Ingresás tu @usuario o link del perfil público.",
  "Cargas saldo con MercadoPago y el pedido queda confirmado.",
];

const PROMO_BENEFITS = [
  { label: "Sin contraseña", icon: ShieldCheck },
  { label: "Perfil público", icon: Instagram },
  { label: "Entrega progresiva", icon: Clock },
  { label: "Saldo seguro", icon: Wallet },
];

const PROMO_PACKS = [
  {
    name: "Impulso Inicial",
    amount: "1.000",
    description: "Para cuentas que quieren verse más activas rápido.",
  },
  {
    name: "Crecimiento Pro",
    amount: "5.000",
    description: "El pack recomendado para campañas y perfiles comerciales.",
    featured: true,
  },
  {
    name: "Alcance Fuerte",
    amount: "10.000",
    description: "Para acelerar autoridad visual en lanzamientos o perfiles nuevos.",
  },
];

export default function PromocionesPage() {
  return (
    <div className="min-h-screen bg-dark-300">
      <Navbar />

      <main className="pt-24 pb-16 sm:pt-28 sm:pb-24">
        <section className="relative overflow-hidden border-b border-white/[0.06] pb-16 sm:pb-20">
          <div className="absolute inset-0 bg-grid opacity-25" />
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-pink-500/10 via-primary-500/10 to-transparent" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-[1.02fr_0.98fr] gap-8 lg:gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
              >
                <span className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-6 border-amber-400/30 text-sm text-amber-200 font-semibold">
                  <BadgePercent className="w-4 h-4" /> PROMOCIONES ACTIVAS
                </span>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
                  Packs especiales de{" "}
                  <span className="bg-gradient-to-r from-pink-300 via-amber-200 to-emerald-300 bg-clip-text text-transparent">
                    seguidores Instagram
                  </span>
                </h1>

                <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mb-8">
                  Un apartado directo para vender la promoción de seguidores:
                  mostramos la creatividad, explicamos como se entrega y llevamos
                  al cliente al pedido ya filtrado en Instagram seguidores.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                  <Link
                    href={PROMO_ORDER_HREF}
                    className="btn-primary text-base px-8 py-4 flex items-center justify-center gap-2"
                  >
                    Comprar promoción <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/precios"
                    className="btn-secondary text-base px-8 py-4 flex items-center justify-center gap-2"
                  >
                    Ver catálogo completo
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PROMO_BENEFITS.map((benefit) => (
                    <div
                      key={benefit.label}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-center"
                    >
                      <benefit.icon className="w-5 h-5 mx-auto mb-2 text-emerald-300" />
                      <div className="text-xs font-semibold text-slate-200 leading-snug">
                        {benefit.label}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.08 }}
                className="relative"
              >
                <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-br from-pink-500/50 via-amber-400/35 to-emerald-400/35 blur-xl opacity-60" />
                <div className="relative overflow-hidden rounded-[24px] border border-white/[0.12] bg-white/[0.04] shadow-2xl shadow-black/40">
                  <Image
                    src="/seguidores.png"
                    alt="Promocion de seguidores Instagram"
                    width={1200}
                    height={900}
                    priority
                    className="w-full h-auto object-contain bg-black/20"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-10 items-start">
              <div>
                <span className="inline-flex items-center gap-2 text-emerald-300 text-sm font-semibold mb-3">
                  <Sparkles className="w-4 h-4" /> Como ofrecerla
                </span>
                <h2 className="section-title mb-4">
                  La promo entra como una compra rápida, sin explicar de más.
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
                  La mejor forma es venderla como pack cerrado de seguidores,
                  con CTA directo al formulario. El cliente solo elige el
                  servicio prefiltrado, pega su usuario y paga con saldo.
                </p>

                <div className="space-y-3">
                  {PROMO_STEPS.map((step, index) => (
                    <div
                      key={step}
                      className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                    >
                      <div className="w-8 h-8 rounded-xl bg-primary-500/20 text-primary-200 flex items-center justify-center text-sm font-black shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed pt-1">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {PROMO_PACKS.map((pack) => (
                  <Link
                    key={pack.name}
                    href={PROMO_ORDER_HREF}
                    className={`group rounded-2xl border p-5 transition-all hover:-translate-y-1 ${
                      pack.featured
                        ? "border-amber-300/45 bg-amber-300/[0.08] shadow-xl shadow-amber-500/10"
                        : "border-white/[0.08] bg-white/[0.03] hover:border-primary-400/35"
                    }`}
                  >
                    {pack.featured && (
                      <span className="mb-4 inline-flex items-center rounded-full bg-amber-300/15 border border-amber-300/25 px-3 py-1 text-[11px] font-bold text-amber-200">
                        RECOMENDADO
                      </span>
                    )}
                    <Users className="w-8 h-8 text-pink-300 mb-4" />
                    <h3 className="text-white font-bold text-base mb-1">
                      {pack.name}
                    </h3>
                    <div className="text-3xl font-black text-white mb-3">
                      {pack.amount}
                      <span className="text-sm font-semibold text-slate-400 ml-1">
                        seguidores
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed mb-5">
                      {pack.description}
                    </p>
                    <div className="flex items-center gap-2 text-primary-300 text-sm font-semibold">
                      Pedir ahora <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pb-6">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-white font-bold mb-1">
                      Lista para conectar con los IDs de SMMEngineer
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Hoy apunta al primer servicio de Instagram seguidores del
                      catálogo. Cuando pases los IDs exactos, dejamos cada pack
                      enlazado al servicio correspondiente.
                    </p>
                  </div>
                </div>
                <Link
                  href={PROMO_ORDER_HREF}
                  className="btn-primary shrink-0 flex items-center justify-center gap-2"
                >
                  Abrir pedido <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

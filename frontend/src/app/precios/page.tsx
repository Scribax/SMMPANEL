"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { servicesApi } from "@/lib/api";
import { Service } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

const PLATFORMS = [
  {
    id: "instagram",
    label: "Instagram",
    emoji: "📸",
    gradient: "from-pink-500 to-purple-600",
  },
  {
    id: "tiktok",
    label: "TikTok",
    emoji: "🎵",
    gradient: "from-slate-600 to-slate-800",
  },
  {
    id: "youtube",
    label: "YouTube",
    emoji: "▶️",
    gradient: "from-red-600 to-red-700",
  },
  {
    id: "discord",
    label: "Discord",
    emoji: "🎮",
    gradient: "from-indigo-500 to-purple-700",
  },
  {
    id: "telegram",
    label: "Telegram",
    emoji: "✈️",
    gradient: "from-sky-400 to-blue-600",
  },
];

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  followers: { label: "Seguidores", emoji: "👥" },
  likes: { label: "Likes", emoji: "❤️" },
  views: { label: "Vistas", emoji: "👁️" },
  comments: { label: "Comentarios", emoji: "💬" },
  boost: { label: "Server Boost", emoji: "🚀" },
  reactions: { label: "Reacciones", emoji: "🎉" },
};

const SAMPLE_QTYS = [100, 500, 1000, 5000, 10000];
const FEATURES = [
  "Entrega garantizada",
  "Garantía de reposición",
  "Soporte 7 días",
];

export default function PreciosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("instagram");

  useEffect(() => {
    servicesApi
      .getAll()
      .then((res) => setServices(res.data.services ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const platformServices = services.filter((s) => s.platform === active);
  const categories = [...new Set(platformServices.map((s) => s.category))];
  const availablePlatforms = [...new Set(services.map((s) => s.platform))];

  return (
    <div className="min-h-screen bg-dark-300">
      <Navbar />

      <div className="pt-24 pb-16">
        {/* Hero */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-6 border-primary-500/30 text-sm text-primary-300 font-medium">
              <Zap className="w-4 h-4" /> Sin cargos ocultos · Sin suscripciones
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
              Precios <span className="gradient-text">transparentes</span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
              Pagás exactamente lo que elegís. Cargá saldo y usalo en cualquier
              servicio, en cualquier momento.
            </p>
          </motion.div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Platform tabs */}
          <div className="flex gap-2 sm:gap-3 justify-center mb-10 flex-wrap">
            {PLATFORMS.filter((p) =>
              availablePlatforms.includes(p.id as Service["platform"]),
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setActive(p.id)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all ${
                  active === p.id
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                    : "glass-card text-slate-400 hover:text-white hover:border-primary-500/30"
                }`}
              >
                <span className="text-lg">{p.emoji}</span>
                {p.label}
              </button>
            ))}
          </div>

          {/* Cards */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass-card p-6 animate-pulse space-y-4">
                  <div className="h-6 bg-white/10 rounded w-32" />
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-10 bg-white/10 rounded-xl" />
                  ))}
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center text-slate-500 py-16">
              No hay servicios disponibles para esta plataforma.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories.map((cat, idx) => {
                const catServices = platformServices.filter(
                  (s) => s.category === cat,
                );
                const cheapest = catServices.reduce(
                  (min, s) => (s.price_per_unit < min.price_per_unit ? s : min),
                  catServices[0],
                );
                const meta = CATEGORY_LABELS[cat] ?? {
                  label: cat,
                  emoji: "⚡",
                };
                const qtys = SAMPLE_QTYS.filter(
                  (q) =>
                    q >= cheapest.min_quantity && q <= cheapest.max_quantity,
                ).slice(0, 5);
                const popularIdx = Math.floor(qtys.length / 2);

                return (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="glass-card p-6 flex flex-col"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-3xl">{meta.emoji}</span>
                      <div>
                        <h3 className="text-white font-bold text-lg">
                          {meta.label}
                        </h3>
                        <p className="text-slate-500 text-xs">
                          {catServices.length} opción
                          {catServices.length !== 1 ? "es" : ""} disponibles
                        </p>
                      </div>
                    </div>

                    {/* Pricing rows */}
                    <div className="space-y-2 mb-6 flex-1">
                      {qtys.map((qty, i) => {
                        const price = parseFloat(
                          (cheapest.price_per_unit * qty).toFixed(2),
                        );
                        const isPopular = i === popularIdx;
                        return (
                          <div
                            key={qty}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                              isPopular
                                ? "bg-primary-500/20 border border-primary-500/40"
                                : "bg-white/[0.03] border border-white/[0.06]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-semibold ${isPopular ? "text-primary-200" : "text-white"}`}
                              >
                                {formatNumber(qty)}
                              </span>
                              <span className="text-slate-500 text-xs">
                                {meta.label.toLowerCase()}
                              </span>
                              {isPopular && (
                                <span className="text-[9px] bg-primary-500/40 text-primary-200 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                  Popular
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-sm font-bold ${isPopular ? "text-primary-300" : "text-slate-300"}`}
                            >
                              {formatCurrency(price)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Features */}
                    <div className="space-y-1.5 mb-5">
                      {FEATURES.map((f) => (
                        <div
                          key={f}
                          className="flex items-center gap-2 text-xs text-slate-400"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          {f}
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        Entrega: {cheapest.delivery_speed}
                      </div>
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/order?platform=${active}&category=${cat}`}
                      className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-3"
                    >
                      Pedir {meta.label.toLowerCase()}{" "}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Bottom CTA */}
          <div className="mt-14 text-center glass-card p-8 sm:p-10 border-primary-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-glow opacity-50" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
                ¿Cómo funciona el pago?
              </h2>
              <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-6">
                Creás una cuenta gratis, cargás saldo vía{" "}
                <span className="text-white font-semibold">MercadoPago</span>{" "}
                (tarjeta, débito o transferencia) y lo usás para hacer pedidos
                al instante. Sin suscripciones.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/register"
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" /> Crear cuenta gratis
                </Link>
                <Link
                  href="/order"
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  Hacer un pedido <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

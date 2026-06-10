"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Zap,
  TrendingUp,
  Shield,
  Clock,
  Users,
  Heart,
  Eye,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  Play,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { servicesApi } from "@/lib/api";
import { Service } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

const STATS = [
  { label: "Entrega promedio", value: "< 1hr", icon: Zap },
  { label: "Plataformas", value: "5", icon: Users },
  { label: "Uptime del sistema", value: "99.9%", icon: Shield },
  { label: "Soporte disponible", value: "7 días", icon: Clock },
];

const FAQS = [
  {
    q: "¿Necesito darles mi contraseña?",
    a: "No. Nunca pedimos tu contraseña. Solo necesitamos el link de tu perfil o publicación. Tu cuenta está 100% segura.",
  },
  {
    q: "¿Cuánto tarda en llegar el pedido?",
    a: "La mayoría de los pedidos comienzan en menos de 1 hora. Los seguidores y suscriptores pueden tardar hasta 24hs según la cantidad.",
  },
  {
    q: "¿Los seguidores son reales?",
    a: "Trabajamos con proveedores que ofrecen cuentas reales con publicaciones activas y bajo drop. Tenemos opciones con reposición automática si alguno cae.",
  },
  {
    q: "¿Cómo pago?",
    a: "Cargás saldo en tu cuenta vía MercadoPago (tarjeta, débito o transferencia) y lo usás para hacer pedidos. Sin suscripciones ni cargos ocultos.",
  },
  {
    q: "¿Qué pasa si mi pedido no llega?",
    a: "Podés hacer seguimiento desde tu panel. Si hay algún problema, escribinos y lo resolvemos. Ofrecemos reposición o reembolso según el caso.",
  },
  {
    q: "¿Funciona para cuentas privadas?",
    a: "Para seguidores tu cuenta tiene que estar en público durante la entrega. Para likes y vistas podés tener la cuenta privada.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Elegí tu servicio",
    desc: "Explorá nuestro catálogo y elegí el servicio ideal para tu plataforma y objetivos.",
  },
  {
    step: "02",
    title: "Ingresá tus datos",
    desc: "Proporcioná tu usuario o link de publicación, seleccioná la cantidad e ingresá tu email.",
  },
  {
    step: "03",
    title: "Completá el pago",
    desc: "Pagá de forma segura vía MercadoPago — tarjeta de crédito, débito o transferencia.",
  },
  {
    step: "04",
    title: "Mirá crecer tu cuenta",
    desc: "Tu pedido comienza automáticamente. Seguí el progreso desde tu panel en tiempo real.",
  },
];

const TESTIMONIALS = [
  {
    name: "Pablo D.",
    location: "Buenos Aires",
    platform: "instagram",
    handle: "@pablodigitalpro",
    result: "+10.000 seguidores en 2 semanas",
    text: "El servicio es excelente, ojalá sigan por mucho tiempo. Compro los de 365 días porque quiero llegar a 100K para trabajar con marcas. Ya tengo una marca propia y por eso lo uso jeje. 100% recomendado.",
    rating: 5,
    avatar: "P",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    name: "Romina G.",
    location: "Rosario",
    platform: "instagram",
    handle: "@romi.estilo",
    result: "+3.500 seguidores en 10 días",
    text: "Al principio dudé bastante, pero una amiga me recomendó y me animé. Los seguidores llegaron rápido y el soporte me respondió cuando tuve una duda. Lo volvería a usar sin pensarlo.",
    rating: 5,
    avatar: "R",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    name: "Nico V.",
    location: "Córdoba",
    platform: "tiktok",
    handle: "@nicovid_ok",
    result: "+20.000 vistas en 3 videos",
    text: "Compré vistas para unos videos que tenía parados y empezaron a moverse solos después. No sé si es el algoritmo o qué, pero funcionó. Precio muy accesible para lo que da.",
    rating: 5,
    avatar: "N",
    gradient: "from-slate-500 to-slate-700",
  },
];

function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      setCount(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {formatNumber(count)}
      {suffix}
    </span>
  );
}

export default function HomePage() {
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);

  useEffect(() => {
    servicesApi
      .getAll()
      .then((res) => {
        setFeaturedServices(res.data.services?.slice(0, 3) ?? []);
      })
      .catch(() => {});
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-dark-300">
      <Navbar />

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background elements */}
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[250px] h-[250px] bg-primary-600/8 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-8 border-primary-500/30"
          >
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-primary-300 font-medium">
              Entrega rápida · Pagos seguros · Soporte disponible
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6"
          >
            Impulsá tu <span className="text-gradient">Presencia Digital</span>
            <br />
            al Instante
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Seguidores, likes y vistas reales para Instagram, TikTok y YouTube.
            Entrega rápida, pagos seguros y soporte disponible.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/order"
              className="btn-primary text-base px-8 py-4 flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Empezar ahora
            </Link>
            <Link
              href="/order"
              className="btn-secondary text-base px-8 py-4 flex items-center gap-2"
            >
              Ver servicios <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-6"
          >
            {[
              "⚡ Entrega instantánea",
              "🔒 100% Seguro",
              "💯 Resultados reales",
              "🔄 Soporte disponible",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-slate-400 text-sm"
              >
                <span>{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── STATS ─────────────────────────────────────────────────────────── */}
      <section className="py-20 border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 mb-4">
                  <stat.icon className="w-6 h-6 text-primary-400" />
                </div>
                <div className="text-3xl font-black text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-slate-500 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICES PREVIEW ──────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="section-title">
              Nuestros <span className="gradient-text">Servicios</span>
            </h2>
            <p className="section-subtitle mx-auto">
              Crecé en todas las plataformas principales con servicios probados
              y resultados garantizados.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {(featuredServices.length
              ? featuredServices
              : ([
                  {
                    id: "1",
                    name: "Seguidores Instagram",
                    platform: "instagram",
                    category: "followers",
                    price_per_unit: 0.0025,
                    min_quantity: 100,
                    delivery_speed: "1-3 días",
                    description: "Seguidores reales de Instagram",
                  },
                  {
                    id: "2",
                    name: "Seguidores TikTok",
                    platform: "tiktok",
                    category: "followers",
                    price_per_unit: 0.003,
                    min_quantity: 100,
                    delivery_speed: "1-2 días",
                    description: "Seguidores reales de TikTok",
                  },
                  {
                    id: "3",
                    name: "Vistas YouTube",
                    platform: "youtube",
                    category: "views",
                    price_per_unit: 0.004,
                    min_quantity: 500,
                    delivery_speed: "1-3 días",
                    description: "Vistas de alta retención",
                  },
                ] as Partial<Service>[])
            ).map((service, i) => {
              const icons = { followers: Users, likes: Heart, views: Eye };
              const Icon =
                icons[
                  (service.category as keyof typeof icons) ?? "followers"
                ] ?? Users;
              const platformColors: Record<string, string> = {
                instagram: "from-pink-500 to-purple-600",
                tiktok: "from-slate-800 to-slate-600",
                youtube: "from-red-600 to-red-500",
              };
              const gradient =
                platformColors[service.platform ?? "instagram"] ??
                platformColors.instagram;
              return (
                <motion.div
                  key={service.id}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card-hover p-6 group cursor-pointer"
                >
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} mb-4 shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {service.name}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    {service.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-primary-400 font-bold text-xl">
                        {formatCurrency(
                          (service.price_per_unit ?? 0) *
                            (service.min_quantity ?? 100),
                        )}
                      </span>
                      <span className="text-slate-500 text-xs ml-1">
                        / {formatNumber(service.min_quantity ?? 100)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 glass-card px-2 py-1">
                      {service.delivery_speed}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center">
            <Link
              href="/order"
              className="btn-secondary inline-flex items-center gap-2"
            >
              Ver todos los servicios <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="py-24 border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="section-title">
              ¿Cómo <span className="gradient-text">funciona</span>?
            </h2>
            <p className="section-subtitle mx-auto">
              Potenciá tus redes sociales en solo 4 pasos simples.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                <div className="glass-card p-6 h-full hover:border-primary-500/30 transition-all">
                  <div className="text-5xl font-black text-primary-500/20 mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-white font-semibold mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                    <ChevronRight className="w-6 h-6 text-primary-500/40" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIOS ─────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="section-title">
              Lo que dicen nuestros{" "}
              <span className="gradient-text">clientes</span>
            </h2>
            <p className="section-subtitle mx-auto">
              Clientes reales que ya están creciendo con nosotros.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.handle}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="glass-card-hover p-6 flex flex-col gap-4"
              >
                {/* Stars */}
                <div className="flex gap-0.5">
                  {[...Array(t.rating)].map((_, si) => (
                    <span key={si} className="text-amber-400 text-sm">
                      ★
                    </span>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-slate-300 text-sm leading-relaxed flex-1">
                  &ldquo;{t.text}&rdquo;
                </p>

                {/* Result badge */}
                <div className="inline-flex self-start items-center gap-1.5 bg-primary-500/15 border border-primary-500/25 text-primary-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                  ✅ {t.result}
                </div>

                {/* Author */}
                <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                  <div
                    className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">
                      {t.name}
                    </div>
                    <div className="text-slate-500 text-xs">
                      {t.handle} · {t.location}
                    </div>
                  </div>
                  <div className="ml-auto text-lg" title={t.platform}>
                    {t.platform === "instagram"
                      ? "📸"
                      : t.platform === "tiktok"
                        ? "🎵"
                        : "▶️"}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="section-title">
              Preguntas <span className="gradient-text">frecuentes</span>
            </h2>
            <p className="section-subtitle mx-auto">
              Todo lo que necesitás saber antes de hacer tu primer pedido.
            </p>
          </motion.div>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="glass-card p-6 hover:border-primary-500/20 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary-400 text-xs font-bold">
                      ?
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-2">{faq.q}</div>
                    <div className="text-slate-400 text-sm leading-relaxed">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="glass-card p-6 sm:p-12 border-primary-500/20 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-radial-glow" />
            <div className="relative z-10">
              <h2 className="text-4xl font-black text-white mb-4">
                ¿Listo para <span className="gradient-text">crecer</span>?
              </h2>
              <p className="text-slate-400 text-sm sm:text-lg mb-8 max-w-xl mx-auto">
                Seguidores, likes y vistas reales para Instagram, TikTok y
                YouTube. Pagás con MercadoPago, entrega instantánea.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/order"
                  className="btn-primary text-lg px-10 py-4 flex items-center gap-2 justify-center"
                >
                  <Zap className="w-5 h-5" /> Empezar ahora
                </Link>
                <Link
                  href="/register"
                  className="btn-secondary text-lg px-10 py-4 flex items-center gap-2 justify-center"
                >
                  Crear cuenta gratis <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-6 mt-8">
                {[
                  "Sin suscripción",
                  "Entrega instantánea",
                  "Sin contraseña requerida",
                ].map((f) => (
                  <div
                    key={f}
                    className="flex items-center gap-1.5 text-slate-400 text-sm"
                  >
                    <CheckCircle className="w-4 h-4 text-primary-400" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

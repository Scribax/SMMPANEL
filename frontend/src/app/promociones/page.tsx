"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
  User,
  Wallet,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { paymentsApi, promotionsApi } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Promotion, User as UserType } from "@/types";

const DEFAULT_IMAGE = "/seguidores.png";

const BENEFITS = [
  { label: "Sin contraseña", icon: ShieldCheck },
  { label: "Pago seguro", icon: CreditCard },
  { label: "Entrega progresiva", icon: Clock },
  { label: "Seguimiento en tu cuenta", icon: User },
];
type TargetCopy = {
  label: string;
  placeholder: string;
  help: string;
  emptyError: string;
  invalidError?: string;
};

const getPromotionTargetCopy = (promotion: Promotion): TargetCopy => {
  const category = promotion.service_category;
  const platform = promotion.service_platform;

  if (platform === "discord" && category === "boost") {
    return {
      label: "Link de invitación del servidor",
      placeholder: "https://discord.gg/tuservidor",
      help: "Usá una invitación activa del servidor donde querés aplicar la promoción.",
      emptyError: "Ingresá el link de invitación de Discord",
      invalidError: "El link debe ser una invitación válida de Discord",
    };
  }

  if (platform === "telegram" && category === "reactions") {
    return {
      label: "Link del post de Telegram",
      placeholder: "https://t.me/tucanal/123",
      help: "Pegá el link exacto del post donde querés recibir las reacciones.",
      emptyError: "Ingresá el link del post de Telegram",
      invalidError: "El link debe incluir el canal y número de post de Telegram",
    };
  }

  if (["likes", "views", "comments"].includes(String(category))) {
    return {
      label: "Link de la publicación",
      placeholder: "https://www.instagram.com/p/... o /reel/...",
      help: "Pegá el link exacto del post o reel donde querés aplicar la promoción.",
      emptyError: "Ingresá el link de la publicación",
      invalidError: "Para esta promo necesitás pegar el link de un post o reel, no el perfil.",
    };
  }

  return {
    label: "Usuario o link del perfil",
    placeholder: "@tuusuario o https://www.instagram.com/tuusuario",
    help: "No pedimos contraseña. El perfil debe estar público durante la entrega.",
    emptyError: "Ingresá tu usuario o link del perfil",
    invalidError: "Para seguidores usá el @usuario o link del perfil, no una publicación.",
  };
};

const validatePromotionTarget = (promotion: Promotion, value: string) => {
  const category = promotion.service_category;
  const platform = promotion.service_platform;
  const target = value.trim().toLowerCase();

  if (!target) return false;

  if (platform === "discord" && category === "boost") {
    return target.includes("discord.gg/") || target.includes("discord.com/invite/");
  }

  if (platform === "telegram" && category === "reactions") {
    return /t\.me\/[^/]+\/\d+/.test(target) || /telegram\.me\/[^/]+\/\d+/.test(target);
  }

  if (["likes", "views", "comments"].includes(String(category))) {
    if (platform === "instagram") {
      return ["/p/", "/reel/", "/reels/", "/tv/"].some((pattern) => target.includes(pattern));
    }
    return target.startsWith("http");
  }

  if (category === "followers") {
    return !["/p/", "/reel/", "/reels/", "/stories/", "/tv/"].some((pattern) => target.includes(pattern));
  }

  return true;
};
export default function PromocionesPage() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [link, setLink] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"balance" | "mercadopago">("balance");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    promotionsApi
      .getAll()
      .then((res) => setPromotions(res.data.promotions ?? []))
      .catch(() => toast.error("No pudimos cargar las promociones"))
      .finally(() => setLoading(false));

    if (isAuthenticated()) {
      const user = getStoredUser();
      setCurrentUser(user);
      setEmail(user?.email ?? "");
    }
  }, []);

  const openCheckout = (promotion: Promotion) => {
    if (!isAuthenticated()) {
      toast.error("Ingresá a tu cuenta para comprar esta promoción");
      router.push("/login");
      return;
    }
    setSelectedPromotion(promotion);
    setLink("");
    setEmail(currentUser?.email ?? "");
    setPaymentMethod("balance");
  };

  const closeCheckout = () => {
    if (submitting) return;
    setSelectedPromotion(null);
  };

  const handleCheckout = async () => {
    if (!selectedPromotion) return;
    const targetCopy = getPromotionTargetCopy(selectedPromotion);
    if (!link.trim()) {
      toast.error(targetCopy.emptyError);
      return;
    }
    if (!validatePromotionTarget(selectedPromotion, link)) {
      toast.error(targetCopy.invalidError ?? "Revisá el dato ingresado");
      return;
    }
    if (!email.trim()) {
      toast.error("Ingresá tu email");
      return;
    }

    setSubmitting(true);
    try {
      const res = await paymentsApi.createPromoCheckout({
        promotionId: selectedPromotion.id,
        link: link.trim(),
        email: email.trim(),
        paymentMethod,
      });

      if (res.data.paidWithBalance) {
        toast.success("Pedido confirmado");
        setSelectedPromotion(null);
        router.push("/dashboard");
        return;
      }

      if (res.data.initPoint) {
        window.location.href = res.data.initPoint;
        return;
      }

      toast.success("Pedido creado");
      setSelectedPromotion(null);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; insufficientBalance?: boolean } } })?.response?.data;
      if (data?.insufficientBalance) {
        toast.error("No tenés saldo suficiente. Elegí MercadoPago o cargá saldo.");
      } else {
        toast.error(data?.message ?? "No pudimos iniciar la compra");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-300">
      <Navbar />

      <main className="pt-24 pb-16 sm:pt-28 sm:pb-24">
        <section className="relative overflow-hidden border-b border-white/[0.06] pb-14 sm:pb-18">
          <div className="absolute inset-0 bg-grid opacity-25" />
          <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-pink-500/10 via-amber-400/10 to-transparent" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-[0.96fr_1.04fr] gap-8 lg:gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
              >
                <span className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-6 border-amber-400/30 text-sm text-amber-200 font-semibold">
                  <BadgePercent className="w-4 h-4" /> PROMOCIONES ACTIVAS
                </span>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
                  Aprovechá ofertas especiales para impulsar tus redes
                </h1>

                <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mb-8">
                  Packs por tiempo limitado con precio cerrado, pago seguro y
                  seguimiento desde tu cuenta de FollowArg.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {BENEFITS.map((benefit) => (
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
                  <img
                    src={promotions[0]?.image_url || DEFAULT_IMAGE}
                    alt="Promociones FollowArg"
                    className="w-full h-auto object-contain bg-black/20"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div>
                <span className="inline-flex items-center gap-2 text-emerald-300 text-sm font-semibold mb-3">
                  <Sparkles className="w-4 h-4" /> Elegí tu promo
                </span>
                <h2 className="section-title">Promociones disponibles</h2>
                <p className="section-subtitle">
                  Seleccioná un pack, ingresá tu perfil y pagá con saldo o MercadoPago.
                </p>
              </div>
              <Link href="/order" className="btn-secondary inline-flex items-center justify-center gap-2">
                Ver todos los servicios <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="glass-card p-5 animate-pulse space-y-4">
                    <div className="h-40 rounded-2xl bg-white/[0.06]" />
                    <div className="h-5 rounded bg-white/[0.06] w-2/3" />
                    <div className="h-4 rounded bg-white/[0.06]" />
                    <div className="h-11 rounded-xl bg-white/[0.06]" />
                  </div>
                ))}
              </div>
            ) : promotions.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <BadgePercent className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-white font-bold mb-2">No hay promociones activas</h3>
                <p className="text-slate-400 text-sm mb-6">
                  Mientras tanto podés comprar cualquier servicio desde el catálogo.
                </p>
                <Link href="/order" className="btn-primary inline-flex items-center justify-center gap-2">
                  Hacer pedido <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {promotions.map((promotion, index) => (
                  <motion.div
                    key={promotion.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] overflow-hidden hover:border-primary-400/35 transition-all"
                  >
                    <div className="aspect-[16/10] bg-black/20 overflow-hidden">
                      <img
                        src={promotion.image_url || DEFAULT_IMAGE}
                        alt={promotion.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {promotion.badge && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-300/15 border border-amber-300/25 text-amber-200 font-bold">
                            {promotion.badge}
                          </span>
                        )}
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 font-semibold">
                          {promotion.quantity.toLocaleString("es-AR")} unidades
                        </span>
                      </div>

                      <h3 className="text-white font-bold text-lg mb-2 leading-snug">
                        {promotion.title}
                      </h3>
                      {promotion.description && (
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">
                          {promotion.description}
                        </p>
                      )}
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-300 mb-5">
                        Vas a necesitar: {getPromotionTargetCopy(promotion).label.toLowerCase()}
                      </div>

                      <div className="flex items-end justify-between gap-3 mb-5">
                        <div>
                          {promotion.compare_at_price && (
                            <div className="text-slate-500 text-sm line-through">
                              {formatCurrency(Number(promotion.compare_at_price))}
                            </div>
                          )}
                          <div className="text-3xl font-black text-white">
                            {formatCurrency(Number(promotion.promo_price))}
                          </div>
                        </div>
                        {promotion.service_delivery_speed && (
                          <div className="text-right text-xs text-slate-400">
                            <Clock className="w-4 h-4 ml-auto mb-1 text-primary-300" />
                            {promotion.service_delivery_speed}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => openCheckout(promotion)}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        Comprar promoción <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      <AnimatePresence>
        {selectedPromotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={closeCheckout}
          >
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              className="w-full sm:max-w-lg bg-[#0e0e1c] border border-white/[0.10] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <div className="text-amber-200 text-xs font-bold mb-1">
                    {selectedPromotion.badge || "PROMOCIÓN"}
                  </div>
                  <h3 className="text-white font-black text-xl leading-tight">
                    {selectedPromotion.title}
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    {selectedPromotion.quantity.toLocaleString("es-AR")} unidades por{" "}
                    <span className="text-white font-bold">
                      {formatCurrency(Number(selectedPromotion.promo_price))}
                    </span>
                  </p>
                </div>
                <button
                  onClick={closeCheckout}
                  className="text-slate-500 hover:text-white transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">
                    {getPromotionTargetCopy(selectedPromotion).label}
                  </label>
                  <input
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    className="input-field"
                    placeholder={getPromotionTargetCopy(selectedPromotion).placeholder}
                  />
                  <p className="text-slate-500 text-xs mt-1.5">
                    {getPromotionTargetCopy(selectedPromotion).help}
                  </p>
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Email</label>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="input-field"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-2 block">Método de pago</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentMethod("balance")}
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                        paymentMethod === "balance"
                          ? "border-primary-400/60 bg-primary-500/15 text-primary-200"
                          : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white"
                      }`}
                    >
                      <Wallet className="w-4 h-4" /> Saldo
                    </button>
                    <button
                      onClick={() => setPaymentMethod("mercadopago")}
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                        paymentMethod === "mercadopago"
                          ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-200"
                          : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" /> MercadoPago
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total</span>
                    <span className="text-white font-bold">
                      {formatCurrency(Number(selectedPromotion.promo_price))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" /> Compra segura y seguimiento desde tu cuenta
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-4"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : paymentMethod === "mercadopago" ? (
                    <>
                      Pagar con MercadoPago <CreditCard className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      Pagar con saldo <Wallet className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

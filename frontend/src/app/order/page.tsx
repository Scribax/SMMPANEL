"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronRight,
  AtSign,
  Link2,
  Wallet,
  PlusCircle,
  X,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { servicesApi, paymentsApi, couponsApi, utilsApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { Service } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

// ── Preset quantity packages ────────────────────────────────────────────────
const QUANTITY_PRESETS: Record<string, number[]> = {
  followers: [100, 250, 500, 1000, 2500, 5000, 10000],
  likes: [50, 100, 250, 500, 1000, 2500, 5000],
  views: [100, 250, 500, 1000, 2500, 5000, 10000, 50000, 100000],
  comments: [10, 25, 50, 100, 250, 500],
};
const DEFAULT_PRESETS = [100, 250, 500, 1000, 2500, 5000];

function getPresets(service: Service): number[] {
  const base = QUANTITY_PRESETS[service.category] ?? DEFAULT_PRESETS;
  return base.filter(
    (q) => q >= service.min_quantity && q <= service.max_quantity,
  );
}

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  site?: string;
}

// ya no usamos slider avanzado; la cantidad manual se controla con un input numérico

// ── Validación de links según servicio ────────────────────────────────────────
function validateLinkForService(link: string, service: Service): { valid: boolean; message?: string } {
  const lowerLink = link.toLowerCase().trim();
  
  // Servicios de STORIES solo funcionan con historias
  if (service.name.toLowerCase().includes("story")) {
    if (!lowerLink.includes("/stories/") && !lowerLink.includes("instagram.com/stories/")) {
      return {
        valid: false,
        message: "⚠️ Este servicio es SOLO para historias de Instagram (instagram.com/stories/...)"
      };
    }
    return { valid: true };
  }
  
  // Servicios de POSTS/REELS/LIKES/VIEWS - NO funcionan con historias
  if (service.category === "likes" || service.category === "views" || service.category === "comments") {
    if (lowerLink.includes("/stories/") || lowerLink.includes("instagram.com/stories/")) {
      const suggestion = service.category === "likes" 
        ? "Usá el servicio 'Story Stickers' para darle like a historias"
        : service.category === "views" 
          ? "Usá el servicio 'Story Views' para ver historias"
          : "Mirá los servicios que dicen 'Story' en el nombre";
      return {
        valid: false,
        message: `❌ Este servicio NO funciona con historias de Instagram. ${suggestion}`
      };
    }
    // Validar que sea un link válido de Instagram
    if (lowerLink.includes("instagram.com")) {
      const validPatterns = ["/p/", "/reel/", "/reels/", "/tv/"];
      const hasValidPattern = validPatterns.some(pattern => lowerLink.includes(pattern));
      if (!hasValidPattern && !service.name.toLowerCase().includes("story")) {
        return {
          valid: false,
          message: "⚠️ Link de Instagram inválido. Usá: /p/ (posts), /reel/ o /reels/ (videos), /tv/ (IGTV)"
        };
      }
    }
    return { valid: true };
  }
  
  // Seguidores - solo username o perfil
  if (service.category === "followers") {
    if (lowerLink.includes("/p/") || lowerLink.includes("/reel/") || lowerLink.includes("/stories/")) {
      return {
        valid: false,
        message: "⚠️ Para seguidores, usá el link del perfil (instagram.com/usuario) o el @username"
      };
    }
    return { valid: true };
  }
  
  return { valid: true };
}

// ── Platform / category meta ─────────────────────────────────────────────────
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
];

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  followers: { label: "Seguidores", emoji: "👥" },
  likes: { label: "Likes", emoji: "❤️" },
  views: { label: "Vistas", emoji: "👁️" },
  comments: { label: "Comentarios", emoji: "💬" },
};

function OrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [platform, setPlatform] = useState("");
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState(
    searchParams.get("service") ?? "",
  );
  const [quantity, setQuantity] = useState(0);
  const [quantityConfirmed, setQuantityConfirmed] = useState(false);
  const [quantityInput, setQuantityInput] = useState("");
  const [link, setLink] = useState("");
  const [email, setEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [linkPreviewLoading, setLinkPreviewLoading] = useState(false);
  const [linkPreviewError, setLinkPreviewError] = useState<string | null>(null);
  const [linkValidation, setLinkValidation] = useState<{ valid: boolean; message?: string } | null>(null);
  const linkPreviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPreviewUrlRef = useRef<string>("");

  const selected = services.find((s) => s.id === selectedId);
  const basePrice =
    selected && quantity
      ? parseFloat((selected.price_per_unit * quantity).toFixed(2))
      : 0;
  const finalPrice = Math.max(basePrice - couponDiscount, 0.01);
  const CASHBACK_PERCENT = 5; // 5% cashback acreditado automáticamente
  const cashbackAmount = parseFloat(
    (finalPrice * (CASHBACK_PERCENT / 100)).toFixed(2),
  );
  const isFollowers = selected?.category === "followers";
  const linkPlaceholder = isFollowers
    ? `@tunombredeusuario`
    : `https://${platform}.com/p/...`;

  // platforms available from loaded services
  const availablePlatforms = [
    ...new Set(services.map((s) => s.platform)),
  ] as string[];

  // categories for selected platform
  const categories = [
    ...new Set(
      services.filter((s) => s.platform === platform).map((s) => s.category),
    ),
  ];

  // services for selected platform + category
  const filteredServices = services.filter(
    (s) => s.platform === platform && s.category === category,
  );

  // Link validation handler --------------------------------------------------
  useEffect(() => {
    if (selected && link.trim()) {
      const validation = validateLinkForService(link, selected);
      setLinkValidation(validation);
    } else {
      setLinkValidation(null);
    }
  }, [link, selected]);

  // Link preview handler -----------------------------------------------------
  useEffect(() => {
    if (linkPreviewTimeoutRef.current) {
      clearTimeout(linkPreviewTimeoutRef.current);
      linkPreviewTimeoutRef.current = null;
    }

    const rawLink = link.trim();

    if (!selected || !rawLink) {
      setLinkPreview(null);
      setLinkPreviewError(null);
      setLinkPreviewLoading(false);
      lastPreviewUrlRef.current = "";
      return;
    }
    
    // Si hay error de validación, no buscamos preview
    if (linkValidation && !linkValidation.valid) {
      setLinkPreview(null);
      setLinkPreviewError(null);
      setLinkPreviewLoading(false);
      lastPreviewUrlRef.current = "";
      return;
    }

    if (isFollowers) {
      setLinkPreview(null);
      setLinkPreviewError(null);
      setLinkPreviewLoading(false);
      lastPreviewUrlRef.current = "";
      return;
    }

    const sanitized = rawLink.startsWith("http")
      ? rawLink
      : `https://${rawLink}`;
    const allowedDomains =
      /(instagram\.com|tiktok\.com|youtube\.com|youtu\.be)/i;

    if (!allowedDomains.test(sanitized)) {
      setLinkPreview(null);
      setLinkPreviewError(null);
      setLinkPreviewLoading(false);
      lastPreviewUrlRef.current = "";
      return;
    }

    setLinkPreviewLoading(true);
    setLinkPreviewError(null);

    linkPreviewTimeoutRef.current = setTimeout(async () => {
      lastPreviewUrlRef.current = sanitized;
      try {
        const response = await utilsApi.getLinkPreview(sanitized);
        if (lastPreviewUrlRef.current !== sanitized) return;
        const preview = response.data?.preview ?? null;
        if (preview) {
          setLinkPreview(preview);
          setLinkPreviewError(null);
        } else {
          setLinkPreview(null);
          setLinkPreviewError(
            "No pudimos previsualizar el link, pero podés continuar.",
          );
        }
      } catch (error) {
        if (lastPreviewUrlRef.current !== sanitized) return;
        setLinkPreview(null);
        setLinkPreviewError(
          "No se pudo validar el link. Verificá que sea público.",
        );
      } finally {
        if (lastPreviewUrlRef.current === sanitized) {
          setLinkPreviewLoading(false);
        }
      }
    }, 600);

    return () => {
      if (linkPreviewTimeoutRef.current) {
        clearTimeout(linkPreviewTimeoutRef.current);
        linkPreviewTimeoutRef.current = null;
      }
    };
  }, [link, selected, isFollowers]);

  // step logic: step 5 requires explicitly confirming the quantity
  const step = !platform
    ? 1
    : !category
      ? 2
      : !selectedId
        ? 3
        : !quantity || !quantityConfirmed
          ? 4
          : 5;

  useEffect(() => {
    if (isAuthenticated()) {
      const u = getStoredUser();
      setLoggedIn(true);
      setUserBalance(parseFloat(String(u?.balance ?? 0)));
      if (u?.email) setEmail(u.email);
    }
  }, []);

  useEffect(() => {
    servicesApi
      .getAll()
      .then((res) => {
        const all: Service[] = (res.data.services ?? []).map((s: Service) => ({
          ...s,
          price_per_unit: parseFloat(String(s.price_per_unit)),
        }));
        setServices(all);
        // if coming from ?service=id, pre-select everything
        const preselect = searchParams.get("service");
        const preplatform = searchParams.get("platform");
        const precategory = searchParams.get("category");
        if (preselect) {
          const svc = all.find((s) => s.id === preselect);
          if (svc) {
            setPlatform(svc.platform);
            setCategory(svc.category);
            setSelectedId(svc.id);
          }
        } else if (preplatform) {
          setPlatform(preplatform);
          if (precategory) setCategory(precategory);
        }
      })
      .catch(() => {});
  }, []);

  // reset downstream when service changes
  useEffect(() => {
    setQuantity(0);
    setQuantityConfirmed(false);
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponCode("");
  }, [selectedId]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setValidating(true);
    try {
      const res = await couponsApi.validate(couponCode, basePrice);
      const { coupon } = res.data;
      setCouponDiscount(coupon.discountAmount);
      setCouponApplied(true);
      toast.success(
        `¡Cupón aplicado! Ahorrás ${formatCurrency(coupon.discountAmount)}`,
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Cupón inválido";
      toast.error(msg);
    } finally {
      setValidating(false);
    }
  };

  const hasEnoughBalance =
    loggedIn && userBalance >= finalPrice && finalPrice > 0;

  const handleCheckout = async () => {
    if (!loggedIn) {
      toast.error("Necesitás una cuenta para hacer pedidos");
      router.push("/register?redirect=/order");
      return;
    }
    if (!link.trim()) {
      toast.error("Ingresá tu usuario o link");
      return;
    }
    if (!email.trim()) {
      toast.error("Ingresá tu email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Email inválido");
      return;
    }
    const linkVal = link.trim();

    // Validación de link según el tipo de servicio
    if (selected?.platform === "instagram") {
      const lowerLink = linkVal.toLowerCase();

      // VIEWS = solo para videos/reels (NO fotos)
      if (selected.category === "views") {
        if (
          !lowerLink.includes("/reel/") &&
          !lowerLink.includes("/tv/") &&
          !lowerLink.includes("/video/")
        ) {
          toast.error(
            "⚠️ Este servicio es SOLO para VIDEOS/REELS. Para fotos, usá el servicio de Likes. El link debe contener /reel/ o /tv/",
          );
          return;
        }
      }

      // LIKES = para posts y reels (fotos Y videos)
      if (selected.category === "likes") {
        if (
          !lowerLink.includes("/p/") &&
          !lowerLink.includes("/reel/") &&
          !lowerLink.includes("/tv/")
        ) {
          toast.error(
            "⚠️ El link debe ser de un POST o REEL. Ejemplo: instagram.com/p/... o instagram.com/reel/...",
          );
          return;
        }
      }
    }

    if (isFollowers) {
      const username = linkVal
        .replace(/^@/, "")
        .replace(/^https?:\/\/.+\//, "")
        .replace(/\/$/, "");
      if (!username || username.length < 2 || /\s/.test(username)) {
        toast.error(
          "Usuario inválido. Ingresá solo el nombre de usuario, ej: @tuusuario",
        );
        return;
      }
    } else {
      if (!linkVal.startsWith("http")) {
        toast.error(
          "Ingresá el link completo del post, ej: https://www.instagram.com/p/...",
        );
        return;
      }
    }

    if (!hasEnoughBalance) {
      setShowFundsModal(true);
      return;
    }

    setLoading(true);
    try {
      const res = await paymentsApi.createCheckout({
        serviceId: selectedId,
        quantity,
        link: link.trim(),
        email: email.trim(),
        couponCode: couponApplied ? couponCode : undefined,
      });
      toast.success(
        `¡Pedido creado! +${formatCurrency(cashbackAmount)} de cashback acreditado 💰`,
      );
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const errData = (
        err as {
          response?: {
            data?: { insufficientBalance?: boolean; message?: string };
          };
        }
      )?.response?.data;
      if (errData?.insufficientBalance) {
        setShowFundsModal(true);
      } else {
        toast.error(errData?.message ?? "Error al procesar. Intentá de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator ──────────────────────────────────────────────────────────
  const STEPS = ["Plataforma", "Servicio", "Paquete", "Datos", "Pagar"];
  const progress = Math.min(
    100,
    Math.max(0, ((step - 1) / (STEPS.length - 1)) * 100),
  );

  return (
    <div className="min-h-screen bg-dark-300">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-12 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-primary-500/30 via-primary-500/5 to-sky-500/10 px-5 py-8 sm:px-8 sm:py-12 shadow-[0_40px_80px_-40px_rgba(99,102,241,0.7)]"
          >
            <div className="absolute -top-32 -right-24 h-64 w-64 rounded-full bg-primary-500/30 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-sky-400/30 blur-3xl" />
            <div className="relative z-10 flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
              <div className="text-left max-w-xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
                  <Sparkles className="h-3 w-3" /> flujo guiado
                </p>
                <h1 className="text-3xl font-black text-white sm:text-4xl md:text-5xl">
                  Potenciá tu cuenta en{" "}
                  <span className="text-primary-200">5 pasos</span>
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-slate-200/80">
                  Elegí plataforma, paquetizá tu pedido y pagá seguro con
                  MercadoPago. Te guiamos paso a paso y monitoreamos la entrega
                  en vivo.
                </p>
              </div>
              <div className="grid gap-3 text-left sm:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur">
                  <div className="flex items-center gap-3 text-sm font-semibold text-white">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />{" "}
                    Garantía de reposición
                  </div>
                  <p className="mt-2 text-xs text-slate-300">
                    Servicios curados con refill automático y monitoreo 24/7.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur">
                  <div className="flex items-center gap-3 text-sm font-semibold text-white">
                    <Rocket className="h-4 w-4 text-sky-400" /> Entrega
                    ultrarrápida
                  </div>
                  <p className="mt-2 text-xs text-slate-300">
                    Pedidos procesados en minutos con seguimiento desde tu
                    dashboard.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Progress steps */}
          <div className="relative mx-auto mb-10 max-w-3xl">
            <div className="relative flex items-start">
              {/* Background line – from center of first dot to center of last dot */}
              <div className="pointer-events-none absolute left-[10%] right-[10%] top-[18px] h-0.5 bg-white/10" />
              {/* Progress fill */}
              <div
                className="pointer-events-none absolute left-[10%] top-[18px] h-0.5 bg-gradient-to-r from-primary-500 via-fuchsia-500 to-sky-400 transition-all duration-500"
                style={{
                  width: `calc(80% * ${(step - 1) / (STEPS.length - 1)})`,
                }}
              />
              {STEPS.map((s, i) => {
                const n = i + 1;
                const done = step > n;
                const active = step === n;
                return (
                  <div
                    key={s}
                    className="relative z-10 flex w-1/5 flex-col items-center gap-1.5"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-300 ${
                        done
                          ? "border-emerald-400 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                          : active
                            ? "border-primary-400 bg-primary-500 text-white shadow-lg shadow-primary-500/40"
                            : "border-white/15 bg-dark-200 text-slate-500"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : n}
                    </div>
                    <span
                      className={`w-full text-center text-[8px] uppercase leading-tight tracking-[0.05em] sm:text-[10px] sm:tracking-[0.15em] ${active ? "text-primary-200" : "text-slate-500"}`}
                    >
                      {s}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ── STEP 1: Platform ─────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="glass-card p-5 sm:p-10">
                  <h2 className="text-white font-bold text-2xl text-center">
                    ¿En qué plataforma?
                  </h2>
                  <p className="mt-2 text-center text-sm text-slate-400">
                    Seleccioná dónde querés crecer. Cada plataforma tiene
                    presets optimizados.
                  </p>
                  {services.length === 0 ? (
                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 animate-pulse"
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-white/10 rounded-full" />
                            <div className="h-5 bg-white/10 rounded w-24" />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="h-3 bg-white/10 rounded w-20" />
                            <div className="h-6 bg-white/10 rounded-full w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {PLATFORMS.filter((p) =>
                        availablePlatforms.includes(p.id),
                      ).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setPlatform(p.id);
                            setCategory("");
                            setSelectedId("");
                          }}
                          className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 via-dark-300 to-dark-200/80 p-6 text-left shadow-lg shadow-black/10 transition-all hover:-translate-y-1 hover:border-primary-400/80 hover:shadow-primary-500/30"
                        >
                          <div
                            className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br ${p.gradient} mix-blend-screen`}
                          />
                          <div className="relative z-10 flex h-full flex-col justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-4xl drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)]">
                                {p.emoji}
                              </span>
                              <span className="text-lg font-semibold text-white">
                                {p.label}
                              </span>
                            </div>
                            <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
                              <span>
                                {
                                  services.filter((s) => s.platform === p.id)
                                    .length
                                }{" "}
                                servicios
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70">
                                Explorar <ChevronRight className="h-3 w-3" />
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Category ─────────────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="glass-card p-5 sm:p-10">
                  <button
                    onClick={() => setPlatform("")}
                    className="mb-6 flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    ← Volver
                  </button>
                  <h2 className="text-white text-center text-2xl font-bold">
                    ¿Qué tipo de servicio?
                  </h2>
                  <p className="mt-2 text-center text-sm text-slate-400">
                    Elegí el objetivo de tu campaña para ver servicios
                    compatibles.
                  </p>
                  <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {categories.map((cat) => {
                      const meta = CATEGORY_LABELS[cat] ?? {
                        label: cat,
                        emoji: "⚡",
                      };
                      const count = services.filter(
                        (s) => s.platform === platform && s.category === cat,
                      ).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            setCategory(cat);
                            setSelectedId("");
                          }}
                          className="rounded-3xl border border-white/10 bg-white/6 p-6 text-left shadow-md shadow-black/10 transition-all hover:-translate-y-1 hover:border-primary-400/60 hover:bg-primary-500/10"
                        >
                          <div className="text-3xl">{meta.emoji}</div>
                          <div className="mt-3 text-lg font-semibold text-white">
                            {meta.label}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                            {count} opción{count !== 1 ? "es" : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Service variant ──────────────────────────────────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="glass-card p-5 sm:p-10">
                  <button
                    onClick={() => setCategory("")}
                    className="mb-6 flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    ← Volver
                  </button>
                  <h2 className="text-white text-center text-2xl font-bold">
                    Elegí el tipo
                  </h2>
                  <p className="mt-2 text-center text-sm text-slate-400">
                    Compará velocidad, reposición y precio mínimo antes de
                    continuar.
                  </p>
                  <div className="mt-8 space-y-3">
                    {filteredServices.map((svc) => {
                      const minPrice = parseFloat(
                        (svc.price_per_unit * svc.min_quantity).toFixed(2),
                      );
                      const isBasic =
                        svc.name.toLowerCase().includes("básico") ||
                        svc.name.toLowerCase().includes("basic");
                      const isStoryService = svc.name.toLowerCase().includes("story");
                      const isReelService = svc.name.toLowerCase().includes("reel");
                      return (
                        <button
                          key={svc.id}
                          onClick={() => setSelectedId(svc.id)}
                          className={`group flex w-full items-start justify-between gap-6 rounded-3xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl ${
                            isBasic
                              ? "border-amber-400/40 bg-amber-500/10 hover:border-amber-400/70 hover:bg-amber-500/20"
                              : "border-white/12 bg-white/6 hover:border-primary-400/60 hover:bg-primary-500/10"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-sm font-semibold text-white md:text-base">
                                {svc.name}
                              </span>
                              {isBasic && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                                  <AlertCircle className="h-3 w-3" /> Básico
                                </span>
                              )}
                              {isStoryService && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-purple-200">
                                  📱 SOLO Historias
                                </span>
                              )}
                              {isReelService && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-200">
                                  🎬 Posts & Reels
                                </span>
                              )}
                              {!isStoryService && !isReelService && svc.category === "likes" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-green-200">
                                  📸 Posts & Reels
                                </span>
                              )}
                              {!isStoryService && !isReelService && svc.category === "views" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
                                  🎬 Videos & Reels
                                </span>
                              )}
                            </div>
                            {svc.description && (
                              <p className="mt-2 text-xs leading-relaxed text-slate-300 md:text-sm">
                                {svc.description}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                              <span>⚡ {svc.delivery_speed}</span>
                              <span>
                                📦 {formatNumber(svc.min_quantity)}–
                                {formatNumber(svc.max_quantity)}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-4">
                            <div className="text-right">
                              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                                desde
                              </div>
                              <div className="text-sm font-bold text-primary-300 md:text-base">
                                {formatCurrency(minPrice)}
                              </div>
                            </div>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-slate-400 transition-colors group-hover:border-primary-400 group-hover:text-primary-200">
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Quantity packages ────────────────────────────────── */}
            {step === 4 && selected && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="glass-card p-5 sm:p-10">
                  <button
                    onClick={() => setSelectedId("")}
                    className="mb-6 flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    ← Volver
                  </button>
                  <div className="rounded-3xl border border-white/10 bg-white/6 p-6 md:flex md:items-center md:justify-between md:gap-10">
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        Elegí el paquete ideal
                      </h2>
                      <p className="mt-2 text-sm text-slate-300">
                        {selected.name}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                        <span>⚡ {selected.delivery_speed}</span>
                        <span>
                          📦 {formatNumber(selected.min_quantity)}–
                          {formatNumber(selected.max_quantity)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 md:mt-0">
                      <div className="rounded-2xl border border-primary-500/30 bg-primary-500/10 px-5 py-4 text-right">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-primary-200/80">
                          precio actual
                        </p>
                        <p className="text-2xl font-black text-primary-200">
                          {formatCurrency(
                            basePrice ||
                              selected.price_per_unit * selected.min_quantity,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Paquetes recomendados
                  </h3>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {(() => {
                      const popularPresets = getPresets(selected);
                      const popularIdx = Math.floor(popularPresets.length / 2);
                      return popularPresets.map((qty, presetIdx) => {
                        const price = parseFloat(
                          (selected.price_per_unit * qty).toFixed(2),
                        );
                        const isActive = quantity === qty;
                        return (
                          <button
                            key={qty}
                            onClick={() => {
                              setQuantity(qty);
                              setQuantityInput(String(qty));
                              setTimeout(() => {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }, 150);
                            }}
                            className={`rounded-3xl border p-4 text-center transition-all hover:-translate-y-1 ${
                              isActive
                                ? "border-primary-400 bg-primary-500/20 shadow-lg shadow-primary-500/30"
                                : "border-white/12 bg-white/6 hover:border-primary-400/60 hover:bg-primary-500/10"
                            }`}
                          >
                            <div
                              className={`text-2xl font-black ${isActive ? "text-primary-100" : "text-white"}`}
                            >
                              {formatNumber(qty)}
                            </div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-slate-500">
                              {CATEGORY_LABELS[selected.category]?.label ??
                                selected.category}
                            </div>
                            <div
                              className={`mt-2 text-sm font-bold ${isActive ? "text-primary-200" : "text-slate-300"}`}
                            >
                              {formatCurrency(price)}
                            </div>
                            {presetIdx === popularIdx && !isActive && (
                              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
                                ⭐ Más popular
                              </div>
                            )}
                            {isActive && (
                              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                                Seleccionado
                              </div>
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                  <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
                    <div className="rounded-3xl border border-white/10 bg-white/6 p-6">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Mín: {formatNumber(selected.min_quantity)}</span>
                        <span>Máx: {formatNumber(selected.max_quantity)}</span>
                      </div>
                      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={
                            quantityInput !== ""
                              ? quantityInput
                              : String(quantity || selected.min_quantity)
                          }
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setQuantityInput(val);
                            const num = parseInt(val, 10);
                            if (!isNaN(num) && val !== "") {
                              setQuantity(Math.min(selected.max_quantity, num));
                            }
                            setQuantityConfirmed(false);
                          }}
                          onBlur={() => {
                            const num = parseInt(quantityInput, 10);
                            if (
                              isNaN(num) ||
                              quantityInput === "" ||
                              num < selected.min_quantity
                            ) {
                              setQuantity(selected.min_quantity);
                              setQuantityInput(String(selected.min_quantity));
                            } else if (num > selected.max_quantity) {
                              setQuantity(selected.max_quantity);
                              setQuantityInput(String(selected.max_quantity));
                            } else {
                              setQuantityInput(String(num));
                            }
                          }}
                          className="input-field flex-1 text-lg"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setQuantity(selected.min_quantity);
                              setQuantityInput(String(selected.min_quantity));
                              setQuantityConfirmed(false);
                            }}
                            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition-colors hover:border-primary-400 hover:text-primary-200"
                          >
                            Mín
                          </button>
                          <button
                            onClick={() => {
                              setQuantity(selected.max_quantity);
                              setQuantityInput(String(selected.max_quantity));
                              setQuantityConfirmed(false);
                            }}
                            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition-colors hover:border-primary-400 hover:text-primary-200"
                          >
                            Máx
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-primary-500/10 p-6 text-sm text-slate-200">
                      <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
                        <ShieldCheck className="h-4 w-4" /> Consejos rápidos
                      </h4>
                      <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-200/80">
                        <li>
                          Elegí un paquete proporcional al alcance real de tu
                          contenido para evitar drops.
                        </li>
                        <li>
                          ¿Campaña escalonada? Ajustá manualmente para repartir
                          en varias publicaciones.
                        </li>
                        <li>
                          Podés confirmar y volver a editar antes de pagar en el
                          siguiente paso.
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => {
                        const raw = parseInt(quantityInput, 10);
                        const confirmedQty =
                          !isNaN(raw) && raw >= selected.min_quantity
                            ? Math.min(selected.max_quantity, raw)
                            : quantity || selected.min_quantity;
                        setQuantity(confirmedQty);
                        setQuantityInput(String(confirmedQty));
                        setQuantityConfirmed(true);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full btn-primary py-3 text-base font-semibold"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 5: Details + Pay ────────────────────────────────────── */}
            {step === 5 && selected && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setQuantity(0);
                      setQuantityConfirmed(false);
                    }}
                    className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
                  >
                    ← Volver al paquete
                  </button>

                  {/* Username / Link */}
                  <div className="glass-card p-6">
                    <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      {isFollowers ? (
                        <AtSign className="w-4 h-4 text-primary-400" />
                      ) : (
                        <Link2 className="w-4 h-4 text-primary-400" />
                      )}
                      {isFollowers
                        ? "Tu usuario de " +
                          platform.charAt(0).toUpperCase() +
                          platform.slice(1)
                        : "Link del post"}
                    </label>
                    <input
                      type="text"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder={linkPlaceholder}
                      className={`input-field ${linkValidation && !linkValidation.valid ? 'border-red-500/50 focus:border-red-500' : ''}`}
                      autoFocus
                    />

                    {/* Link validation error */}
                    {linkValidation && !linkValidation.valid && (
                      <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-400 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          {linkValidation.message}
                        </p>
                      </div>
                    )}

                    {/* Link validation success */}
                    {linkValidation && linkValidation.valid && link.trim() && (
                      <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-400 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          ✓ Link válido para este servicio
                        </p>
                      </div>
                    )}

                    {/* Warning based on service type */}
                    {/* Mensaje para servicios de VISTAS normales (no historias) */}
                    {selected?.platform === "instagram" &&
                      selected?.category === "views" &&
                      !selected?.name?.toLowerCase().includes("story") && (
                        <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                          <p className="text-xs text-amber-400 flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              <strong>SOLO para VIDEOS/REELS</strong> (instagram.com/reel/...).<br/>
                              ❌ NO funciona con fotos ni historias.<br/>
                              💡 Para historias usá el servicio <strong>"Story Views"</strong>
                            </span>
                          </p>
                        </div>
                      )}

                    {/* Mensaje POSITIVO para servicios de HISTORIAS */}
                    {selected?.platform === "instagram" &&
                      selected?.name?.toLowerCase().includes("story") && (
                        <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                          <p className="text-xs text-purple-400 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              <strong>✓ Servicio correcto para historias</strong><br/>
                              Poné el link de tu historia (instagram.com/stories/...)<br/>
                              💡 Recordá que las historias duran solo 24 horas
                            </span>
                          </p>
                        </div>
                      )}
                    {selected?.platform === "instagram" &&
                      selected?.category === "likes" &&
                      !selected?.name?.toLowerCase().includes("story") && (
                        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <p className="text-xs text-blue-400 flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              <strong>✓ Funciona con:</strong> FOTOS (instagram.com/p/...) y REELS (instagram.com/reel/...)<br/>
                              <strong>❌ NO funciona con:</strong> Historias<br/>
                              💡 Para historias usá <strong>"Story Stickers"</strong>
                            </span>
                          </p>
                        </div>
                      )}

                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {isFollowers
                        ? "Tu cuenta debe estar en público"
                        : "Asegurate que el post sea público"}
                    </p>

                    {!isFollowers && (
                      <div className="mt-4">
                        {linkPreviewLoading && (
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-slate-400 flex items-center gap-3">
                            <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                            Buscando previsualización...
                          </div>
                        )}
                        {linkPreview && !linkPreviewLoading && (
                          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            {linkPreview.image && (
                              <img
                                src={linkPreview.image}
                                alt={linkPreview.title ?? "Preview"}
                                className="w-full h-40 object-cover"
                              />
                            )}
                            <div className="p-4">
                              <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                                {linkPreview.site}
                              </div>
                              <h4 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                                {linkPreview.title ?? "Contenido encontrado"}
                              </h4>
                              {linkPreview.description && (
                                <p className="text-slate-400 text-xs line-clamp-3">
                                  {linkPreview.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {linkPreviewError && !linkPreviewLoading && (
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200">
                            {linkPreviewError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="glass-card p-6">
                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                      📧 Email para seguimiento del pedido
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="input-field"
                    />
                  </div>

                  {/* Coupon */}
                  <div className="glass-card p-6">
                    <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary-400" /> Cupón de
                      descuento{" "}
                      <span className="text-slate-500 font-normal">
                        (opcional)
                      </span>
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponApplied(false);
                          setCouponDiscount(0);
                        }}
                        placeholder="BOOST20"
                        className="input-field flex-1 uppercase tracking-widest"
                        disabled={couponApplied}
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={!couponCode || validating || couponApplied}
                        className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                          couponApplied
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30"
                        }`}
                      >
                        {validating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : couponApplied ? (
                          "✓ Aplicado"
                        ) : (
                          "Aplicar"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Order summary + pay */}
                  <div className="glass-card p-6">
                    <h3 className="text-white font-bold text-lg mb-4">
                      Resumen del pedido
                    </h3>
                    <div className="space-y-3 mb-5">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Servicio</span>
                        <span className="text-white text-right max-w-[200px] text-xs leading-snug">
                          {selected.name}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Cantidad</span>
                        <span className="text-white font-semibold">
                          {formatNumber(quantity)}{" "}
                          {CATEGORY_LABELS[selected.category]?.label ?? ""}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Entrega</span>
                        <span className="text-white">
                          ⚡ {selected.delivery_speed}
                        </span>
                      </div>
                      {couponApplied && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">
                            Descuento ({couponCode})
                          </span>
                          <span className="text-green-400 font-semibold">
                            −{formatCurrency(couponDiscount)}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-white/[0.08] pt-3 flex justify-between items-center">
                        <span className="text-white font-bold text-lg">
                          Total
                        </span>
                        <div className="text-right">
                          {couponApplied && (
                            <div className="text-slate-500 text-xs line-through">
                              {formatCurrency(basePrice)}
                            </div>
                          )}
                          <div className="text-primary-400 font-black text-3xl">
                            {formatCurrency(finalPrice)}
                          </div>
                        </div>
                      </div>
                      {/* Cashback */}
                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="text-emerald-400 flex items-center gap-1">
                          💰 Cashback ({CASHBACK_PERCENT}%)
                        </span>
                        <span className="text-emerald-400 font-semibold">
                          +{formatCurrency(cashbackAmount)}
                        </span>
                      </div>
                      {loggedIn && (
                        <div
                          className={`flex justify-between text-xs pt-1 ${
                            hasEnoughBalance
                              ? "text-green-400"
                              : "text-slate-500"
                          }`}
                        >
                          <span>Tu saldo</span>
                          <span className="font-semibold">
                            {formatCurrency(userBalance)}
                            {hasEnoughBalance ? " ✓" : " (insuficiente)"}
                          </span>
                        </div>
                      )}
                    </div>

                    {!hasEnoughBalance && finalPrice > 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <p className="text-xs text-amber-300">
                          Saldo insuficiente. Necesitás{" "}
                          {formatCurrency(finalPrice)} y tenés{" "}
                          {formatCurrency(userBalance)}.
                        </p>
                        <button
                          onClick={() => router.push("/add-funds")}
                          className="ml-auto text-xs font-semibold text-amber-400 hover:text-amber-300 whitespace-nowrap flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> Cargar saldo
                        </button>
                      </div>
                    )}

                    <button
                      onClick={handleCheckout}
                      disabled={loading || !link.trim() || !email.trim()}
                      className="w-full flex items-center justify-center gap-2 py-4 text-base btn-primary disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Wallet className="w-5 h-5" />{" "}
                          {hasEnoughBalance
                            ? `Pagar con Saldo — ${formatCurrency(finalPrice)}`
                            : "Saldo insuficiente — Cargar saldo"}
                        </>
                      )}
                    </button>

                    <p className="text-center text-slate-500 text-xs mt-3 flex items-center justify-center gap-1.5">
                      🔒 Pago 100% seguro · Los seguidores se entregan
                      automáticamente
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Footer />

      {/* ── Sticky price bar ─────────────────────────────────────────── */}
      <AnimatePresence>
        {quantity > 0 && step >= 4 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-dark-300/95 backdrop-blur-xl border-t border-white/[0.08] px-4 py-3 md:hidden"
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">{selected?.name}</div>
                <div className="text-white font-bold">
                  {formatNumber(quantity)} ·{" "}
                  <span className="text-primary-400">
                    {formatCurrency(finalPrice)}
                  </span>
                </div>
              </div>
              {step === 5 && (
                <button
                  onClick={handleCheckout}
                  disabled={loading || !link.trim() || !email.trim()}
                  className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" /> Pagar
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Insufficient funds modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showFundsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFundsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowFundsModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-5">
                <Wallet className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Saldo insuficiente
              </h2>
              <p className="text-slate-400 text-sm mb-1">
                Necesitás{" "}
                <span className="text-white font-semibold">
                  {formatCurrency(finalPrice)}
                </span>{" "}
                para este pedido.
              </p>
              <p className="text-slate-400 text-sm mb-6">
                Tu saldo actual:{" "}
                <span className="text-amber-400 font-semibold">
                  {formatCurrency(userBalance)}
                </span>
              </p>
              <p className="text-slate-500 text-xs mb-6">
                Cargá saldo a tu cuenta vía MercadoPago y volvé a hacer el
                pedido.
              </p>
              <button
                onClick={() =>
                  router.push(
                    `/add-funds?amount=${Math.ceil(finalPrice - userBalance)}`,
                  )
                }
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" /> Cargar saldo ahora
              </button>
              <button
                onClick={() => setShowFundsModal(false)}
                className="mt-3 text-slate-500 hover:text-slate-300 text-sm w-full"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-dark-300 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OrderContent />
    </Suspense>
  );
}

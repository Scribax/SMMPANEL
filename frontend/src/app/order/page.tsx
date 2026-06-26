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
  ChevronDown,
  AtSign,
  Link2,
  Wallet,
  PlusCircle,
  X,
  ShieldCheck,
  ArrowLeft,
  CreditCard,
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
  boost: [1000],
  reactions: [50, 100, 250, 500, 1000, 2500, 5000],
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

// ── Validación de links según servicio ────────────────────────────────────────
function validateLinkForService(link: string, service: Service): { valid: boolean; message?: string } {
  const lowerLink = link.toLowerCase().trim();

  if (service.platform === "discord" && service.category === "boost") {
    if (
      !lowerLink.includes("discord.gg/") &&
      !lowerLink.includes("discord.com/invite/")
    ) {
      return {
        valid: false,
        message: "⚠️ Ingresá el link de invitación de tu servidor Discord (discord.gg/tuservidor)",
      };
    }
    return { valid: true };
  }

  if (service.platform === "telegram" && service.category === "reactions") {
    if (!lowerLink.includes("t.me/") && !lowerLink.includes("telegram.me/")) {
      return {
        valid: false,
        message: "⚠️ Ingresá el link del post de Telegram (t.me/tucanal/123)",
      };
    }
    const hasPostId = /t\.me\/[^/]+\/\d+/.test(lowerLink);
    if (!hasPostId) {
      return {
        valid: false,
        message: "⚠️ El link debe incluir el ID del post: t.me/tucanal/123",
      };
    }
    return { valid: true };
  }

  if (service.name.toLowerCase().includes("story")) {
    if (!lowerLink.includes("/stories/") && !lowerLink.includes("instagram.com/stories/")) {
      return {
        valid: false,
        message: "⚠️ Este servicio es SOLO para historias de Instagram (instagram.com/stories/...)"
      };
    }
    return { valid: true };
  }

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

// ── Smart badge for service cards ─────────────────────────────────────────────
function getServiceBadge(svc: Service): { label: string; colorClass: string } {
  const name = svc.name.toLowerCase();
  if (name.includes("básic") || name.includes("basic")) {
    return { label: "💰 Económico", colorClass: "bg-amber-500/20 text-amber-200 border border-amber-500/30" };
  }
  if (
    name.includes("365") ||
    name.includes("reposición") ||
    name.includes("garantía") ||
    name.includes("refill")
  ) {
    return { label: "🔄 Con garantía", colorClass: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30" };
  }
  if (name.includes("premium") || name.includes("real")) {
    return { label: "⭐ Premium", colorClass: "bg-purple-500/20 text-purple-200 border border-purple-500/30" };
  }
  return { label: "🔥 Popular", colorClass: "bg-primary-500/20 text-primary-200 border border-primary-500/30" };
}

// ── Platform / category meta ─────────────────────────────────────────────────
interface PlatformDef {
  id: string;
  label: string;
  emoji: string;
  customIcon?: React.ReactNode;
  gradient: string;
}

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <defs>
      <linearGradient id="tg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2AABEE" />
        <stop offset="100%" stopColor="#229ED9" />
      </linearGradient>
    </defs>
    <rect width="24" height="24" rx="6" fill="url(#tg-grad)" />
    <path
      d="M5.5 11.8 17 7l-2.2 10.5-3.5-2.8-1.7 1.6V13l6-5.7-7.5 4.3L5.5 11.8z"
      fill="white"
    />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="ig-grad2" cx="30%" cy="107%" r="130%">
        <stop offset="0%" stopColor="#ffd600" />
        <stop offset="30%" stopColor="#ff6a00" />
        <stop offset="60%" stopColor="#ee0979" />
        <stop offset="90%" stopColor="#c92bb7" />
        <stop offset="100%" stopColor="#7b2ff7" />
      </radialGradient>
    </defs>
    <rect width="24" height="24" rx="6" fill="url(#ig-grad2)" />
    <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="none" stroke="white" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="4.2" fill="none" stroke="white" strokeWidth="1.5" />
    <circle cx="17.5" cy="6.5" r="1.1" fill="white" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#010101" />
    <path d="M19.32 6.78a4.84 4.84 0 0 1-2.99-1.04 4.84 4.84 0 0 1-1.7-3.24h-2.98v13.3a2.3 2.3 0 0 1-2.3 2.05 2.3 2.3 0 0 1-2.3-2.3 2.3 2.3 0 0 1 2.3-2.3c.23 0 .44.04.65.1V10.3a5.3 5.3 0 0 0-.65-.04 5.3 5.3 0 0 0-5.3 5.3 5.3 5.3 0 0 0 5.3 5.3 5.3 5.3 0 0 0 5.3-5.3V9.97a7.77 7.77 0 0 0 4.67 1.54V8.53a4.85 4.85 0 0 1-2-.75z" fill="white" />
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#FF0000" />
    <polygon points="9.8,15.1 9.8,9.1 15.8,12.1" fill="white" />
  </svg>
);

const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#5865F2" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#5865F2" />
    <path d="M16.5 6.5C15.4 6 14.2 5.7 13 5.6l-.2.4c1 .2 2 .6 2.9 1.1A9.7 9.7 0 0 0 8.3 7.1a10 10 0 0 1 2.9-1.1L11 5.6c-1.2.1-2.4.4-3.5.9C5.8 8.9 5 11.9 5 14.8c1.1 1.2 2.5 2 4 2.4.3-.4.6-.9.9-1.3-.5-.2-1-.4-1.4-.7l.3-.3a7 7 0 0 0 6.3 0l.3.3c-.5.3-1 .5-1.5.7.3.5.6.9.9 1.3 1.5-.4 2.9-1.2 4-2.4 0-2.9-.8-5.9-2.3-8.3zm-7 7a1.4 1.4 0 0 1 0-2.8 1.4 1.4 0 0 1 0 2.8zm5 0a1.4 1.4 0 0 1 0-2.8 1.4 1.4 0 0 1 0 2.8z" fill="white" />
  </svg>
);

const PLATFORMS: PlatformDef[] = [
  {
    id: "instagram",
    label: "Instagram",
    emoji: "📸",
    customIcon: <InstagramIcon />,
    gradient: "from-pink-500 to-purple-600",
  },
  {
    id: "tiktok",
    label: "TikTok",
    emoji: "🎵",
    customIcon: <TikTokIcon />,
    gradient: "from-slate-600 to-slate-800",
  },
  {
    id: "youtube",
    label: "YouTube",
    emoji: "▶️",
    customIcon: <YouTubeIcon />,
    gradient: "from-red-600 to-red-700",
  },
  {
    id: "discord",
    label: "Discord",
    emoji: "🎮",
    customIcon: <DiscordIcon />,
    gradient: "from-indigo-500 to-purple-700",
  },
  {
    id: "telegram",
    label: "Telegram",
    emoji: "✈️",
    customIcon: <TelegramIcon />,
    gradient: "from-sky-400 to-blue-600",
  },
];

const CATEGORY_LABELS: Record<string, { label: string; emoji: string; desc: string }> = {
  followers: { label: "Seguidores", emoji: "👥", desc: "Hacé crecer tu perfil" },
  likes: { label: "Likes", emoji: "❤️", desc: "Más engagement en tus posts" },
  views: { label: "Vistas", emoji: "👁️", desc: "Más reproducciones" },
  comments: { label: "Comentarios", emoji: "💬", desc: "Interacción real" },
  boost: { label: "Server Boost", emoji: "🚀", desc: "Potenciá tu servidor" },
  reactions: { label: "Reacciones", emoji: "🎉", desc: "Para tus posts de Telegram" },
};

const ORDER_DRAFT_KEY = "followarg_order_draft";

function readOrderDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ORDER_DRAFT_KEY);
    return raw
      ? (JSON.parse(raw) as {
          link?: string;
          email?: string;
          couponCode?: string;
        })
      : null;
  } catch {
    return null;
  }
}

// ── Loading skeleton ─────────────────────────────────────────────────────────
function CatalogSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex gap-2 justify-center flex-wrap">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 w-28 rounded-2xl bg-white/[0.06]" />
        ))}
      </div>
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
          <div className="h-5 w-32 rounded bg-white/[0.06]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-3">
              <div className="h-5 w-24 rounded-full bg-white/[0.06]" />
              <div className="h-4 w-full rounded bg-white/[0.06]" />
              <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
              <div className="h-8 w-20 rounded-xl bg-white/[0.06] mt-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [platform, setPlatform] = useState("instagram");
  const [selectedId, setSelectedId] = useState(
    searchParams.get("service") ?? "",
  );
  const [quantity, setQuantity] = useState(0);
  const [quantityInput, setQuantityInput] = useState("");
  const [link, setLink] = useState("");
  const [email, setEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [modalDepositLoading, setModalDepositLoading] = useState(false);
  const [modalDepositAmount, setModalDepositAmount] = useState(100);
  const [modalCustomAmount, setModalCustomAmount] = useState("");
  const [showCustomAmountInput, setShowCustomAmountInput] = useState(false);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [linkPreviewLoading, setLinkPreviewLoading] = useState(false);
  const [linkPreviewError, setLinkPreviewError] = useState<string | null>(null);
  const [linkValidation, setLinkValidation] = useState<{ valid: boolean; message?: string } | null>(null);
  const linkPreviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPreviewUrlRef = useRef<string>("");

  // ── Simple 2-step logic ───────────────────────────────────────────────────
  const step = !selectedId ? 1 : 2;

  const selected = services.find((s) => s.id === selectedId);
  const basePrice =
    selected && quantity
      ? parseFloat((selected.price_per_unit * quantity).toFixed(2))
      : 0;
  const finalPrice = Math.max(basePrice - couponDiscount, 0.01);
  const CASHBACK_PERCENT = 5;
  const cashbackAmount = parseFloat(
    (finalPrice * (CASHBACK_PERCENT / 100)).toFixed(2),
  );
  const isFollowers = selected?.category === "followers";
  const isDiscordBoost = selected?.platform === "discord" && selected?.category === "boost";
  const isTelegramReactions = selected?.platform === "telegram" && selected?.category === "reactions";
  const linkPlaceholder = isDiscordBoost
    ? "https://discord.gg/tuservidor"
    : isTelegramReactions
    ? "https://t.me/tucanal/123"
    : isFollowers
    ? `@tunombredeusuario`
    : `https://${selected?.platform ?? "instagram"}.com/p/...`;

  const availablePlatforms = [
    ...new Set(services.map((s) => s.platform)),
  ] as string[];
  const platformServices = services.filter((s) => s.platform === platform);
  const categories = [...new Set(platformServices.map((s) => s.category))];

  // ── Balance modal calculations ──────────────────────────────────────────
  useEffect(() => {
    if (showFundsModal) {
      const missing = Math.max(finalPrice - userBalance, 0);
      const minAmt = Math.max(Math.ceil(missing), 100);
      setModalDepositAmount(minAmt);
      setModalCustomAmount("");
      setShowCustomAmountInput(false);
    }
  }, [showFundsModal, finalPrice, userBalance]);

  const handleModalDeposit = async (depositAmt: number) => {
    if (!depositAmt || depositAmt < 100) {
      toast.error("El monto mínimo es $100 ARS");
      return;
    }
    setModalDepositLoading(true);
    try {
      const res = await paymentsApi.createDeposit(depositAmt);
      window.location.href = res.data.initPoint;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al procesar la recarga";
      toast.error(msg);
    } finally {
      setModalDepositLoading(false);
    }
  };

  // ── Link validation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (selected && link.trim()) {
      const validation = validateLinkForService(link, selected);
      setLinkValidation(validation);
    } else {
      setLinkValidation(null);
    }
  }, [link, selected]);

  // ── Link preview ──────────────────────────────────────────────────────────
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
      } catch {
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
  }, [link, selected, isFollowers, linkValidation]);

  // ── Auth + draft ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated()) {
      const u = getStoredUser();
      setLoggedIn(true);
      setUserBalance(parseFloat(String(u?.balance ?? 0)));
      if (u?.email) setEmail(u.email);
    }

    const draft = readOrderDraft();
    if (draft?.link) setLink(draft.link);
    if (draft?.email) {
      setEmail((current) => current || draft.email || "");
    }
    if (draft?.couponCode) setCouponCode(draft.couponCode);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        ORDER_DRAFT_KEY,
        JSON.stringify({ link, email, couponCode }),
      );
    } catch {
      /* ignore storage issues */
    }
  }, [link, email, couponCode]);

  // ── Load services ─────────────────────────────────────────────────────────
  useEffect(() => {
    servicesApi
      .getAll()
      .then((res) => {
        const all: Service[] = (res.data.services ?? []).map((s: Service) => ({
          ...s,
          price_per_unit: parseFloat(String(s.price_per_unit)),
        }));
        setServices(all);
        const preselect = searchParams.get("service");
        const preplatform = searchParams.get("platform");
        if (preselect) {
          const svc = all.find((s) => s.id === preselect);
          if (svc) {
            setPlatform(svc.platform);
            setSelectedId(svc.id);
          }
        } else if (preplatform) {
          setPlatform(preplatform);
        } else {
          const firstPlatform = all[0]?.platform ?? "instagram";
          setPlatform(firstPlatform);
        }
      })
      .catch(() => {});
  }, []);

  // ── Reset when service changes ────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    const svc = services.find((s) => s.id === selectedId);
    if (svc?.category === "boost") {
      setQuantity(svc.min_quantity);
      setQuantityInput(String(svc.min_quantity));
    } else {
      setQuantity(0);
      setQuantityInput("");
    }
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponCode("");
    setCouponOpen(false);
  }, [selectedId]);

  // ── Coupon ────────────────────────────────────────────────────────────────
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

  // ── Checkout ──────────────────────────────────────────────────────────────
  const hasEnoughBalance =
    loggedIn && userBalance >= finalPrice && finalPrice > 0;
  const orderReturnPath = selectedId
    ? `/order?service=${encodeURIComponent(selectedId)}`
    : "/order";
  const addFundsPath = `/add-funds?amount=${Math.ceil(Math.max(finalPrice - userBalance, 100))}&redirect=${encodeURIComponent(orderReturnPath)}`;

  const handleCheckout = async () => {
    if (!loggedIn) {
      toast.error("Creá tu cuenta gratis para guardar el pedido y seguir la entrega");
      router.push(`/register?redirect=${encodeURIComponent(orderReturnPath)}`);
      return;
    }
    if (!link.trim()) {
      toast.error("Ingresá tu usuario o link");
      return;
    }
    if (linkValidation && !linkValidation.valid) {
      toast.error(linkValidation.message ?? "Revisá el link ingresado");
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

    if (selected?.platform === "discord" && selected?.category === "boost") {
      const lowerLink = linkVal.toLowerCase();
      if (
        !lowerLink.includes("discord.gg/") &&
        !lowerLink.includes("discord.com/invite/")
      ) {
        toast.error(
          "⚠️ Ingresá el link de invitación de tu servidor Discord (discord.gg/tuservidor)",
        );
        return;
      }
    } else if (selected?.platform === "telegram" && selected?.category === "reactions") {
      const lowerLink = linkVal.toLowerCase();
      if (!lowerLink.includes("t.me/") && !lowerLink.includes("telegram.me/")) {
        toast.error("⚠️ Ingresá el link del post de Telegram (t.me/tucanal/123)");
        return;
      }
      if (!/t\.me\/[^/]+\/\d+/.test(lowerLink)) {
        toast.error("⚠️ El link debe incluir el ID del post: t.me/tucanal/123");
        return;
      }
    } else if (selected?.platform === "instagram") {
      const lowerLink = linkVal.toLowerCase();

      if (selected.category === "views" && !selected.name?.toLowerCase().includes("story")) {
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

      if (selected.category === "likes" && !selected.name?.toLowerCase().includes("story")) {
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

      if (selected.name?.toLowerCase().includes("story")) {
        if (!lowerLink.includes("/stories/")) {
          toast.error(
            "⚠️ Este servicio es SOLO para HISTORIAS de Instagram. El link debe contener /stories/",
          );
          return;
        }
      }
    }

    if (isFollowers) {
      const username = linkVal
        .replace(/^@/, "")
        .replace(/^https?:\/.+\//, "")
        .replace(/\/$/, "");
      if (!username || username.length < 2 || /\s/.test(username)) {
        toast.error(
          "Usuario inválido. Ingresá solo el nombre de usuario, ej: @tuusuario",
        );
        return;
      }
    } else if (!isDiscordBoost && !isTelegramReactions) {
      if (!linkVal.startsWith("http")) {
        toast.error(
          "Ingresá el link completo del post, ej: https://www.instagram.com/p/...",
        );
        return;
      }
    }

    if (!hasEnoughBalance) {
      toast.error("Cargá saldo con MercadoPago para confirmar este pedido");
      setShowFundsModal(true);
      return;
    }

    setLoading(true);
    try {
      await paymentsApi.createCheckout({
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

  // ── Render ────────────────────────────────────────────────────────────────
  const presets = selected ? getPresets(selected) : [];
  const popularPresetIdx = Math.floor(presets.length / 2);

  return (
    <div className="min-h-screen bg-dark-300">
      <Navbar />
      <div className="pt-20 sm:pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          <AnimatePresence mode="wait">

            {/* ════════════════════════════════════════════════════════════
                STEP 1 — Catálogo de servicios
            ════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                {/* Header */}
                <div className="text-center mb-8 sm:mb-10">
                  <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                    ¿Qué querés{" "}
                    <span className="text-gradient">potenciar</span>?
                  </h1>
                  <p className="text-slate-400 mt-2 text-sm sm:text-base">
                    Elegí el servicio — en 2 pasos tenés tu pedido listo.
                  </p>
                </div>

                {/* Platform pills */}
                <div className="flex gap-2 justify-center flex-wrap mb-8">
                  {PLATFORMS.filter((p) =>
                    availablePlatforms.includes(p.id),
                  ).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all ${
                        platform === p.id
                          ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                          : "glass-card text-slate-400 hover:text-white hover:border-primary-500/30"
                      }`}
                    >
                      <span className="flex-shrink-0">{p.customIcon ?? p.emoji}</span>
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Service catalog */}
                {services.length === 0 ? (
                  <CatalogSkeleton />
                ) : categories.length === 0 ? (
                  <div className="text-center text-slate-500 py-16">
                    No hay servicios disponibles para esta plataforma.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {categories.map((cat) => {
                      const catServices = platformServices.filter(
                        (s) => s.category === cat,
                      );
                      const meta = CATEGORY_LABELS[cat] ?? {
                        label: cat,
                        emoji: "⚡",
                        desc: "",
                      };
                      return (
                        <div key={cat}>
                          {/* Category header */}
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">{meta.emoji}</span>
                            <div>
                              <h2 className="text-white font-bold text-lg leading-none">
                                {meta.label}
                              </h2>
                              <p className="text-slate-500 text-xs mt-0.5">
                                {meta.desc}
                              </p>
                            </div>
                            <div className="flex-1 h-px bg-white/[0.06] ml-2" />
                          </div>

                          {/* Service cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {catServices.map((svc) => {
                              const badge = getServiceBadge(svc);
                              const minPrice = parseFloat(
                                (
                                  svc.price_per_unit * svc.min_quantity
                                ).toFixed(2),
                              );
                              return (
                                <button
                                  key={svc.id}
                                  onClick={() => {
                                    setSelectedId(svc.id);
                                    window.scrollTo({
                                      top: 0,
                                      behavior: "smooth",
                                    });
                                  }}
                                  className="glass-card-hover p-5 text-left group transition-all hover:-translate-y-0.5 flex flex-col"
                                >
                                  {/* Badge + speed */}
                                  <div className="flex items-start justify-between gap-2 mb-3">
                                    <span
                                      className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${badge.colorClass}`}
                                    >
                                      {badge.label}
                                    </span>
                                    <span className="text-[11px] text-slate-500 shrink-0">
                                      ⚡ {svc.delivery_speed}
                                    </span>
                                  </div>

                                  {/* Name */}
                                  <h3 className="text-white font-semibold text-sm leading-snug mb-1">
                                    {svc.name}
                                  </h3>

                                  {/* Description */}
                                  {svc.description && (
                                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 flex-1">
                                      {svc.description}
                                    </p>
                                  )}

                                  {/* Price + CTA */}
                                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.06]">
                                    <div>
                                      <span className="text-[10px] uppercase tracking-widest text-slate-500">
                                        desde
                                      </span>
                                      <div className="text-primary-300 font-bold text-base leading-none mt-0.5">
                                        {formatCurrency(minPrice)}
                                      </div>
                                    </div>
                                    <span className="flex items-center gap-1 bg-primary-500 hover:bg-primary-400 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors group-hover:bg-primary-400">
                                      Elegir{" "}
                                      <ChevronRight className="w-3 h-3" />
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                STEP 2 — Configurá y pagá
            ════════════════════════════════════════════════════════════ */}
            {step === 2 && selected && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                {/* Back */}
                <button
                  onClick={() => setSelectedId("")}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
                >
                  <ArrowLeft className="w-4 h-4" /> Cambiar servicio
                </button>

                <div className="lg:grid lg:grid-cols-[1fr,320px] lg:gap-6 lg:items-start">

                  {/* ── Left: form ── */}
                  <div className="space-y-4">

                    {/* Selected service chip */}
                    <div className="glass-card p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">
                          Servicio elegido
                        </p>
                        <p className="text-white font-semibold text-sm leading-snug truncate">
                          {selected.name}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          ⚡ {selected.delivery_speed}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedId("")}
                        className="text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors whitespace-nowrap"
                      >
                        Cambiar
                      </button>
                    </div>

                    {/* ── Quantity ── */}
                    {selected.category !== "boost" ? (
                      <div className="glass-card p-5">
                        <h3 className="text-white font-semibold text-sm mb-4">
                          Elegí la cantidad
                        </h3>

                        {/* Preset buttons */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                          {presets.map((qty, idx) => {
                            const price = parseFloat(
                              (selected.price_per_unit * qty).toFixed(2),
                            );
                            const isActive = quantity === qty;
                            const isPopular = idx === popularPresetIdx;
                            return (
                              <button
                                key={qty}
                                onClick={() => {
                                  setQuantity(qty);
                                  setQuantityInput(String(qty));
                                }}
                                className={`rounded-2xl border p-3 text-center transition-all hover:-translate-y-0.5 relative ${
                                  isActive
                                    ? "border-primary-400 bg-primary-500/20 shadow-lg shadow-primary-500/20"
                                    : "border-white/10 bg-white/[0.04] hover:border-primary-400/50 hover:bg-primary-500/10"
                                }`}
                              >
                                {isPopular && !isActive && (
                                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-amber-500 text-black font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                    ⭐ Popular
                                  </div>
                                )}
                                <div
                                  className={`text-base font-black ${isActive ? "text-primary-100" : "text-white"}`}
                                >
                                  {formatNumber(qty)}
                                </div>
                                <div
                                  className={`text-xs mt-0.5 font-semibold ${isActive ? "text-primary-200" : "text-slate-400"}`}
                                >
                                  {formatCurrency(price)}
                                </div>
                                {isActive && (
                                  <div className="mt-1 text-[9px] text-primary-300 font-bold">
                                    ✓ Elegido
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom input */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={
                              quantityInput !== ""
                                ? quantityInput
                                : quantity
                                ? String(quantity)
                                : ""
                            }
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              setQuantityInput(val);
                              const num = parseInt(val, 10);
                              if (!isNaN(num) && val !== "") {
                                setQuantity(
                                  Math.min(selected.max_quantity, num),
                                );
                              }
                            }}
                            onBlur={() => {
                              const num = parseInt(quantityInput, 10);
                              if (
                                isNaN(num) ||
                                quantityInput === "" ||
                                num < selected.min_quantity
                              ) {
                                if (quantity > 0) {
                                  setQuantityInput(String(quantity));
                                } else {
                                  setQuantityInput("");
                                }
                              } else if (num > selected.max_quantity) {
                                setQuantity(selected.max_quantity);
                                setQuantityInput(String(selected.max_quantity));
                              } else {
                                setQuantity(num);
                                setQuantityInput(String(num));
                              }
                            }}
                            placeholder={`Cantidad personalizada (${formatNumber(selected.min_quantity)}–${formatNumber(selected.max_quantity)})`}
                            className="input-field flex-1 text-sm"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Mín: {formatNumber(selected.min_quantity)} · Máx:{" "}
                          {formatNumber(selected.max_quantity)}
                        </p>
                      </div>
                    ) : (
                      /* Discord boost fixed */
                      <div className="glass-card p-5 flex items-center gap-4">
                        <span className="text-3xl">🚀</span>
                        <div>
                          <p className="text-white font-semibold text-sm">
                            {selected.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Paquete fijo · {selected.delivery_speed}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ── Link / username ── */}
                    <div className="glass-card p-5">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
                        {isFollowers ? (
                          <AtSign className="w-4 h-4 text-primary-400" />
                        ) : (
                          <Link2 className="w-4 h-4 text-primary-400" />
                        )}
                        {isDiscordBoost
                          ? "Link de invitación de tu servidor Discord"
                          : isTelegramReactions
                            ? "Link del post de Telegram"
                            : isFollowers
                              ? `Tu usuario de ${selected.platform.charAt(0).toUpperCase() + selected.platform.slice(1)}`
                              : "Link del post"}
                      </label>
                      <input
                        type="text"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder={linkPlaceholder}
                        className={`input-field ${linkValidation && !linkValidation.valid ? "border-red-500/50 focus:border-red-500" : ""}`}
                        autoFocus
                      />

                      {/* Validation error */}
                      {linkValidation && !linkValidation.valid && (
                        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-sm text-red-400 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            {linkValidation.message}
                          </p>
                        </div>
                      )}

                      {/* Validation success */}
                      {linkValidation && linkValidation.valid && link.trim() && (
                        <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <p className="text-sm text-green-400 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />✓ Link válido para este servicio
                          </p>
                        </div>
                      )}

                      {/* Discord boost tip */}
                      {isDiscordBoost && (
                        <div className="mt-2 p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                          <p className="text-xs text-indigo-300 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              Ingresá tu link de invitación:{" "}
                              <strong>discord.gg/tuservidor</strong>
                              <br />
                              💡 Tu servidor debe ser accesible con el link
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Telegram reactions tip */}
                      {isTelegramReactions && (
                        <div className="mt-2 p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg">
                          <p className="text-xs text-sky-300 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              Formato: <strong>t.me/tucanal/123</strong>
                              <br />
                              💡 El canal y el post deben ser públicos
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Instagram views warning */}
                      {selected.platform === "instagram" &&
                        selected.category === "views" &&
                        !selected.name?.toLowerCase().includes("story") && (
                          <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <p className="text-xs text-amber-400 flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>
                                <strong>SOLO para VIDEOS/REELS</strong>{" "}
                                (instagram.com/reel/...)
                                <br />❌ NO funciona con fotos ni historias
                              </span>
                            </p>
                          </div>
                        )}

                      {/* Instagram likes tip */}
                      {selected.platform === "instagram" &&
                        selected.category === "likes" &&
                        !selected.name?.toLowerCase().includes("story") && (
                          <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-xs text-blue-400 flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>
                                <strong>✓ Funciona con:</strong> fotos
                                (instagram.com/p/...) y reels
                                (instagram.com/reel/...)
                                <br />
                                <strong>❌ NO:</strong> historias
                              </span>
                            </p>
                          </div>
                        )}

                      {/* Instagram story tip */}
                      {selected.platform === "instagram" &&
                        selected.name?.toLowerCase().includes("story") && (
                          <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                            <p className="text-xs text-purple-400 flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>
                                <strong>✓ Servicio para historias</strong>
                                <br />
                                Link: instagram.com/stories/...
                              </span>
                            </p>
                          </div>
                        )}

                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {isFollowers
                          ? "Tu cuenta debe estar en público"
                          : isDiscordBoost
                            ? "El servidor debe ser accesible con el link"
                            : isTelegramReactions
                              ? "El canal y el post deben ser públicos"
                              : "Asegurate que el post sea público"}
                      </p>

                      {/* Link preview */}
                      {!isFollowers && !isDiscordBoost && !isTelegramReactions && (
                        <div className="mt-4">
                          {linkPreviewLoading && (
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-slate-400 flex items-center gap-3">
                              <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                              Verificando link...
                            </div>
                          )}
                          {linkPreview && !linkPreviewLoading && (
                            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                              {linkPreview.image && (
                                <img
                                  src={linkPreview.image}
                                  alt={linkPreview.title ?? "Preview"}
                                  className="w-full h-36 object-cover"
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
                                  <p className="text-slate-400 text-xs line-clamp-2">
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

                    {/* ── Email ── */}
                    <div className="glass-card p-5">
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

                    {/* ── Coupon accordion ── */}
                    <div className="glass-card overflow-hidden">
                      <button
                        onClick={() => setCouponOpen(!couponOpen)}
                        className="w-full flex items-center justify-between p-5 text-sm text-slate-400 hover:text-white transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-primary-400/60" />
                          {couponApplied
                            ? `✓ Cupón aplicado — ahorrás ${formatCurrency(couponDiscount)}`
                            : "Tengo un cupón de descuento"}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${couponOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {couponOpen && (
                        <div className="px-5 pb-5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => {
                                setCouponCode(e.target.value.toUpperCase());
                                setCouponApplied(false);
                                setCouponDiscount(0);
                              }}
                              placeholder="BOOST20"
                              className="input-field flex-1 uppercase tracking-widest min-w-0"
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
                      )}
                    </div>

                    {/* ── Mobile: pay button ── */}
                    <div className="lg:hidden glass-card p-5 space-y-3">
                      <h3 className="text-white font-bold text-sm">
                        Resumen del pedido
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Servicio</span>
                          <span className="text-white text-right text-xs max-w-[180px] leading-snug">
                            {selected.name}
                          </span>
                        </div>
                        {quantity > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Cantidad</span>
                            <span className="text-white font-semibold">
                              {selected.category === "boost"
                                ? selected.name.match(/x\d+/i)?.[0] ?? "Paquete"
                                : `${formatNumber(quantity)} ${CATEGORY_LABELS[selected.category]?.label ?? ""}`}
                            </span>
                          </div>
                        )}
                        {couponApplied && (
                          <div className="flex justify-between">
                            <span className="text-green-400">
                              Descuento ({couponCode})
                            </span>
                            <span className="text-green-400 font-semibold">
                              −{formatCurrency(couponDiscount)}
                            </span>
                          </div>
                        )}
                        <div className="border-t border-white/[0.08] pt-2 flex justify-between items-center">
                          <span className="text-white font-bold">Total</span>
                          <div className="text-right">
                            {couponApplied && (
                              <div className="text-slate-500 text-xs line-through">
                                {formatCurrency(basePrice)}
                              </div>
                            )}
                            <div className="text-primary-400 font-black text-xl">
                              {formatCurrency(quantity > 0 ? finalPrice : 0)}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-400">
                            💰 Cashback (5%)
                          </span>
                          <span className="text-emerald-400 font-semibold">
                            +{formatCurrency(quantity > 0 ? cashbackAmount : 0)}
                          </span>
                        </div>
                        {loggedIn && (
                          <div
                            className={`flex justify-between text-xs ${hasEnoughBalance ? "text-green-400" : "text-slate-500"}`}
                          >
                            <span>Tu saldo</span>
                            <span>
                              {formatCurrency(userBalance)}{" "}
                              {hasEnoughBalance ? "✓" : "(insuficiente)"}
                            </span>
                          </div>
                        )}
                      </div>

                      {!hasEnoughBalance && finalPrice > 0 && loggedIn && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                          <p className="text-amber-300 flex-1">
                            Necesitás {formatCurrency(finalPrice)} · Tenés{" "}
                            {formatCurrency(userBalance)}
                          </p>
                          <button
                            onClick={() => router.push(addFundsPath)}
                            className="text-amber-400 hover:text-amber-300 whitespace-nowrap font-semibold flex items-center gap-1"
                          >
                            <PlusCircle className="w-3.5 h-3.5" /> Cargar
                          </button>
                        </div>
                      )}

                      <button
                        onClick={handleCheckout}
                        disabled={
                          loading || !link.trim() || !email.trim() || !quantity
                        }
                        className="w-full btn-primary py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Wallet className="w-5 h-5" />
                            {hasEnoughBalance
                              ? `Confirmar pedido — ${formatCurrency(finalPrice)}`
                              : "Cargar saldo con MercadoPago"}
                          </>
                        )}
                      </button>
                      <p className="text-center text-slate-500 text-xs">
                        🔒 Pagás con saldo de cuenta · Cashback automático
                      </p>
                    </div>
                  </div>

                  {/* ── Right: sticky summary (desktop only) ── */}
                  <div className="hidden lg:block">
                    <div className="sticky top-24 glass-card p-6">
                      <h3 className="text-white font-bold text-base mb-5">
                        Resumen del pedido
                      </h3>

                      <div className="space-y-3 mb-5">
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-slate-400 shrink-0">
                            Servicio
                          </span>
                          <span className="text-white text-right text-xs leading-snug">
                            {selected.name}
                          </span>
                        </div>
                        {quantity > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Cantidad</span>
                            <span className="text-white font-semibold">
                              {selected.category === "boost"
                                ? selected.name.match(/x\d+/i)?.[0] ?? "Paquete"
                                : `${formatNumber(quantity)} ${CATEGORY_LABELS[selected.category]?.label ?? ""}`}
                            </span>
                          </div>
                        )}
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
                          <span className="text-white font-bold">Total</span>
                          <div className="text-right">
                            {couponApplied && (
                              <div className="text-slate-500 text-xs line-through">
                                {formatCurrency(basePrice)}
                              </div>
                            )}
                            <div className="text-primary-400 font-black text-2xl">
                              {formatCurrency(quantity > 0 ? finalPrice : 0)}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-400">
                            💰 Cashback (5%)
                          </span>
                          <span className="text-emerald-400 font-semibold">
                            +
                            {formatCurrency(quantity > 0 ? cashbackAmount : 0)}
                          </span>
                        </div>

                        {loggedIn && (
                          <div
                            className={`flex justify-between text-xs ${hasEnoughBalance && quantity > 0 ? "text-green-400" : "text-slate-500"}`}
                          >
                            <span>Tu saldo</span>
                            <span>
                              {formatCurrency(userBalance)}{" "}
                              {hasEnoughBalance && quantity > 0
                                ? "✓"
                                : quantity > 0
                                  ? "(insuficiente)"
                                  : ""}
                            </span>
                          </div>
                        )}
                      </div>

                      {!hasEnoughBalance && finalPrice > 0 && loggedIn && quantity > 0 && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-amber-300 text-xs">
                              Necesitás {formatCurrency(finalPrice)} · Tenés{" "}
                              {formatCurrency(userBalance)}
                            </p>
                            <button
                              onClick={() => router.push(addFundsPath)}
                              className="mt-1 text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                            >
                              <PlusCircle className="w-3 h-3" /> Cargar saldo y
                              volver
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleCheckout}
                        disabled={
                          loading || !link.trim() || !email.trim() || !quantity
                        }
                        className="w-full btn-primary py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Wallet className="w-5 h-5" />
                            {hasEnoughBalance && quantity > 0
                              ? `Confirmar — ${formatCurrency(finalPrice)}`
                              : "Confirmar pedido"}
                          </>
                        )}
                      </button>
                      <p className="text-center text-slate-500 text-xs mt-3">
                        🔒 Saldo seguro · Cashback automático
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Footer />

      {/* ── Insufficient funds modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showFundsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowFundsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-5 sm:p-8 max-w-md w-full text-center rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto relative bg-dark-200"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowFundsModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-6 h-6 text-amber-400" />
              </div>
              
              <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
                Falta saldo para confirmar
              </h2>
              <p className="text-slate-400 text-xs mb-5">
                Cargá saldo rápido para completar tu pedido al instante.
              </p>

              {/* Detalle de Cuenta */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-5 text-left space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total del pedido:</span>
                  <span className="text-white font-semibold">{formatCurrency(finalPrice)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tu saldo actual:</span>
                  <span className="text-amber-400 font-semibold">{formatCurrency(userBalance)}</span>
                </div>
                <div className="border-t border-white/[0.06] pt-2.5 flex justify-between text-sm font-bold">
                  <span className="text-white">Faltante:</span>
                  <span className="text-primary-300">{formatCurrency(Math.max(finalPrice - userBalance, 0))}</span>
                </div>
              </div>

              {/* Botón Principal: Pagar Faltante Exacto */}
              <button
                onClick={() => handleModalDeposit(modalDepositAmount)}
                disabled={modalDepositLoading || modalDepositAmount < 100}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base font-semibold disabled:opacity-50"
              >
                {modalDepositLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pagar ${modalDepositAmount.toLocaleString()} con MercadoPago
                  </>
                )}
              </button>
              <p className="text-center text-slate-500 text-[10px] mt-2 mb-4">
                🔒 Pagás de forma segura · Acreditación inmediata
              </p>

              {/* Acordeón para elegir otro monto */}
              <div className="border-t border-white/[0.06] pt-4 text-left">
                <button
                  onClick={() => setShowCustomAmountInput(!showCustomAmountInput)}
                  className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <span>¿Querés cargar otro monto?</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showCustomAmountInput ? "rotate-180" : ""}`} />
                </button>
                
                {showCustomAmountInput && (
                  <div className="mt-3 space-y-4">
                    {/* Pills rápidos */}
                    <div className="grid grid-cols-4 gap-2">
                      {[500, 1000, 2000, 5000].map((presetAmt) => (
                        <button
                          key={presetAmt}
                          onClick={() => {
                            setModalDepositAmount(presetAmt);
                            setModalCustomAmount("");
                          }}
                          className={`py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                            modalDepositAmount === presetAmt && !modalCustomAmount
                              ? "bg-primary-500/20 border-primary-500/50 text-primary-300"
                              : "border-white/[0.08] text-slate-400 hover:border-white/20 hover:text-white bg-white/[0.02]"
                          }`}
                        >
                          ${presetAmt}
                        </button>
                      ))}
                    </div>

                    {/* Input personalizado */}
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1.5 block">
                        Ingresá un monto personalizado (mín. $100)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                        <input
                          type="number"
                          min="100"
                          value={modalCustomAmount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setModalCustomAmount(val);
                            const num = parseInt(val, 10);
                            if (!isNaN(num) && num >= 100) {
                              setModalDepositAmount(num);
                            }
                          }}
                          placeholder="Ej: 1500"
                          className="input-field pl-7 py-2.5 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
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

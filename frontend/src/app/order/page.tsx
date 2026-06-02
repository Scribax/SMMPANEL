'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, AlertCircle, Loader2, CheckCircle2, ChevronRight, AtSign, Link2, Wallet, PlusCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { servicesApi, paymentsApi, couponsApi, utilsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { getStoredUser, isAuthenticated } from '@/lib/auth';
import { Service } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/utils';

// ── Preset quantity packages ────────────────────────────────────────────────
const QUANTITY_PRESETS: Record<string, number[]> = {
  followers: [100, 250, 500, 1000, 2500, 5000, 10000],
  likes:     [50,  100, 250, 500,  1000, 2500, 5000],
  views:     [100, 250, 500, 1000, 2500, 5000, 10000, 50000, 100000],
  comments:  [10,  25,  50,  100,  250,  500],
};
const DEFAULT_PRESETS = [100, 250, 500, 1000, 2500, 5000];

function getPresets(service: Service): number[] {
  const base = QUANTITY_PRESETS[service.category] ?? DEFAULT_PRESETS;
  return base.filter((q) => q >= service.min_quantity && q <= service.max_quantity);
}

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  site?: string;
}

// ya no usamos slider avanzado; la cantidad manual se controla con un input numérico

// ── Platform / category meta ─────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', emoji: '📸', gradient: 'from-pink-500 to-purple-600' },
  { id: 'tiktok',    label: 'TikTok',    emoji: '🎵', gradient: 'from-slate-600 to-slate-800' },
  { id: 'youtube',   label: 'YouTube',   emoji: '▶️', gradient: 'from-red-600 to-red-700' },
];

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  followers: { label: 'Seguidores', emoji: '👥' },
  likes:     { label: 'Likes',      emoji: '❤️' },
  views:     { label: 'Vistas',     emoji: '👁️' },
  comments:  { label: 'Comentarios',emoji: '💬' },
};

function OrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [services, setServices]           = useState<Service[]>([]);
  const [platform,  setPlatform]          = useState('');
  const [category,  setCategory]          = useState('');
  const [selectedId, setSelectedId]       = useState(searchParams.get('service') ?? '');
  const [quantity,  setQuantity]          = useState(0);
  const [quantityConfirmed, setQuantityConfirmed] = useState(false);
  const [link,      setLink]              = useState('');
  const [email,     setEmail]             = useState('');
  const [couponCode, setCouponCode]       = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [loading,   setLoading]           = useState(false);
  const [validating, setValidating]       = useState(false);
  const [userBalance, setUserBalance]     = useState(0);
  const [loggedIn, setLoggedIn]           = useState(false);
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [linkPreview, setLinkPreview]     = useState<LinkPreview | null>(null);
  const [linkPreviewLoading, setLinkPreviewLoading] = useState(false);
  const [linkPreviewError, setLinkPreviewError] = useState<string | null>(null);
  const linkPreviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPreviewUrlRef = useRef<string>('');

  const selected   = services.find((s) => s.id === selectedId);
  const basePrice  = selected && quantity ? parseFloat((selected.price_per_unit * quantity).toFixed(2)) : 0;
  const finalPrice = Math.max(basePrice - couponDiscount, 0.01);
  const isFollowers = selected?.category === 'followers';
  const linkPlaceholder = isFollowers
    ? `@tunombredeusuario`
    : `https://${platform}.com/p/...`;

  // platforms available from loaded services
  const availablePlatforms = [...new Set(services.map((s) => s.platform))] as string[];

  // categories for selected platform
  const categories = [...new Set(
    services.filter((s) => s.platform === platform).map((s) => s.category)
  )];

  // services for selected platform + category
  const filteredServices = services.filter(
    (s) => s.platform === platform && s.category === category
  );

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
      lastPreviewUrlRef.current = '';
      return;
    }

    if (isFollowers) {
      setLinkPreview(null);
      setLinkPreviewError(null);
      setLinkPreviewLoading(false);
      lastPreviewUrlRef.current = '';
      return;
    }

    const sanitized = rawLink.startsWith('http') ? rawLink : `https://${rawLink}`;
    const allowedDomains = /(instagram\.com|tiktok\.com|youtube\.com|youtu\.be)/i;

    if (!allowedDomains.test(sanitized)) {
      setLinkPreview(null);
      setLinkPreviewError(null);
      setLinkPreviewLoading(false);
      lastPreviewUrlRef.current = '';
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
          setLinkPreviewError('No pudimos previsualizar el link, pero podés continuar.');
        }
      } catch (error) {
        if (lastPreviewUrlRef.current !== sanitized) return;
        setLinkPreview(null);
        setLinkPreviewError('No se pudo validar el link. Verificá que sea público.');
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
    servicesApi.getAll().then((res) => {
      const all: Service[] = (res.data.services ?? []).map((s: Service) => ({
        ...s,
        price_per_unit: parseFloat(String(s.price_per_unit)),
      }));
      setServices(all);
      // if coming from ?service=id, pre-select everything
      const preselect = searchParams.get('service');
      if (preselect) {
        const svc = all.find((s) => s.id === preselect);
        if (svc) {
          setPlatform(svc.platform);
          setCategory(svc.category);
          setSelectedId(svc.id);
        }
      }
    }).catch(() => {});
  }, []);

  // reset downstream when service changes
  useEffect(() => {
    setQuantity(0);
    setQuantityConfirmed(false);
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponCode('');
  }, [selectedId]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setValidating(true);
    try {
      const res = await couponsApi.validate(couponCode, basePrice);
      const { coupon } = res.data;
      setCouponDiscount(coupon.discountAmount);
      setCouponApplied(true);
      toast.success(`¡Cupón aplicado! Ahorrás ${formatCurrency(coupon.discountAmount)}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Cupón inválido';
      toast.error(msg);
    } finally {
      setValidating(false);
    }
  };

  const hasEnoughBalance = loggedIn && userBalance >= finalPrice && finalPrice > 0;

  const handleCheckout = async () => {
    if (!loggedIn) {
      toast.error('Necesitás una cuenta para hacer pedidos');
      router.push('/register?redirect=/order');
      return;
    }
    if (!link.trim())  { toast.error('Ingresá tu usuario o link'); return; }
    if (!email.trim()) { toast.error('Ingresá tu email'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Email inválido'); return; }
    const linkVal = link.trim();

    // Validación de link según el tipo de servicio
    if (selected?.platform === 'instagram') {
      const lowerLink = linkVal.toLowerCase();

      // VIEWS = solo para videos/reels (NO fotos)
      if (selected.category === 'views') {
        if (!lowerLink.includes('/reel/') && !lowerLink.includes('/tv/') && !lowerLink.includes('/video/')) {
          toast.error('⚠️ Este servicio es SOLO para VIDEOS/REELS. Para fotos, usá el servicio de Likes. El link debe contener /reel/ o /tv/');
          return;
        }
      }

      // LIKES = para posts y reels (fotos Y videos)
      if (selected.category === 'likes') {
        if (!lowerLink.includes('/p/') && !lowerLink.includes('/reel/') && !lowerLink.includes('/tv/')) {
          toast.error('⚠️ El link debe ser de un POST o REEL. Ejemplo: instagram.com/p/... o instagram.com/reel/...');
          return;
        }
      }
    }

    if (isFollowers) {
      const username = linkVal.replace(/^@/, '').replace(/^https?:\/\/.+\//, '').replace(/\/$/, '');
      if (!username || username.length < 2 || /\s/.test(username)) {
        toast.error('Usuario inválido. Ingresá solo el nombre de usuario, ej: @tuusuario');
        return;
      }
    } else {
      if (!linkVal.startsWith('http')) {
        toast.error('Ingresá el link completo del post, ej: https://www.instagram.com/p/...');
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
      toast.success('¡Pedido creado! Saldo descontado correctamente.');
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { insufficientBalance?: boolean; message?: string } } })?.response?.data;
      if (errData?.insufficientBalance) {
        setShowFundsModal(true);
      } else {
        toast.error(errData?.message ?? 'Error al procesar. Intentá de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator ──────────────────────────────────────────────────────────
  const STEPS = ['Plataforma', 'Servicio', 'Paquete', 'Datos', 'Pagar'];

  return (
    <div className="min-h-screen bg-dark-300">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="text-4xl font-black text-white mb-3">
              Hacer un <span className="gradient-text">Pedido</span>
            </h1>
            <p className="text-slate-400">Elegí el servicio, la cantidad y pagá con MercadoPago.</p>
          </motion.div>

          {/* Progress steps */}
          <div className="flex items-center justify-center gap-1 mb-10 flex-wrap">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return (
                <div key={s} className="flex items-center gap-1">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    done   ? 'bg-green-500/20 text-green-400' :
                    active ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/40' :
                             'text-slate-600'
                  }`}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 text-center">{n}</span>}
                    {s}
                  </div>
                  {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700" />}
                </div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">

            {/* ── STEP 1: Platform ─────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="glass-card p-8">
                  <h2 className="text-white font-bold text-xl mb-6 text-center">¿En qué plataforma?</h2>
                  {services.length === 0 ? (
                    <div className="text-center py-8 text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Cargando servicios...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {PLATFORMS.filter((p) => availablePlatforms.includes(p.id)).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setPlatform(p.id); setCategory(''); setSelectedId(''); }}
                          className="group relative overflow-hidden rounded-2xl p-6 text-center transition-all hover:scale-105 active:scale-95 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10"
                        >
                          <div className="text-5xl mb-3">{p.emoji}</div>
                          <div className="text-white font-bold text-lg">{p.label}</div>
                          <div className="text-slate-400 text-xs mt-1">
                            {services.filter((s) => s.platform === p.id).length} servicios
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
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="glass-card p-8">
                  <button onClick={() => setPlatform('')} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
                    ← Volver
                  </button>
                  <h2 className="text-white font-bold text-xl mb-6 text-center">¿Qué tipo de servicio?</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {categories.map((cat) => {
                      const meta = CATEGORY_LABELS[cat] ?? { label: cat, emoji: '⚡' };
                      const count = services.filter((s) => s.platform === platform && s.category === cat).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => { setCategory(cat); setSelectedId(''); }}
                          className="rounded-2xl p-6 text-center transition-all hover:scale-105 active:scale-95 border border-white/10 hover:border-primary-500/40 bg-white/5 hover:bg-primary-500/10"
                        >
                          <div className="text-4xl mb-3">{meta.emoji}</div>
                          <div className="text-white font-bold">{meta.label}</div>
                          <div className="text-slate-400 text-xs mt-1">{count} opción{count !== 1 ? 'es' : ''}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Service variant ──────────────────────────────────── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="glass-card p-8">
                  <button onClick={() => setCategory('')} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
                    ← Volver
                  </button>
                  <h2 className="text-white font-bold text-xl mb-6 text-center">Elegí el tipo</h2>
                  <div className="space-y-3">
                    {filteredServices.map((svc) => {
                      const minPrice = parseFloat((svc.price_per_unit * svc.min_quantity).toFixed(2));
                      const isBasic = svc.name.toLowerCase().includes('básico') || svc.name.toLowerCase().includes('basic');
                      return (
                        <button
                          key={svc.id}
                          onClick={() => setSelectedId(svc.id)}
                          className={`w-full text-left rounded-2xl p-5 border transition-all flex items-center justify-between group ${isBasic ? 'border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10' : 'border-white/10 hover:border-primary-500/40 bg-white/5 hover:bg-primary-500/10'}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-white font-semibold">{svc.name}</div>
                              {isBasic && (
                                <div className="flex items-center gap-1 text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded-full">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Puede caerse</span>
                                </div>
                              )}
                            </div>
                            {svc.description && (
                              <div className="text-slate-400 text-xs mt-1 mb-1.5">{svc.description}</div>
                            )}
                            <div className="text-slate-500 text-xs flex items-center gap-3">
                              <span>⚡ {svc.delivery_speed}</span>
                              <span>📦 {formatNumber(svc.min_quantity)}–{formatNumber(svc.max_quantity)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4 shrink-0">
                            <div className="text-right">
                              <div className="text-xs text-slate-500">desde</div>
                              <div className="text-primary-400 font-bold text-sm">{formatCurrency(minPrice)}</div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-primary-400 transition-colors" />
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
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="glass-card p-8">
                  <button onClick={() => setSelectedId('')} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
                    ← Volver
                  </button>
                  <h2 className="text-white font-bold text-xl mb-2 text-center">Elegí el paquete</h2>
                  <p className="text-slate-400 text-sm text-center mb-8">{selected.name}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {getPresets(selected).map((qty) => {
                      const price = parseFloat((selected.price_per_unit * qty).toFixed(2));
                      const isActive = quantity === qty;
                      return (
                        <button
                          key={qty}
                          onClick={() => {
                            setQuantity(qty);
                            setTimeout(() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }, 150);
                          }}
                          className={`rounded-2xl p-4 text-center border transition-all hover:scale-105 active:scale-95 ${
                            isActive
                              ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500/40'
                              : 'border-white/10 bg-white/5 hover:border-primary-500/40 hover:bg-primary-500/10'
                          }`}
                        >
                          <div className={`text-2xl font-black mb-1 ${isActive ? 'text-primary-400' : 'text-white'}`}>
                            {formatNumber(qty)}
                          </div>
                          <div className="text-slate-400 text-xs capitalize mb-2">{CATEGORY_LABELS[selected.category]?.label ?? selected.category}</div>
                          <div className={`text-sm font-bold ${isActive ? 'text-primary-300' : 'text-slate-300'}`}>
                            {formatCurrency(price)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-8">
                    <h3 className="text-slate-300 text-sm font-semibold mb-3 flex items-center gap-2">
                      Ajustar cantidad manualmente
                    </h3>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>Mín: {formatNumber(selected.min_quantity)}</span>
                        <span>Máx: {formatNumber(selected.max_quantity)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={selected.min_quantity}
                          max={selected.max_quantity}
                          step={1}
                          value={quantity || selected.min_quantity}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            if (Number.isNaN(raw)) return;
                            const clamped = Math.min(Math.max(raw, selected.min_quantity), selected.max_quantity);
                            setQuantity(clamped);
                          }}
                          className="input-field flex-1"
                        />
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-2xl font-black text-white">
                          {formatNumber(quantity || selected.min_quantity)}
                        </div>
                        <div className="text-sm text-slate-300">
                          {formatCurrency((quantity || selected.min_quantity) * selected.price_per_unit)}
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <button
                          onClick={() => setQuantity(selected.min_quantity)}
                          className="py-2 px-3 rounded-xl border border-white/10 hover:border-primary-400 hover:text-primary-300 transition"
                        >
                          Min ({formatNumber(selected.min_quantity)})
                        </button>
                        <button
                          onClick={() => setQuantity(selected.max_quantity)}
                          className="py-2 px-3 rounded-xl border border-white/10 hover:border-primary-400 hover:text-primary-300 transition"
                        >
                          Máx ({formatNumber(selected.max_quantity)})
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => {
                        const confirmedQty = quantity || selected.min_quantity;
                        setQuantity(confirmedQty);
                        setQuantityConfirmed(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
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
              <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
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
                      {isFollowers ? <AtSign className="w-4 h-4 text-primary-400" /> : <Link2 className="w-4 h-4 text-primary-400" />}
                      {isFollowers ? 'Tu usuario de ' + platform.charAt(0).toUpperCase() + platform.slice(1) : 'Link del post'}
                    </label>
                    <input
                      type="text"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder={linkPlaceholder}
                      className="input-field"
                      autoFocus
                    />

                    {/* Warning based on service type */}
                    {selected?.platform === 'instagram' && selected?.category === 'views' && (
                      <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        ⚠️ SOLO para VIDEOS/REELS (instagram.com/reel/...). NO funciona con fotos.
                      </p>
                    )}
                    {selected?.platform === 'instagram' && selected?.category === 'likes' && (
                      <p className="text-xs text-blue-400 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Para FOTOS: instagram.com/p/... | Para REELS: instagram.com/reel/...
                      </p>
                    )}

                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {isFollowers ? 'Tu cuenta debe estar en público' : 'Asegurate que el post sea público'}
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
                              <img src={linkPreview.image} alt={linkPreview.title ?? 'Preview'} className="w-full h-40 object-cover" />
                            )}
                            <div className="p-4">
                              <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">{linkPreview.site}</div>
                              <h4 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                                {linkPreview.title ?? 'Contenido encontrado'}
                              </h4>
                              {linkPreview.description && (
                                <p className="text-slate-400 text-xs line-clamp-3">{linkPreview.description}</p>
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
                    <label className="block text-sm font-semibold text-slate-300 mb-3">📧 Email para seguimiento del pedido</label>
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
                      <Tag className="w-4 h-4 text-primary-400" /> Cupón de descuento <span className="text-slate-500 font-normal">(opcional)</span>
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponApplied(false); setCouponDiscount(0); }}
                        placeholder="BOOST20"
                        className="input-field flex-1 uppercase tracking-widest"
                        disabled={couponApplied}
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={!couponCode || validating || couponApplied}
                        className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                          couponApplied
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30'
                        }`}
                      >
                        {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : couponApplied ? '✓ Aplicado' : 'Aplicar'}
                      </button>
                    </div>
                  </div>

                  {/* Order summary + pay */}
                  <div className="glass-card p-6">
                    <h3 className="text-white font-bold text-lg mb-4">Resumen del pedido</h3>
                    <div className="space-y-3 mb-5">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Servicio</span>
                        <span className="text-white text-right max-w-[200px] text-xs leading-snug">{selected.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Cantidad</span>
                        <span className="text-white font-semibold">{formatNumber(quantity)} {CATEGORY_LABELS[selected.category]?.label ?? ''}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Entrega</span>
                        <span className="text-white">⚡ {selected.delivery_speed}</span>
                      </div>
                      {couponApplied && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">Descuento ({couponCode})</span>
                          <span className="text-green-400 font-semibold">−{formatCurrency(couponDiscount)}</span>
                        </div>
                      )}
                      <div className="border-t border-white/[0.08] pt-3 flex justify-between items-center">
                        <span className="text-white font-bold text-lg">Total</span>
                        <div className="text-right">
                          {couponApplied && (
                            <div className="text-slate-500 text-xs line-through">{formatCurrency(basePrice)}</div>
                          )}
                          <div className="text-primary-400 font-black text-3xl">{formatCurrency(finalPrice)}</div>
                        </div>
                      </div>
                      {loggedIn && (
                        <div className={`flex justify-between text-xs pt-1 ${
                          hasEnoughBalance ? 'text-green-400' : 'text-slate-500'
                        }`}>
                          <span>Tu saldo</span>
                          <span className="font-semibold">{formatCurrency(userBalance)}{hasEnoughBalance ? ' ✓' : ' (insuficiente)'}</span>
                        </div>
                      )}
                    </div>

                    {!hasEnoughBalance && finalPrice > 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <p className="text-xs text-amber-300">
                          Saldo insuficiente. Necesitás {formatCurrency(finalPrice)} y tenés {formatCurrency(userBalance)}.
                        </p>
                        <button
                          onClick={() => router.push('/add-funds')}
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
                      {loading
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : <><Wallet className="w-5 h-5" /> {hasEnoughBalance ? `Pagar con Saldo — ${formatCurrency(finalPrice)}` : 'Saldo insuficiente — Cargar saldo'}</>
                      }
                    </button>

                    <p className="text-center text-slate-500 text-xs mt-3 flex items-center justify-center gap-1.5">
                      🔒 Pago 100% seguro · Los seguidores se entregan automáticamente
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
                <div className="text-white font-bold">{formatNumber(quantity)} · <span className="text-primary-400">{formatCurrency(finalPrice)}</span></div>
              </div>
              {step === 5 && (
                <button
                  onClick={handleCheckout}
                  disabled={loading || !link.trim() || !email.trim()}
                  className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wallet className="w-4 h-4" /> Pagar</>}
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFundsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setShowFundsModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-5">
                <Wallet className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Saldo insuficiente</h2>
              <p className="text-slate-400 text-sm mb-1">Necesitás <span className="text-white font-semibold">{formatCurrency(finalPrice)}</span> para este pedido.</p>
              <p className="text-slate-400 text-sm mb-6">Tu saldo actual: <span className="text-amber-400 font-semibold">{formatCurrency(userBalance)}</span></p>
              <p className="text-slate-500 text-xs mb-6">Cargá saldo a tu cuenta vía MercadoPago y volvé a hacer el pedido.</p>
              <button
                onClick={() => router.push(`/add-funds?amount=${Math.ceil(finalPrice - userBalance)}`)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" /> Cargar saldo ahora
              </button>
              <button onClick={() => setShowFundsModal(false)} className="mt-3 text-slate-500 hover:text-slate-300 text-sm w-full">Cancelar</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-300 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OrderContent />
    </Suspense>
  );
}

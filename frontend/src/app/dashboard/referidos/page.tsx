'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Gift, Users, DollarSign, Clock, Copy, CheckCircle,
  ArrowLeft, TrendingUp, Share2, ChevronRight, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { authApi } from '@/lib/api';
import { getStoredUser, isAuthenticated } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { User } from '@/types';

interface Referral {
  id: string;
  referred_name: string;
  referred_email: string;
  referred_total_spent: number;
  spend_threshold: number;
  reward_amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface ReferralSummary {
  total: number;
  pending: number;
  qualified: number;
  totalEarned: number;
  rewardAmount: number;
  spendThreshold: number;
}

export default function ReferidosPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [referralUrl, setReferralUrl] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const u = getStoredUser();
    setUser(u);
    if (u?.referral_code) {
      setReferralUrl(`${window.location.origin}/register?ref=${u.referral_code}`);
    }
    authApi.getMyReferrals()
      .then((res) => {
        setReferrals(res.data.referrals ?? []);
        setSummary(res.data.summary ?? null);
      })
      .catch(() => toast.error('Error al cargar referidos'))
      .finally(() => setLoading(false));
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    toast.success('¡Link copiado!');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(user?.referral_code ?? '');
    toast.success('¡Código copiado!');
  };

  const shareWhatsApp = () => {
    const msg = `🚀 Crecé en redes con FollowArg! Seguidores, likes y vistas reales para Instagram, TikTok y YouTube.\n\nUsá mi link para registrarte y empezar hoy: ${referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const STATS = [
    { label: 'Total invitados', value: summary?.total ?? 0, icon: Users, color: 'text-primary-400', bg: 'bg-primary-500/20', border: 'border-primary-500/20' },
    { label: 'Calificados', value: summary?.qualified ?? 0, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/20' },
    { label: 'Pendientes', value: summary?.pending ?? 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/20' },
    { label: 'Total ganado', value: formatCurrency(summary?.totalEarned ?? 0), icon: DollarSign, color: 'text-primary-400', bg: 'bg-primary-500/20', border: 'border-primary-500/20' },
  ];

  return (
    <div className="min-h-screen bg-dark-300">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-5 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver al dashboard
            </Link>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white">
                  Programa de <span className="gradient-text">Referidos</span>
                </h1>
                <p className="text-slate-400 mt-2 text-sm">
                  Invitá amigos y ganás{' '}
                  <span className="text-primary-400 font-semibold">{formatCurrency(summary?.rewardAmount ?? 0)}</span>{' '}
                  por cada uno que gaste{' '}
                  <span className="text-white font-semibold">{formatCurrency(summary?.spendThreshold ?? 0)}</span> o más.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 glass-card px-4 py-3 border-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs text-slate-500">Ganado total</div>
                  <div className="text-white font-black">{formatCurrency(summary?.totalEarned ?? 0)}</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`glass-card p-4 sm:p-5 border ${s.border}`}
              >
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className="text-xl sm:text-2xl font-black text-white">{s.value}</div>
                <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Referral link card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-6 mb-5 border-primary-500/20 relative overflow-hidden"
          >
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary-500/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="w-5 h-5 text-primary-400" />
                <h2 className="text-white font-bold">Tu link de referido</h2>
              </div>

              {/* URL */}
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="flex-1 bg-dark-200/80 border border-white/10 rounded-xl px-4 py-3 text-slate-400 text-xs sm:text-sm font-mono truncate">
                  {referralUrl || 'Cargando...'}
                </div>
                <button onClick={copyLink} className="btn-secondary flex items-center justify-center gap-2 text-sm py-2.5 px-5 whitespace-nowrap">
                  <Copy className="w-4 h-4" /> Copiar link
                </button>
              </div>

              {/* Code + actions */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2 glass-card px-3 py-2 border-primary-500/25">
                  <span className="text-slate-500 text-xs">Código:</span>
                  <code className="text-primary-400 font-mono font-bold tracking-widest text-sm">{user?.referral_code}</code>
                  <button onClick={copyCode} className="text-slate-500 hover:text-white transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-sm font-semibold transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.528 5.859L.057 23.625c-.095.351.228.674.579.579l5.766-1.471A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.921 0-3.73-.48-5.32-1.33L2.68 21.76l1.09-4.08A9.941 9.941 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  Compartir por WhatsApp
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: 'FollowArg', text: '¡Crecé en redes con FollowArg!', url: referralUrl });
                    } else {
                      copyLink();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-slate-400 hover:text-white text-sm font-semibold transition-all"
                >
                  <Share2 className="w-4 h-4" /> Compartir
                </button>
              </div>
            </div>
          </motion.div>

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-5 mb-5"
          >
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-400" /> ¿Cómo funciona?
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { n: '1', title: 'Compartís tu link', desc: 'Enviá el link a amigos, clientes o seguidores. También podés compartirlo en tus redes.' },
                { n: '2', title: 'Se registran gratis', desc: 'Tu contacto crea una cuenta sin costo usando tu link o código de referido.' },
                { n: '3', title: 'Ganás cuando compran', desc: `Cuando gastan ${formatCurrency(summary?.spendThreshold ?? 0)} o más, recibís ${formatCurrency(summary?.rewardAmount ?? 0)} en tu saldo automáticamente.` },
              ].map((s) => (
                <div key={s.n} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 font-bold text-sm flex-shrink-0 mt-0.5">
                    {s.n}
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">{s.title}</div>
                    <div className="text-slate-500 text-xs mt-1 leading-relaxed">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Referrals list */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-card p-6"
          >
            <h2 className="text-white font-bold mb-5 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-400" />
              Tus referidos
              <span className="text-slate-500 font-normal text-sm">({referrals.length})</span>
            </h2>

            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-white/[0.04] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-slate-600" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Todavía no referiste a nadie</p>
                <p className="text-slate-600 text-xs mt-1 mb-5">Compartí tu link y empezá a ganar hoy</p>
                <button onClick={copyLink} className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 mx-auto">
                  <Copy className="w-4 h-4" /> Copiar mi link
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((ref) => {
                  const spent = Number(ref.referred_total_spent);
                  const threshold = Number(ref.spend_threshold);
                  const progress = Math.min((spent / threshold) * 100, 100);
                  const isQualified = ref.status === 'qualified' || ref.status === 'paid';
                  return (
                    <motion.div
                      key={ref.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500/30 to-purple-600/30 border border-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-sm flex-shrink-0">
                            {ref.referred_name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <div className="text-white text-sm font-semibold">{ref.referred_name}</div>
                            <div className="text-slate-500 text-xs">{ref.referred_email}</div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {isQualified ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
                              <CheckCircle className="w-3 h-3" /> +{formatCurrency(Number(ref.reward_amount))}
                            </span>
                          ) : (
                            <div className="text-right">
                              <div className="text-xs text-slate-400 font-semibold">{formatCurrency(spent)}</div>
                              <div className="text-xs text-slate-600">de {formatCurrency(threshold)}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 mb-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${isQualified ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary-500 to-purple-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>{isQualified ? '✅ Calificado' : `${Math.round(progress)}% del objetivo`}</span>
                        {ref.paid_at && <span>Recompensa: {formatDate(ref.paid_at)}</span>}
                        {!ref.paid_at && <span>Registrado: {formatDate(ref.created_at)}</span>}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Summary footer */}
                {referrals.some(r => r.status === 'qualified' || r.status === 'paid') && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-sm">
                    <span className="text-slate-500">Total acreditado en tu cuenta</span>
                    <span className="text-emerald-400 font-black text-lg">{formatCurrency(summary?.totalEarned ?? 0)}</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* CTA bottom */}
          {referrals.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-5 text-center"
            >
              <p className="text-slate-500 text-sm mb-3">
                Cuantos más referidos califiquen, más ganás. Sin límite.
              </p>
              <button onClick={shareWhatsApp} className="btn-primary flex items-center gap-2 mx-auto text-sm">
                <Share2 className="w-4 h-4" /> Compartir mi link ahora
              </button>
            </motion.div>
          )}

        </div>
      </div>
      <Footer />
    </div>
  );
}

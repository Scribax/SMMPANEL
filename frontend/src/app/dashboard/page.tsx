"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Package,
  Clock,
  CheckCircle,
  RefreshCw,
  Copy,
  LogOut,
  User,
  DollarSign,
  ExternalLink,
  PlusCircle,
  X,
  ArrowUpRight,
  Wallet,
  Lock,
  Loader2,
  Users,
  Gift,
  TrendingUp,
  MessageCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { ordersApi, paymentsApi, authApi, ticketsApi } from "@/lib/api";
import { Order, User as UserType } from "@/types";
import type { Ticket } from "@/types/tickets";
import { getStoredUser, clearAuth, isAuthenticated, setAuth } from "@/lib/auth";
import {
  formatCurrency,
  formatDate,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/utils";

interface Deposit {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const DEPOSIT_PRESETS = [500, 1000, 2000, 5000];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "wallet" | "account">(
    "orders",
  );

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [pwForm, setPwForm] = useState({ current: "", next: "", show: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [referrals, setReferrals] = useState<
    Array<{
      id: string;
      referred_name: string;
      referred_email: string;
      referred_total_spent: number;
      spend_threshold: number;
      reward_amount: number;
      status: string;
      paid_at: string | null;
      created_at: string;
    }>
  >([]);
  const [referralSummary, setReferralSummary] = useState<{
    total: number;
    pending: number;
    qualified: number;
    totalEarned: number;
    rewardAmount: number;
    spendThreshold: number;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [unreadTickets, setUnreadTickets] = useState<number>(0);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const previousUnreadRef = useRef<number>(0);

  const STATUS_TIMELINE = [
    { key: "pending", label: "Recibido" },
    { key: "processing", label: "Procesando" },
    { key: "in_progress", label: "Entregando" },
    { key: "completed", label: "Listo" },
  ];
  const TIMELINE_ORDER = STATUS_TIMELINE.map((s) => s.key);
  const TERMINAL_STATUSES = ["cancelled", "failed", "refunded", "partial"];

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    const u = getStoredUser();
    setUser(u);
    fetchOrders(1);
    fetchDeposits();
    refreshBalance();
    fetchReferrals();
    fetchTickets();
  }, []);

  const fetchDeposits = async () => {
    try {
      const res = await paymentsApi.getDeposits();
      setDeposits(res.data.deposits ?? []);
    } catch {
      /* silent */
    }
  };

  const fetchTickets = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      if (!silent) setTicketsLoading(true);
      const res = await ticketsApi.getMyTickets(1, 6);
      if (res.data.success) {
        const list: Ticket[] = res.data.tickets ?? [];
        setTickets(list);
        const unread = list.filter((t) => !t.last_message_is_admin).length;
        setUnreadTickets(unread);
        previousUnreadRef.current = unread;
      }
    } catch (error) {
      toast.error("Error cargando tickets");
    } finally {
      if (!silent) setTicketsLoading(false);
    }
  };

  const refreshBalance = async () => {
    try {
      const res = await authApi.getMe();
      const updated = res.data.user;
      setUser(updated);
      setAuth(localStorage.getItem("FollowArg_token") ?? "", updated);
    } catch {
      /* silent */
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 100) {
      toast.error("El monto mínimo es $100 ARS");
      return;
    }
    setDepositLoading(true);
    try {
      const res = await paymentsApi.createDeposit(amount);
      const url = res.data.initPoint;
      window.location.href = url;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al crear la recarga";
      toast.error(msg);
    } finally {
      setDepositLoading(false);
    }
  };

  const fetchOrders = async (p: number) => {
    setLoading(true);
    try {
      const res = await ordersApi.getMyOrders(p, 10);
      setOrders(res.data.orders ?? []);
      setTotal(res.data.total ?? 0);
      setPage(p);
      // Fetch global counts only on first load
      if (p === 1) {
        const [comp, prog] = await Promise.all([
          ordersApi.getMyOrders(1, 1000),
          Promise.resolve(null),
        ]);
        const all: Order[] = comp.data.orders ?? [];
        setCompletedCount(all.filter((o) => o.status === "completed").length);
        setInProgressCount(
          all.filter((o) => ["processing", "in_progress"].includes(o.status))
            .length,
        );
      }
    } catch {
      toast.error("Error al cargar los pedidos");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    try {
      await ordersApi.cancel(orderId);
      toast.success("Pedido cancelado. Saldo devuelto.");
      fetchOrders(page);
      refreshBalance();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "No se puede cancelar este pedido";
      toast.error(msg);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.next) {
      toast.error("Completá ambos campos");
      return;
    }
    if (pwForm.next.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }
    setPwLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      });
      toast.success("Contraseña actualizada");
      setPwForm({ current: "", next: "", show: false });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al cambiar contraseña";
      toast.error(msg);
    } finally {
      setPwLoading(false);
    }
  };

  const handleRefill = async (orderId: string) => {
    try {
      await ordersApi.requestRefill(orderId);
      toast.success("¡Recarga solicitada!");
      fetchOrders(page);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al solicitar recarga";
      toast.error(msg);
    }
  };

  const fetchReferrals = async () => {
    try {
      const res = await authApi.getMyReferrals();
      setReferrals(res.data.referrals ?? []);
      setReferralSummary(res.data.summary ?? null);
    } catch {
      /* silent */
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("¡Copiado!");
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/");
  };

  // Background polling for new ticket replies
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTickets({ silent: true });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };
    if (sidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen]);

  const totalPages = Math.ceil(total / 10);

  const statusStats = orders.reduce((acc: Record<string, number>, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const depositStatusLabel: Record<string, string> = {
    pending: "Pendiente",
    approved: "Acreditado",
    rejected: "Rechazado",
  };
  const depositStatusColor: Record<string, string> = {
    pending: "text-yellow-400 bg-yellow-400/10",
    approved: "text-green-400 bg-green-400/10",
    rejected: "text-red-400 bg-red-400/10",
  };

  return (
    <div className="min-h-screen bg-dark-300">
      <Navbar />

      {/* Tickets Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            ref={sidebarRef}
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed right-0 top-16 bottom-0 w-full sm:w-80 bg-dark-200/95 border-l border-white/10 shadow-xl z-40 flex flex-col"
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">
                  Soporte
                </div>
                <div className="text-white font-semibold flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary-400" />
                  Tus tickets
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-500 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {ticketsLoading ? (
                <div className="text-center text-slate-500 text-sm py-6">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Cargando tickets...
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-6">
                  No tenés tickets abiertos.
                  <div className="mt-2">
                    <Link
                      href="/dashboard/tickets"
                      className="text-primary-400 hover:text-primary-300 text-xs underline"
                    >
                      Abrir centro de soporte
                    </Link>
                  </div>
                </div>
              ) : (
                tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      window.location.href = `/dashboard/tickets?ticket=${t.id}`;
                    }}
                    className="w-full text-left bg-dark-100/80 hover:bg-dark-100 border border-white/10 hover:border-primary-400/40 rounded-xl px-3 py-2 text-sm transition flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white font-semibold text-xs line-clamp-1">
                        {t.subject}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide ${
                          t.status === "open"
                            ? "bg-blue-500/20 text-blue-300"
                            : t.status === "in_progress"
                              ? "bg-amber-500/20 text-amber-300"
                              : t.status === "resolved"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-slate-500/20 text-slate-300"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    {t.last_message_excerpt && (
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {t.last_message_excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span>
                        {t.last_message_is_admin
                          ? "Respondido por soporte"
                          : "Tu último mensaje"}
                      </span>
                      <span>
                        {t.last_message_at
                          ? formatDate(t.last_message_at)
                          : formatDate(t.created_at)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="px-3 py-2 border-t border-white/10 text-[11px] text-slate-500 flex items-center justify-between">
              <span>
                {unreadTickets > 0
                  ? `${unreadTickets} ticket(s) sin leer`
                  : "Todo al día ✅"}
              </span>
              <Link
                href="/dashboard/tickets"
                className="text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1"
              >
                Ver todo <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDepositModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-5 sm:p-8 w-full max-w-md relative"
            >
              <button
                onClick={() => setShowDepositModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">
                    Agregar saldo
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Saldo actual:{" "}
                    <span className="text-primary-400 font-semibold">
                      {formatCurrency(user?.balance ?? 0)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {DEPOSIT_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setDepositAmount(String(p))}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      depositAmount === String(p)
                        ? "bg-primary-500/20 border-primary-500/50 text-primary-300"
                        : "border-white/[0.08] text-slate-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {formatCurrency(p)}
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Monto personalizado (ARS)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="1000"
                    className="input-field pl-7"
                  />
                </div>
                <p className="text-slate-500 text-xs mt-1.5">
                  Mínimo: $100 ARS
                </p>
              </div>

              <button
                onClick={handleDeposit}
                disabled={depositLoading || !depositAmount}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {depositLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4" /> Ir a pagar con
                    MercadoPago
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Dashboard
              </h1>
              <p className="text-slate-400 mt-1">
                Bienvenido, {user?.name?.split(" ")[0]} 👋
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="relative flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
              >
                <MessageCircle className="w-4 h-4" />
                Tickets
                {unreadTickets > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadTickets}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowDepositModal(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> Agregar saldo
              </button>
              <Link
                href="/order"
                className="btn-primary flex items-center gap-2"
              >
                <Zap className="w-4 h-4" /> Nuevo pedido
              </Link>
            </div>
          </div>

          {/* Balance Hero Card */}
          <div className="glass-card p-6 mb-6 border-primary-500/20 bg-gradient-to-r from-primary-500/10 to-purple-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Saldo disponible</p>
                <p className="text-4xl font-black text-white">
                  {formatCurrency(user?.balance ?? 0)}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  Usarás este saldo para pagar tus pedidos instantáneamente
                </p>
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
                <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-3">
              <button
                onClick={() => {
                  setShowDepositModal(true);
                }}
                className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> Agregar saldo
              </button>
              <button
                onClick={refreshBalance}
                className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Actualizar
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
            {[
              {
                label: "Total pedidos",
                value: total,
                icon: Package,
                color: "text-primary-400",
              },
              {
                label: "Completados",
                value: completedCount,
                icon: CheckCircle,
                color: "text-green-400",
              },
              {
                label: "En proceso",
                value: inProgressCount,
                icon: Clock,
                color: "text-blue-400",
              },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-3 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-slate-400 text-[10px] sm:text-sm leading-tight">
                    {stat.label}
                  </span>
                  <stat.icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${stat.color}`}
                  />
                </div>
                <div className="text-xl sm:text-2xl font-black text-white">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-none pb-1">
            {(
              [
                ["orders", "Mis pedidos"],
                ["wallet", "Mis recargas"],
                ["account", "Mi cuenta"],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-primary-500/20 border border-primary-500/40 text-primary-300"
                    : "glass-card text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-card p-5 animate-pulse">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2.5">
                          <div className="flex items-center gap-3">
                            <div className="h-4 bg-white/10 rounded-lg w-44" />
                            <div className="h-5 bg-white/10 rounded-full w-20" />
                          </div>
                          <div className="flex gap-3">
                            <div className="h-3 bg-white/10 rounded w-36" />
                            <div className="h-3 bg-white/10 rounded w-10" />
                            <div className="h-3 bg-white/10 rounded w-14" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-8 bg-white/10 rounded-xl w-8" />
                          <div className="h-8 bg-white/10 rounded-xl w-20" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-white font-semibold text-lg mb-2">
                    Todavía no tenés pedidos
                  </h3>
                  <p className="text-slate-400 mb-6">
                    ¡Hacé tu primer pedido y empezá a crecer!
                  </p>
                  <Link
                    href="/order"
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" /> Hacer pedido
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order, i) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="glass-card p-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="text-white font-semibold truncate">
                              {order.service_name}
                            </span>
                            <span
                              className={`status-badge ${STATUS_COLORS[order.status]}`}
                            >
                              {STATUS_LABELS[order.status]}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              🔗 <span className="truncate">{order.link}</span>
                            </span>
                            <span>📦 {order.quantity.toLocaleString()}</span>
                            <span className="text-primary-400 font-semibold">
                              {formatCurrency(order.price)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-1.5">
                            {formatDate(order.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => copyToClipboard(order.id)}
                            className="p-2 glass-card hover:border-primary-500/30 transition-all"
                            title="Copy order ID"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                          {["pending", "awaiting_payment"].includes(
                            order.status,
                          ) && (
                            <button
                              onClick={() => handleCancel(order.id)}
                              className="flex items-center gap-1.5 px-3 py-2 glass-card hover:border-red-500/30 text-red-400 text-xs font-medium transition-all"
                            >
                              <X className="w-3.5 h-3.5" /> Cancelar
                            </button>
                          )}
                          {["completed", "partial"].includes(order.status) && (
                            <button
                              onClick={() => handleRefill(order.id)}
                              className="flex items-center gap-1.5 px-3 py-2 glass-card hover:border-primary-500/30 text-slate-300 text-xs font-medium transition-all"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Recargar
                            </button>
                          )}
                        </div>
                      </div>
                      {order.start_count !== null && order.remains !== null && (
                        <div className="mt-3 pt-3 border-t border-white/[0.06]">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                            <span>
                              Inicio: {order.start_count?.toLocaleString()}
                            </span>
                            <span>
                              Restante: {order.remains?.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, ((order.quantity - (order.remains ?? 0)) / order.quantity) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {/* Status Timeline — only for active/completed orders */}
                      {!TERMINAL_STATUSES.includes(order.status) && (
                        <div className="mt-3 pt-3 border-t border-white/[0.06]">
                          <div className="relative flex items-start">
                            {/* background line */}
                            <div className="pointer-events-none absolute left-[10%] right-[10%] top-[10px] h-px bg-white/10" />
                            {/* progress line */}
                            <div
                              className="pointer-events-none absolute left-[10%] top-[10px] h-px bg-gradient-to-r from-primary-500 to-emerald-400 transition-all duration-500"
                              style={{
                                width: `calc(80% * ${Math.max(0, TIMELINE_ORDER.indexOf(order.status)) / (TIMELINE_ORDER.length - 1)})`,
                              }}
                            />
                            {STATUS_TIMELINE.map((step, si) => {
                              const stepIndex = TIMELINE_ORDER.indexOf(
                                order.status,
                              );
                              const done = stepIndex > si;
                              const active = stepIndex === si;
                              return (
                                <div
                                  key={step.key}
                                  className="relative z-10 flex w-1/4 flex-col items-center gap-1"
                                >
                                  <div
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all ${
                                      done
                                        ? "bg-emerald-500 border-emerald-400 text-white"
                                        : active
                                          ? "bg-primary-500 border-primary-400 text-white shadow-md shadow-primary-500/40"
                                          : "bg-dark-300 border-white/20 text-slate-600"
                                    }`}
                                  >
                                    {done ? "✓" : si + 1}
                                  </div>
                                  <span
                                    className={`text-[8px] sm:text-[9px] uppercase tracking-wide text-center leading-tight ${
                                      active
                                        ? "text-primary-300"
                                        : done
                                          ? "text-emerald-400"
                                          : "text-slate-600"
                                    }`}
                                  >
                                    {step.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <button
                        disabled={page === 1}
                        onClick={() => fetchOrders(page - 1)}
                        className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
                      >
                        Anterior
                      </button>
                      <span className="text-slate-400 text-sm">
                        {page} / {totalPages}
                      </span>
                      <button
                        disabled={page === totalPages}
                        onClick={() => fetchOrders(page + 1)}
                        className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Wallet Tab */}
          {activeTab === "wallet" && (
            <div>
              {deposits.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-white font-semibold text-lg mb-2">
                    Sin recargas todavía
                  </h3>
                  <p className="text-slate-400 mb-6">
                    Agregá saldo para pagar pedidos al instante.
                  </p>
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" /> Agregar saldo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {deposits.map((dep, i) => (
                    <motion.div
                      key={dep.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="glass-card p-5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                          <ArrowUpRight className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">
                            {formatCurrency(dep.amount)}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {formatDate(dep.created_at)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`status-badge ${depositStatusColor[dep.status] ?? "text-slate-400 bg-slate-400/10"}`}
                      >
                        {depositStatusLabel[dep.status] ?? dep.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Account Tab */}
          {activeTab === "account" && user && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary-400" /> Perfil
                </h3>
                <div className="space-y-4">
                  {[
                    { label: "Nombre", value: user.name },
                    { label: "Email", value: user.email },
                    {
                      label: "Miembro desde",
                      value: formatDate(user.created_at),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-3 border-b border-white/[0.06]"
                    >
                      <span className="text-slate-400 text-sm">
                        {item.label}
                      </span>
                      <span className="text-white text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary-400" /> Programa de
                  referidos
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Invitá amigos y ganá{" "}
                  <span className="text-primary-400 font-bold">
                    {formatCurrency(referralSummary?.rewardAmount ?? 2000)}
                  </span>{" "}
                  cuando gasten{" "}
                  {formatCurrency(referralSummary?.spendThreshold ?? 2000)} o
                  más.
                </p>
                <div className="glass-card p-3 flex items-center justify-between mb-4 border-primary-500/20">
                  <code className="text-primary-400 font-mono font-bold tracking-widest">
                    {user.referral_code}
                  </code>
                  <button
                    onClick={() => copyToClipboard(user.referral_code)}
                    className="p-1.5 hover:text-white text-slate-400 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `${window.location.origin}/register?ref=${user.referral_code}`,
                    )
                  }
                  className="btn-secondary w-full text-sm flex items-center justify-center gap-2 mb-5"
                >
                  <ExternalLink className="w-4 h-4" /> Copiar link de referido
                </button>
                <Link
                  href="/dashboard/referidos"
                  className="btn-primary w-full text-sm flex items-center justify-center gap-2 mb-5"
                >
                  <Gift className="w-4 h-4" /> Ver panel completo de referidos
                </Link>

                {/* Referral stats */}
                {referralSummary && (
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-lg font-bold text-white">
                        {referralSummary.total}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Invitados
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-lg font-bold text-green-400">
                        {referralSummary.qualified}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Completados
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-lg font-bold text-primary-400">
                        {formatCurrency(referralSummary.totalEarned)}
                      </div>
                      <div className="text-[10px] text-slate-500">Ganado</div>
                    </div>
                  </div>
                )}

                {/* Referral list */}
                {referrals.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {referrals.map((ref) => {
                      const progress = Math.min(
                        (Number(ref.referred_total_spent) /
                          Number(ref.spend_threshold)) *
                          100,
                        100,
                      );
                      const isQualified =
                        ref.status === "qualified" || ref.status === "paid";
                      return (
                        <div
                          key={ref.id}
                          className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-sm text-white">
                                {ref.referred_name}
                              </span>
                              <span className="text-[10px] text-slate-600">
                                {ref.referred_email}
                              </span>
                            </div>
                            {isQualified ? (
                              <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                                +{formatCurrency(Number(ref.reward_amount))}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">
                                {formatCurrency(
                                  Number(ref.referred_total_spent),
                                )}{" "}
                                / {formatCurrency(Number(ref.spend_threshold))}
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${isQualified ? "bg-green-500" : "bg-primary-500"}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {referrals.length === 0 && (
                  <p className="text-center text-slate-600 text-xs">
                    Todavía no invitaste a nadie. ¡Compartí tu link!
                  </p>
                )}
              </div>

              <div className="glass-card p-6 md:col-span-2">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary-400" /> Cambiar
                  contraseña
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <input
                    type={pwForm.show ? "text" : "password"}
                    placeholder="Contraseña actual"
                    value={pwForm.current}
                    onChange={(e) =>
                      setPwForm((f) => ({ ...f, current: e.target.value }))
                    }
                    className="input-field"
                  />
                  <input
                    type={pwForm.show ? "text" : "password"}
                    placeholder="Nueva contraseña (mín. 8)"
                    value={pwForm.next}
                    onChange={(e) =>
                      setPwForm((f) => ({ ...f, next: e.target.value }))
                    }
                    className="input-field"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleChangePassword}
                    disabled={pwLoading}
                    className="btn-primary text-sm py-2 px-5 flex items-center gap-2 disabled:opacity-50"
                  >
                    {pwLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Guardar"
                    )}
                  </button>
                  <button
                    onClick={() => setPwForm((f) => ({ ...f, show: !f.show }))}
                    className="text-slate-500 hover:text-slate-300 text-xs"
                  >
                    {pwForm.show ? "Ocultar" : "Mostrar"} contraseñas
                  </button>
                </div>
              </div>

              <div className="glass-card p-6 md:col-span-2">
                <h3 className="text-white font-semibold mb-4">
                  Acciones de cuenta
                </h3>
                <div className="space-y-2">
                  <Link
                    href="/dashboard/tickets"
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> Soporte Técnico
                  </Link>
                  {user?.role === "admin" && (
                    <>
                      <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                      >
                        <TrendingUp className="w-4 h-4" /> Dashboard Admin
                      </Link>
                      <Link
                        href="/admin/tickets"
                        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" /> Gestión de Tickets
                      </Link>
                    </>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Cerrar sesión
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-24 right-6 z-40 w-12 h-12 rounded-full bg-primary-500 shadow-lg shadow-primary-500/40 flex items-center justify-center text-white hover:bg-primary-400 transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    </div>
  );
}

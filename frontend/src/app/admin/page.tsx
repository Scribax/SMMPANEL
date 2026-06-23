"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Users,
  Tag,
  Settings,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  UserCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  Plus,
  Edit,
  Eye,
  X,
  Loader2,
  CheckCircle,
  RotateCcw,
  BarChart2,
  MessageCircle,
  Mail,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import {
  formatCurrency,
  formatDate,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/utils";
import { Order, Service, OrderStatus } from "@/types";

type AdminTab =
  | "dashboard"
  | "orders"
  | "services"
  | "users"
  | "coupons"
  | "emails";

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  ordersByStatus: Record<string, number>;
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [coupons, setCoupons] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<
    Record<string, string | number | boolean>
  >({});
  const [savingService, setSavingService] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [openPlatforms, setOpenPlatforms] = useState<Record<string, boolean>>({
    instagram: true,
    tiktok: true,
    youtube: true,
  });
  const togglePlatformSection = (p: string) =>
    setOpenPlatforms((prev) => ({ ...prev, [p]: !prev[p] }));
  const [newService, setNewService] = useState({
    name: "",
    platform: "instagram",
    category: "followers",
    price_per_unit: "",
    min_quantity: "",
    max_quantity: "",
    delivery_speed: "1-3 days",
    provider_service_id: "",
  });

  // Estados para crear pedidos manualmente
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [newOrder, setNewOrder] = useState({
    userId: "",
    serviceId: "",
    quantity: "",
    link: "",
  });
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Estados para detalle de usuario y balance
  const [selectedUser, setSelectedUser] = useState<Record<string, unknown> | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [balanceAdjustment, setBalanceAdjustment] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustingBalance, setAdjustingBalance] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userStats, setUserStats] = useState<Record<string, unknown> | null>(null);
  const [emailForm, setEmailForm] = useState({
    audience: "active" as "all" | "active" | "selected",
    subject: "Hola {{name}}, tenemos novedades para vos",
    title: "Impulsá tus redes con FollowArg",
    message:
      "Hola {{name}},\n\nPreparamos una promo especial para que puedas seguir creciendo en Instagram, TikTok, YouTube y más.\n\nEntrá a tu cuenta, elegí tu servicio y hacé tu pedido en minutos.",
    ctaText: "Hacer pedido ahora",
    ctaUrl: "https://followarg.com/order",
  });
  const [selectedEmailUsers, setSelectedEmailUsers] = useState<string[]>([]);
  const [emailPreview, setEmailPreview] = useState<{
    subject: string;
    html: string;
  } | null>(null);
  const [previewingEmail, setPreviewingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    const user = getStoredUser();
    if (user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getStats();
      setStats(res.data.stats);
    } catch {
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async (page = 1, status = "") => {
    setLoading(true);
    try {
      const res = await adminApi.getOrders(page, 20, status || undefined);
      setOrders(res.data.orders ?? []);
      setOrdersTotal(res.data.total ?? 0);
      setOrdersPage(page);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getServices();
      setServices(res.data.services ?? []);
    } catch {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers(1, 200);
      setUsers(res.data.users ?? []);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCoupons();
      setCoupons(res.data.coupons ?? []);
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (t: AdminTab) => {
    setTab(t);
    if (t === "dashboard") loadDashboard();
    else if (t === "orders") loadOrders(1, statusFilter);
    else if (t === "services") loadServices();
    else if (t === "users" || t === "emails") loadUsers();
    else if (t === "coupons") loadCoupons();
  };

  const emailPayload = () => ({
    ...emailForm,
    userIds: selectedEmailUsers,
  });

  const previewMarketingEmail = async () => {
    setPreviewingEmail(true);
    try {
      const res = await adminApi.previewMarketingEmail(emailPayload());
      setEmailPreview(res.data.preview);
      toast.success("Preview generado");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "No se pudo generar el preview";
      toast.error(msg);
    } finally {
      setPreviewingEmail(false);
    }
  };

  const sendMarketingEmail = async () => {
    if (!emailPreview) {
      toast.error("Generá una previsualización antes de enviar");
      return;
    }
    const recipients =
      emailForm.audience === "selected"
        ? selectedEmailUsers.length
        : users.filter((u) =>
            emailForm.audience === "active" ? u.is_active !== false : true,
          ).length;
    const confirmed = window.confirm(
      `Vas a enviar este correo a ${recipients} usuario(s). ¿Continuar?`,
    );
    if (!confirmed) return;

    setSendingEmail(true);
    try {
      const res = await adminApi.sendMarketingEmail(emailPayload());
      toast.success(
        `Correos enviados: ${res.data.sent}/${res.data.total}. Fallidos: ${res.data.failed}`,
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "No se pudo enviar la campaña";
      toast.error(msg);
    } finally {
      setSendingEmail(false);
    }
  };

  const toggleEmailUser = (userId: string) => {
    setSelectedEmailUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const toggleServiceStatus = async (service: Service) => {
    try {
      await adminApi.updateService(service.id, {
        is_active: !service.is_active,
      });
      toast.success("Servicio actualizado");
      loadServices();
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const startEditService = (s: Service) => {
    setEditingService(s.id);
    setEditForm({
      name: s.name,
      price_per_unit: s.price_per_unit,
      min_quantity: s.min_quantity,
      max_quantity: s.max_quantity,
      delivery_speed: s.delivery_speed ?? "",
      provider_service_id: s.provider_service_id ?? "",
    });
  };

  const saveEditService = async (serviceId: string) => {
    setSavingService(true);
    try {
      await adminApi.updateService(serviceId, {
        name: editForm.name,
        price_per_unit: parseFloat(String(editForm.price_per_unit)),
        min_quantity: parseInt(String(editForm.min_quantity)),
        max_quantity: parseInt(String(editForm.max_quantity)),
        delivery_speed: editForm.delivery_speed,
        provider_service_id: editForm.provider_service_id
          ? parseInt(String(editForm.provider_service_id))
          : undefined,
      });
      toast.success("✅ Servicio guardado");
      setEditingService(null);
      loadServices();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSavingService(false);
    }
  };

  const createNewService = async () => {
    if (!newService.name || !newService.price_per_unit) {
      toast.error("Nombre y precio son requeridos");
      return;
    }
    setSavingService(true);
    try {
      await adminApi.createService({
        name: newService.name,
        platform: newService.platform,
        category: newService.category,
        price_per_unit: parseFloat(newService.price_per_unit),
        min_quantity: parseInt(newService.min_quantity) || 100,
        max_quantity: parseInt(newService.max_quantity) || 10000,
        delivery_speed: newService.delivery_speed,
        provider_service_id: newService.provider_service_id
          ? parseInt(newService.provider_service_id)
          : undefined,
      });
      toast.success("✅ Servicio creado");
      setShowNewService(false);
      setNewService({
        name: "",
        platform: "instagram",
        category: "followers",
        price_per_unit: "",
        min_quantity: "",
        max_quantity: "",
        delivery_speed: "1-3 days",
        provider_service_id: "",
      });
      loadServices();
    } catch {
      toast.error("Error al crear servicio");
    } finally {
      setSavingService(false);
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      await adminApi.toggleUser(userId);
      toast.success("User status updated");
      loadUsers();
    } catch {
      toast.error("Failed to update user");
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await adminApi.updateOrderStatus(orderId, status);
      toast.success("Order updated");
      loadOrders(ordersPage, statusFilter);
    } catch {
      toast.error("Failed to update order");
    }
  };

  const retryOrder = async (orderId: string) => {
    try {
      const res = await adminApi.retryOrder(orderId);
      toast.success(`✅ Reenviado al proveedor #${res.data.providerOrderId}`);
      loadOrders(ordersPage, statusFilter);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al reintentar";
      toast.error(msg);
    }
  };

  const refundOrder = async (orderId: string, amount?: number) => {
    try {
      await adminApi.refundOrder(orderId);
      toast.success(
        `✅ Reembolso procesado${amount ? ` ($${amount.toFixed(2)})` : ""}`,
      );
      loadOrders(ordersPage, statusFilter);
      loadDashboard();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al reembolsar";
      toast.error(msg);
    }
  };

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [alertOrders, setAlertOrders] = useState<Order[]>([]);

  const loadAlertOrders = async () => {
    try {
      const res = await adminApi.getOrders(1, 50, "alerts");
      setAlertOrders(res.data.orders ?? []);
    } catch {
      /* ignore */
    }
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  // Crear pedido manualmente desde admin
  const createOrder = async () => {
    if (!newOrder.userId || !newOrder.serviceId || !newOrder.quantity || !newOrder.link) {
      toast.error("Todos los campos son requeridos");
      return;
    }
    setCreatingOrder(true);
    try {
      const res = await adminApi.createOrder({
        userId: newOrder.userId,
        serviceId: newOrder.serviceId,
        quantity: parseInt(newOrder.quantity),
        link: newOrder.link,
      });
      toast.success(`✅ Pedido creado #${res.data.order.id}`);
      setShowCreateOrder(false);
      setNewOrder({ userId: "", serviceId: "", quantity: "", link: "" });
      loadOrders(ordersPage, statusFilter);
      loadDashboard();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al crear pedido";
      toast.error(msg);
    } finally {
      setCreatingOrder(false);
    }
  };

  // Ver detalle de usuario
  const openUserDetail = async (user: Record<string, unknown>) => {
    setSelectedUser(user);
    setShowUserDetail(true);
    try {
      const res = await adminApi.getUserDetail(String(user.id));
      setUserOrders(res.data.orders ?? []);
      setUserStats(res.data.stats ?? null);
    } catch {
      toast.error("Error al cargar detalle del usuario");
    }
  };

  // Ajustar saldo de usuario
  const adjustBalance = async () => {
    if (!selectedUser || !balanceAdjustment) return;
    const amount = parseFloat(balanceAdjustment);
    if (isNaN(amount) || amount === 0) {
      toast.error("Monto inválido");
      return;
    }
    setAdjustingBalance(true);
    try {
      const res = await adminApi.adjustUserBalance(
        String(selectedUser.id),
        amount,
        adjustmentReason || undefined
      );
      toast.success(`✅ Saldo ${amount > 0 ? "agregado" : "deducido"}: ${formatCurrency(Math.abs(amount))}`);
      setBalanceAdjustment("");
      setAdjustmentReason("");
      // Actualizar datos del usuario
      const userRes = await adminApi.getUserDetail(String(selectedUser.id));
      setSelectedUser(userRes.data.user);
      setUserOrders(userRes.data.orders ?? []);
      setUserStats(userRes.data.stats ?? null);
      loadUsers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al ajustar saldo";
      toast.error(msg);
    } finally {
      setAdjustingBalance(false);
    }
  };

  const NAV_ITEMS: { id: AdminTab; label: string; icon: React.ElementType }[] =
    [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "orders", label: "Orders", icon: ShoppingCart },
      { id: "services", label: "Services", icon: Package },
      { id: "users", label: "Users", icon: Users },
      { id: "coupons", label: "Coupons", icon: Tag },
      { id: "emails", label: "Correos", icon: Mail },
    ];

  return (
    <div className="min-h-screen bg-dark-300 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 border-r border-white/[0.06] bg-dark-300/80 backdrop-blur-xl flex-col fixed h-full z-40">
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">FollowArg</div>
              <div className="text-primary-400 text-xs">Admin Panel</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === item.id
                  ? "bg-primary-500/15 text-primary-300 border border-primary-500/25"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
          <div className="pt-2 mt-2 border-t border-white/[0.06] space-y-1">
            <Link
              href="/admin/dashboard"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <BarChart2 className="w-4 h-4" />
              Analytics
            </Link>
            <Link
              href="/admin/tickets"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              Tickets
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-56 p-4 sm:p-6 md:p-8 pb-24 sm:pb-8">
        {/* Mobile nav – visible only when sidebar is hidden */}
        <div className="md:hidden flex gap-1.5 overflow-x-auto scrollbar-none pb-3 mb-4 border-b border-white/[0.06] -mx-4 px-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all ${
                tab === item.id
                  ? "bg-primary-500/15 text-primary-300 border border-primary-500/25"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          ))}
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs whitespace-nowrap text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent transition-all"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Analytics
          </Link>
          <Link
            href="/admin/tickets"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs whitespace-nowrap text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Tickets
          </Link>
        </div>
        {loading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        )}

        {/* Dashboard Tab */}
        {tab === "dashboard" && !loading && stats && (
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white mb-6">
              Dashboard Overview
            </h1>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
              {[
                {
                  label: "Total Revenue",
                  value: formatCurrency(stats.totalRevenue),
                  icon: DollarSign,
                  color: "text-green-400",
                  bg: "bg-green-400/10",
                },
                {
                  label: "Today Revenue",
                  value: formatCurrency(stats.todayRevenue),
                  icon: TrendingUp,
                  color: "text-primary-400",
                  bg: "bg-primary-400/10",
                },
                {
                  label: "Total Orders",
                  value: stats.totalOrders,
                  icon: ShoppingCart,
                  color: "text-blue-400",
                  bg: "bg-blue-400/10",
                },
                {
                  label: "Total Users",
                  value: stats.totalUsers,
                  icon: UserCheck,
                  color: "text-purple-400",
                  bg: "bg-purple-400/10",
                },
              ].map((s) => (
                <div key={s.label} className="glass-card p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] sm:text-xs leading-tight text-slate-400">
                      {s.label}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}
                    >
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white break-words">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
            {/* Alert Dashboard - Orders requiring attention */}
            {stats.ordersByStatus && (
              <div className="glass-card p-5 sm:p-6 mb-6 border-amber-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    ⚠️ Requieren Atención
                  </h3>
                  <button
                    onClick={() => {
                      setStatusFilter("alerts");
                      handleTabChange("orders");
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    Ver todos →
                  </button>
                </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(
                    [
                      "partial",
                      "failed",
                      "cancelled",
                      "refunded",
                    ] as OrderStatus[]
                  ).map((status) => {
                    const count = stats.ordersByStatus[status] || 0;
                    const priority =
                      status === "failed" || status === "cancelled"
                        ? "high"
                        : "medium";
                    return (
                      <div
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          handleTabChange("orders");
                        }}
                        className={`p-3 sm:p-4 rounded-xl cursor-pointer transition-all hover:scale-105 ${
                          count > 0
                            ? priority === "high"
                              ? "bg-red-500/20 border border-red-500/30 text-red-400"
                              : "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                            : "bg-slate-500/10 border border-slate-500/20 text-slate-500"
                        }`}
                      >
                        <div className="text-xl sm:text-2xl font-bold">{count}</div>
                        <div className="text-xs mt-1 font-medium">
                          {STATUS_LABELS[status]}
                        </div>
                        {count > 0 && (
                          <div className="text-[10px] mt-2 opacity-75">
                            {priority === "high"
                              ? "🔴 Acción urgente"
                              : "🟡 Revisar"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {stats.ordersByStatus && (
              <div className="glass-card p-5 sm:p-6">
                <h3 className="text-white font-semibold mb-4">
                  Orders by Status
                </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(stats.ordersByStatus).map(
                    ([status, count]) => (
                      <div
                        key={status}
                        className={`p-3 rounded-xl ${STATUS_COLORS[status as OrderStatus] ?? "bg-slate-400/10 text-slate-400"}`}
                      >
                        <div className="text-xl font-bold">{count}</div>
                        <div className="text-xs mt-0.5 capitalize">
                          {STATUS_LABELS[status as OrderStatus] ?? status}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {tab === "orders" && !loading && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h1 className="text-2xl font-black text-white">Orders</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowCreateOrder(true)}
                  className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 text-sm w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" /> Crear Pedido
                </button>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    loadOrders(1, e.target.value);
                  }}
                  className="input-field w-full sm:w-auto text-sm"
                >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <code className="text-xs text-slate-500 font-mono">
                        {order.id.slice(0, 8)}
                      </code>
                      <span
                        className={`status-badge ${STATUS_COLORS[order.status]}`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="text-white text-sm font-medium">
                      {order.service_name}
                    </div>
                    <div className="text-slate-400 text-xs flex flex-col sm:flex-row gap-1 sm:gap-3 mt-1">
                      <span className="break-all">🔗 {order.link}</span>
                      <span>📦 {order.quantity?.toLocaleString()}</span>
                      <span className="text-primary-400">
                        {formatCurrency(order.price)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="text-slate-500 text-xs">
                      {formatDate(order.created_at)}
                    </span>
                    <button
                      onClick={() => openOrderDetails(order)}
                      title="Ver detalles"
                      className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {(order.status === "partial" ||
                      order.status === "failed" ||
                      order.status === "cancelled") && (
                      <button
                        onClick={() => refundOrder(order.id, order.price)}
                        title="Reembolsar"
                        className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors border border-green-500/20"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => retryOrder(order.id)}
                      title="Reintentar en proveedor"
                      className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors border border-orange-500/20"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <select
                      defaultValue={order.status}
                      onChange={(e) =>
                        updateOrderStatus(order.id, e.target.value)
                      }
                      className="text-xs bg-dark-200 border border-white/[0.1] rounded-lg px-2 py-1.5 text-white [&>option]:bg-dark-200 [&>option]:text-white"
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            {ordersTotal > 20 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  disabled={ordersPage === 1}
                  onClick={() => loadOrders(ordersPage - 1, statusFilter)}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-slate-400 text-sm">
                  {ordersPage} / {Math.ceil(ordersTotal / 20)}
                </span>
                <button
                  disabled={ordersPage >= Math.ceil(ordersTotal / 20)}
                  onClick={() => loadOrders(ordersPage + 1, statusFilter)}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Services Tab */}
        {tab === "services" && !loading && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black text-white">Servicios</h1>
              <button
                onClick={() => setShowNewService(true)}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Nuevo servicio
              </button>
            </div>

            {/* New service form */}
            {showNewService && (
              <div className="glass-card p-6 mb-6 border border-primary-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">Crear nuevo servicio</h3>
                  <button
                    onClick={() => setShowNewService(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 mb-1 block">
                      Nombre
                    </label>
                    <input
                      className="input-field"
                      value={newService.name}
                      onChange={(e) =>
                        setNewService({ ...newService, name: e.target.value })
                      }
                      placeholder="Instagram Followers – Real"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Plataforma
                    </label>
                    <select
                      className="input-field"
                      value={newService.platform}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          platform: e.target.value,
                        })
                      }
                    >
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube">YouTube</option>
                      <option value="discord">Discord</option>
                      <option value="telegram">Telegram</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Categoría
                    </label>
                    <select
                      className="input-field"
                      value={newService.category}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          category: e.target.value,
                        })
                      }
                    >
                      <option value="followers">Seguidores</option>
                      <option value="likes">Likes</option>
                      <option value="views">Vistas</option>
                      <option value="comments">Comentarios</option>
                      <option value="boost">Server Boost</option>
                      <option value="reactions">Reacciones</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      💰 Precio por unidad (ARS)
                    </label>
                    <input
                      className="input-field"
                      type="number"
                      step="0.0001"
                      value={newService.price_per_unit}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          price_per_unit: e.target.value,
                        })
                      }
                      placeholder="0.0025"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      ⚡ Velocidad de entrega
                    </label>
                    <input
                      className="input-field"
                      value={newService.delivery_speed}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          delivery_speed: e.target.value,
                        })
                      }
                      placeholder="1-3 days"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      📦 Cantidad mínima
                    </label>
                    <input
                      className="input-field"
                      type="number"
                      value={newService.min_quantity}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          min_quantity: e.target.value,
                        })
                      }
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      📦 Cantidad máxima
                    </label>
                    <input
                      className="input-field"
                      type="number"
                      value={newService.max_quantity}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          max_quantity: e.target.value,
                        })
                      }
                      placeholder="10000"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 mb-1 block">
                      🔗 ID en el proveedor (smmengineer.com)
                    </label>
                    <input
                      className="input-field"
                      type="number"
                      value={newService.provider_service_id}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          provider_service_id: e.target.value,
                        })
                      }
                      placeholder="Ej: 101"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      El número de servicio que aparece en el catálogo de
                      smmengineer
                    </p>
                  </div>
                </div>
                <button
                  onClick={createNewService}
                  disabled={savingService}
                  className="btn-primary mt-4 flex items-center gap-2"
                >
                  {savingService ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Crear servicio
                </button>
              </div>
            )}

            {/* ── Grouped by platform ── */}
            {(() => {
              const PLATFORM_META: Record<
                string,
                { label: string; emoji: string; color: string }
              > = {
                instagram: {
                  label: "Instagram",
                  emoji: "📸",
                  color: "from-pink-500/20 to-purple-600/20 border-pink-500/30",
                },
                tiktok: {
                  label: "TikTok",
                  emoji: "🎵",
                  color:
                    "from-slate-600/20 to-slate-800/20 border-slate-500/30",
                },
                youtube: {
                  label: "YouTube",
                  emoji: "▶️",
                  color: "from-red-600/20 to-red-700/20 border-red-500/30",
                },
                discord: {
                  label: "Discord",
                  emoji: "🎮",
                  color: "from-indigo-500/20 to-purple-700/20 border-indigo-500/30",
                },
                telegram: {
                  label: "Telegram",
                  emoji: "✈️",
                  color: "from-sky-400/20 to-blue-600/20 border-sky-500/30",
                },
              };
              const CAT_META: Record<string, string> = {
                followers: "👥 Seguidores",
                likes: "❤️ Likes",
                views: "👁️ Vistas",
                comments: "💬 Comentarios",
                boost: "🚀 Server Boost",
                reactions: "🎉 Reacciones",
              };
              const platforms = [...new Set(services.map((s) => s.platform))];
              return platforms.map((platform) => {
                const meta = PLATFORM_META[platform] ?? {
                  label: platform,
                  emoji: "📱",
                  color:
                    "from-slate-500/20 to-slate-600/20 border-slate-500/30",
                };
                const platServices = services.filter(
                  (s) => s.platform === platform,
                );
                const categories = [
                  ...new Set(platServices.map((s) => s.category)),
                ];
                const isOpen = openPlatforms[platform] !== false;
                return (
                  <div
                    key={platform}
                    className={`rounded-2xl border bg-gradient-to-br ${meta.color} mb-4 overflow-hidden`}
                  >
                    {/* Platform header */}
                    <button
                      onClick={() => togglePlatformSection(platform)}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{meta.emoji}</span>
                        <span className="text-white font-bold text-lg">
                          {meta.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                          {platServices.length} servicios
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-4">
                        {categories.map((cat) => {
                          const catServices = platServices.filter(
                            (s) => s.category === cat,
                          );
                          return (
                            <div key={cat}>
                              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                {CAT_META[cat] ?? cat}
                                <span className="text-slate-600">
                                  ({catServices.length})
                                </span>
                              </div>
                              <div className="space-y-2">
                                {catServices.map((s) => (
                                  <div
                                    key={s.id}
                                    className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]"
                                  >
                                    {editingService === s.id ? (
                                      /* ── Edit mode ── */
                                      <div>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                          <div className="col-span-2">
                                            <label className="text-xs text-slate-400 mb-1 block">
                                              Nombre
                                            </label>
                                            <input
                                              className="input-field"
                                              value={String(editForm.name)}
                                              onChange={(e) =>
                                                setEditForm({
                                                  ...editForm,
                                                  name: e.target.value,
                                                })
                                              }
                                            />
                                          </div>
                                          <div>
                                            <label className="text-xs text-slate-400 mb-1 block">
                                              💰 Precio/unidad (ARS)
                                            </label>
                                            <input
                                              className="input-field"
                                              type="number"
                                              step="0.0001"
                                              value={String(
                                                editForm.price_per_unit,
                                              )}
                                              onChange={(e) =>
                                                setEditForm({
                                                  ...editForm,
                                                  price_per_unit:
                                                    e.target.value,
                                                })
                                              }
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                              precio × cantidad = total al
                                              usuario
                                            </p>
                                          </div>
                                          <div>
                                            <label className="text-xs text-slate-400 mb-1 block">
                                              ⚡ Velocidad de entrega
                                            </label>
                                            <input
                                              className="input-field"
                                              value={String(
                                                editForm.delivery_speed,
                                              )}
                                              onChange={(e) =>
                                                setEditForm({
                                                  ...editForm,
                                                  delivery_speed:
                                                    e.target.value,
                                                })
                                              }
                                            />
                                          </div>
                                          <div>
                                            <label className="text-xs text-slate-400 mb-1 block">
                                              📦 Cant. mínima
                                            </label>
                                            <input
                                              className="input-field"
                                              type="number"
                                              value={String(
                                                editForm.min_quantity,
                                              )}
                                              onChange={(e) =>
                                                setEditForm({
                                                  ...editForm,
                                                  min_quantity: e.target.value,
                                                })
                                              }
                                            />
                                          </div>
                                          <div>
                                            <label className="text-xs text-slate-400 mb-1 block">
                                              📦 Cant. máxima
                                            </label>
                                            <input
                                              className="input-field"
                                              type="number"
                                              value={String(
                                                editForm.max_quantity,
                                              )}
                                              onChange={(e) =>
                                                setEditForm({
                                                  ...editForm,
                                                  max_quantity: e.target.value,
                                                })
                                              }
                                            />
                                          </div>
                                          <div className="col-span-2">
                                            <label className="text-xs text-slate-400 mb-1 block">
                                              🔗 ID en smmengineer.com
                                            </label>
                                            <input
                                              className="input-field"
                                              type="number"
                                              value={String(
                                                editForm.provider_service_id,
                                              )}
                                              onChange={(e) =>
                                                setEditForm({
                                                  ...editForm,
                                                  provider_service_id:
                                                    e.target.value,
                                                })
                                              }
                                              placeholder="Ej: 101"
                                            />
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <button
                                            onClick={() =>
                                              saveEditService(s.id)
                                            }
                                            disabled={savingService}
                                            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                                          >
                                            {savingService ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <CheckCircle className="w-4 h-4" />
                                            )}{" "}
                                            Guardar
                                          </button>
                                          <button
                                            onClick={() =>
                                              setEditingService(null)
                                            }
                                            className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white border border-white/10 transition-all"
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            onClick={() =>
                                              toggleServiceStatus(s)
                                            }
                                            className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-medium ${s.is_active ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}
                                          >
                                            {s.is_active
                                              ? "Desactivar"
                                              : "Activar"}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* ── View mode ── */
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="text-white font-medium text-sm">
                                              {s.name}
                                            </span>
                                            <span
                                              className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? "bg-green-400/10 text-green-400" : "bg-slate-400/10 text-slate-400"}`}
                                            >
                                              {s.is_active
                                                ? "Activo"
                                                : "Inactivo"}
                                            </span>
                                          </div>
                                          <div className="text-xs flex gap-3 flex-wrap mt-1">
                                            <span className="text-primary-400 font-bold">
                                              💰{" "}
                                              {formatCurrency(
                                                parseFloat(
                                                  String(s.price_per_unit),
                                                ),
                                              )}
                                              /u
                                            </span>
                                            <span className="text-slate-400">
                                              📦{" "}
                                              {s.min_quantity?.toLocaleString()}
                                              –
                                              {s.max_quantity?.toLocaleString()}
                                            </span>
                                            <span className="text-slate-400">
                                              ⚡ {s.delivery_speed}
                                            </span>
                                            {s.provider_service_id && (
                                              <span className="text-slate-500">
                                                ID: {s.provider_service_id}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => startEditService(s)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-all flex-shrink-0"
                                        >
                                          <Edit className="w-3.5 h-3.5" />{" "}
                                          Editar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && !loading && (
          <div>
            <h1 className="text-2xl font-black text-white mb-6">
              Users ({users.length})
            </h1>
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={String(u.id)}
                  className="glass-card p-4 flex items-center gap-4"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {String(u.name ?? "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">
                        {String(u.name)}
                      </span>
                      {String(u.role) === "admin" && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400">
                          Admin
                        </span>
                      )}
                      {u.is_active === false && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                          Banned
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 text-xs">
                      {String(u.email)} • Joined{" "}
                      {u.created_at ? formatDate(String(u.created_at)) : "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right flex-shrink-0">
                    <div className="text-right mr-2">
                      <div className="text-primary-400 text-sm font-semibold">
                        {formatCurrency(Number(u.balance ?? 0))}
                      </div>
                      <div className="text-slate-500 text-xs">
                        {String(u.order_count ?? 0)} pedidos
                      </div>
                    </div>
                    <button
                      onClick={() => openUserDetail(u)}
                      className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                      title="Ver detalle"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {String(u.role) !== "admin" && (
                      <button
                        onClick={() => toggleUserStatus(String(u.id))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${u.is_active !== false ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}
                      >
                        {u.is_active !== false ? "Ban" : "Unban"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Marketing Emails Tab */}
        {tab === "emails" && !loading && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h1 className="text-2xl font-black text-white">
                  Correos publicitarios
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Enviá campañas personalizadas usando variables como{" "}
                  <code className="text-primary-300">{"{{name}}"}</code> y{" "}
                  <code className="text-primary-300">{"{{email}}"}</code>.
                </p>
              </div>
              <button
                onClick={sendMarketingEmail}
                disabled={sendingEmail || !emailPreview}
                className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sendingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Enviar campaña
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] gap-5">
              <div className="space-y-4">
                <div className="glass-card p-4 sm:p-5">
                  <h2 className="text-white font-semibold mb-4">Audiencia</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: "active",
                        label: "Usuarios activos",
                        desc: "Recomendado para evitar cuentas baneadas.",
                      },
                      {
                        id: "all",
                        label: "Todos",
                        desc: "Incluye usuarios activos e inactivos.",
                      },
                      {
                        id: "selected",
                        label: "Seleccionados",
                        desc: "Elegís manualmente los destinatarios.",
                      },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setEmailForm({
                            ...emailForm,
                            audience: option.id as "all" | "active" | "selected",
                          });
                          setEmailPreview(null);
                        }}
                        className={`text-left rounded-xl border p-4 transition-all ${
                          emailForm.audience === option.id
                            ? "border-primary-500/50 bg-primary-500/10"
                            : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="text-white text-sm font-semibold">
                          {option.label}
                        </div>
                        <div className="text-slate-500 text-xs mt-1 leading-relaxed">
                          {option.desc}
                        </div>
                      </button>
                    ))}
                  </div>

                  {emailForm.audience === "selected" && (
                    <div className="mt-4 border-t border-white/[0.06] pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-300 text-sm font-medium">
                          Usuarios seleccionados: {selectedEmailUsers.length}
                        </span>
                        <button
                          onClick={() =>
                            setSelectedEmailUsers(
                              users
                                .filter((u) => String(u.role) !== "admin")
                                .map((u) => String(u.id)),
                            )
                          }
                          className="text-primary-400 text-xs hover:text-primary-300"
                        >
                          Seleccionar todos
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                        {users
                          .filter((u) => String(u.role) !== "admin")
                          .map((u) => (
                            <label
                              key={String(u.id)}
                              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05]"
                            >
                              <input
                                type="checkbox"
                                checked={selectedEmailUsers.includes(
                                  String(u.id),
                                )}
                                onChange={() => toggleEmailUser(String(u.id))}
                                className="w-4 h-4 accent-primary-500"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-white text-sm truncate">
                                  {String(u.name)}
                                </div>
                                <div className="text-slate-500 text-xs truncate">
                                  {String(u.email)}
                                </div>
                              </div>
                              {u.is_active === false && (
                                <span className="text-[11px] text-red-400">
                                  Inactivo
                                </span>
                              )}
                            </label>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="glass-card p-4 sm:p-5 space-y-4">
                  <h2 className="text-white font-semibold">Contenido</h2>
                  <div>
                    <label className="text-slate-400 text-sm mb-1.5 block">
                      Asunto
                    </label>
                    <input
                      value={emailForm.subject}
                      onChange={(e) => {
                        setEmailForm({ ...emailForm, subject: e.target.value });
                        setEmailPreview(null);
                      }}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-1.5 block">
                      Título principal
                    </label>
                    <input
                      value={emailForm.title}
                      onChange={(e) => {
                        setEmailForm({ ...emailForm, title: e.target.value });
                        setEmailPreview(null);
                      }}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-1.5 block">
                      Mensaje
                    </label>
                    <textarea
                      value={emailForm.message}
                      onChange={(e) => {
                        setEmailForm({ ...emailForm, message: e.target.value });
                        setEmailPreview(null);
                      }}
                      rows={9}
                      className="input-field resize-y"
                    />
                    <p className="text-slate-500 text-xs mt-2">
                      Separá párrafos con una línea vacía. Variables disponibles:
                      {" {{name}}"} y {"{{email}}"}.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 text-sm mb-1.5 block">
                        Texto del botón
                      </label>
                      <input
                        value={emailForm.ctaText}
                        onChange={(e) => {
                          setEmailForm({
                            ...emailForm,
                            ctaText: e.target.value,
                          });
                          setEmailPreview(null);
                        }}
                        className="input-field"
                        placeholder="Hacer pedido ahora"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm mb-1.5 block">
                        URL del botón
                      </label>
                      <input
                        value={emailForm.ctaUrl}
                        onChange={(e) => {
                          setEmailForm({ ...emailForm, ctaUrl: e.target.value });
                          setEmailPreview(null);
                        }}
                        className="input-field"
                        placeholder="https://followarg.com/order"
                      />
                    </div>
                  </div>
                  <button
                    onClick={previewMarketingEmail}
                    disabled={previewingEmail}
                    className="btn-secondary flex items-center justify-center gap-2"
                  >
                    {previewingEmail ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    Previsualizar correo
                  </button>
                </div>
              </div>

              <div className="glass-card p-4 sm:p-5 min-h-[520px]">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-white font-semibold">Preview</h2>
                    {emailPreview && (
                      <p className="text-slate-500 text-xs mt-1 truncate max-w-sm">
                        Asunto: {emailPreview.subject}
                      </p>
                    )}
                  </div>
                </div>
                {emailPreview ? (
                  <iframe
                    title="Preview del correo"
                    srcDoc={emailPreview.html}
                    className="w-full h-[680px] bg-white rounded-xl border border-white/[0.08]"
                  />
                ) : (
                  <div className="h-[520px] rounded-xl border border-dashed border-white/[0.12] flex items-center justify-center text-center px-6">
                    <div>
                      <Mail className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">
                        Completá el contenido y generá una previsualización antes
                        de enviar.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Coupons Tab */}
        {tab === "coupons" && !loading && (
          <div>
            <h1 className="text-2xl font-black text-white mb-6">Coupons</h1>
            <div className="space-y-2">
              {coupons.map((c) => (
                <div
                  key={String(c.id)}
                  className="glass-card p-4 flex items-center gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-primary-400 font-mono font-bold">
                        {String(c.code)}
                      </code>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? "bg-green-400/10 text-green-400" : "bg-slate-400/10 text-slate-400"}`}
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="text-slate-400 text-xs flex gap-3">
                      <span>
                        {String(c.discount_type) === "percentage"
                          ? `${c.discount_value}% off`
                          : `${formatCurrency(Number(c.discount_value))} off`}
                      </span>
                      <span>
                        Used: {String(c.used_count ?? 0)} /{" "}
                        {c.max_uses ? String(c.max_uses) : "∞"}
                      </span>
                      {c.expires_at != null && (
                        <span>Expires: {formatDate(String(c.expires_at))}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {coupons.length === 0 && (
                <p className="text-slate-500 text-center py-10">
                  No coupons found.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
            >
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/[0.06]">
                <h3 className="text-white font-bold text-lg">
                  Detalles del Pedido
                </h3>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">ID Pedido</span>
                  <code className="text-xs text-slate-300 font-mono bg-dark-200 px-2 py-1 rounded">
                    {selectedOrder.id.slice(0, 16)}...
                  </code>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Estado</span>
                  <span
                    className={`status-badge ${STATUS_COLORS[selectedOrder.status]}`}
                  >
                    {STATUS_LABELS[selectedOrder.status]}
                  </span>
                </div>

                <div className="bg-dark-200/50 p-4 rounded-xl">
                  <div className="text-slate-400 text-xs mb-1">Servicio</div>
                  <div className="text-white font-medium">
                    {selectedOrder.service_name}
                  </div>
                </div>

                <div className="bg-dark-200/50 p-4 rounded-xl">
                  <div className="text-slate-400 text-xs mb-1">Enlace</div>
                  <a
                    href={selectedOrder.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 text-sm break-all hover:underline"
                  >
                    {selectedOrder.link}
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-dark-200/50 p-4 rounded-xl text-center">
                    <div className="text-slate-400 text-xs mb-1">Cantidad</div>
                    <div className="text-white font-bold text-xl">
                      {selectedOrder.quantity?.toLocaleString()}
                    </div>
                    {selectedOrder.remains != null &&
                      selectedOrder.remains > 0 && (
                        <div className="text-amber-400 text-xs mt-1">
                          Faltan: {selectedOrder.remains}
                        </div>
                      )}
                  </div>
                  <div className="bg-dark-200/50 p-4 rounded-xl text-center">
                    <div className="text-slate-400 text-xs mb-1">Precio</div>
                    <div className="text-primary-400 font-bold text-xl">
                      {formatCurrency(selectedOrder.price)}
                    </div>
                  </div>
                </div>

                {selectedOrder.provider_order_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Provider ID</span>
                    <code className="text-xs text-slate-300 font-mono">
                      {selectedOrder.provider_order_id}
                    </code>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Creado</span>
                  <span className="text-slate-300">
                    {formatDate(selectedOrder.created_at)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-white/[0.06]">
                  {(selectedOrder.status === "partial" ||
                    selectedOrder.status === "failed" ||
                    selectedOrder.status === "cancelled") && (
                    <button
                      onClick={() => {
                        refundOrder(selectedOrder.id, selectedOrder.price);
                        setShowOrderModal(false);
                      }}
                      className="flex-1 btn-primary bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30"
                    >
                      <DollarSign className="w-4 h-4" /> Reembolsar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      retryOrder(selectedOrder.id);
                      setShowOrderModal(false);
                    }}
                    className="flex-1 btn-primary"
                  >
                    <RotateCcw className="w-4 h-4" /> Reintentar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Create Order Modal */}
        {showCreateOrder && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
            >
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/[0.06]">
                <h3 className="text-white font-bold text-lg">
                  Crear Pedido Manual
                </h3>
                <button
                  onClick={() => setShowCreateOrder(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">ID de Usuario</label>
                  <input
                    type="text"
                    value={newOrder.userId}
                    onChange={(e) => setNewOrder({ ...newOrder, userId: e.target.value })}
                    placeholder="uuid del usuario"
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Servicio</label>
                  <select
                    value={newOrder.serviceId}
                    onChange={(e) => setNewOrder({ ...newOrder, serviceId: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="">Seleccionar servicio</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.platform} - {s.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Cantidad</label>
                  <input
                    type="number"
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                    placeholder="100"
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Link</label>
                  <input
                    type="text"
                    value={newOrder.link}
                    onChange={(e) => setNewOrder({ ...newOrder, link: e.target.value })}
                    placeholder="https://instagram.com/p/..."
                    className="input-field w-full"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <button
                    onClick={() => setShowCreateOrder(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={createOrder}
                    disabled={creatingOrder}
                    className="flex-1 btn-primary"
                  >
                    {creatingOrder ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}{" "}
                    Crear Pedido
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* User Detail Modal */}
        {showUserDetail && selectedUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
            >
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/[0.06]">
                <h3 className="text-white font-bold text-lg">
                  Detalle de Usuario
                </h3>
                <button
                  onClick={() => setShowUserDetail(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                {/* User Info */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                    {String(selectedUser.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-medium text-lg">{String(selectedUser.name)}</div>
                    <div className="text-slate-400 text-sm">{String(selectedUser.email)}</div>
                  </div>
                </div>

                {/* Stats */}
                {userStats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-dark-200/50 p-4 rounded-xl text-center">
                      <div className="text-slate-400 text-xs mb-1">Saldo</div>
                      <div className="text-primary-400 font-bold text-xl">
                        {formatCurrency(Number(selectedUser.balance))}
                      </div>
                    </div>
                    <div className="bg-dark-200/50 p-4 rounded-xl text-center">
                      <div className="text-slate-400 text-xs mb-1">Pedidos</div>
                      <div className="text-white font-bold text-xl">
                        {String(userStats.total_orders ?? 0)}
                      </div>
                    </div>
                    <div className="bg-dark-200/50 p-4 rounded-xl text-center">
                      <div className="text-slate-400 text-xs mb-1">Gastado</div>
                      <div className="text-white font-bold text-xl">
                        {formatCurrency(Number(userStats.total_spent ?? 0))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Balance Adjustment */}
                <div className="border-t border-white/[0.06] pt-4">
                  <h4 className="text-white font-medium mb-3">Ajustar Saldo</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="number"
                      value={balanceAdjustment}
                      onChange={(e) => setBalanceAdjustment(e.target.value)}
                      placeholder="Monto (+/-)"
                    className="input-field flex-1"
                    />
                    <input
                      type="text"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="Razón (opcional)"
                      className="input-field flex-1"
                    />
                    <button
                      onClick={adjustBalance}
                      disabled={adjustingBalance}
                      className="btn-primary px-4"
                    >
                      {adjustingBalance ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <DollarSign className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    Usar valor positivo para agregar saldo, negativo para deducir.
                  </p>
                </div>

                {/* Recent Orders */}
                {userOrders.length > 0 && (
                  <div className="border-t border-white/[0.06] pt-4">
                    <h4 className="text-white font-medium mb-3">Últimos Pedidos</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {userOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-dark-200/30 p-3 rounded-lg flex items-center justify-between"
                        >
                          <div>
                            <div className="text-white text-sm">{order.service_name}</div>
                            <div className="text-slate-500 text-xs">
                              {order.quantity} unidades • {formatCurrency(order.price)}
                            </div>
                          </div>
                          <span className={`status-badge text-xs ${STATUS_COLORS[order.status]}`}>
                            {STATUS_LABELS[order.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}

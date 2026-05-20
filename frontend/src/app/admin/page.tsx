'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Package, Users, Tag, Settings,
  TrendingUp, DollarSign, ShoppingCart, UserCheck,
  ChevronDown, ChevronUp, RefreshCw, Trash2, Plus,
  Edit, Eye, X, Loader2, CheckCircle, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { getStoredUser, isAuthenticated } from '@/lib/auth';
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils';
import { Order, Service, OrderStatus } from '@/types';

type AdminTab = 'dashboard' | 'orders' | 'services' | 'users' | 'coupons';

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
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [coupons, setCoupons] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string | number | boolean>>({});
  const [savingService, setSavingService] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [openPlatforms, setOpenPlatforms] = useState<Record<string, boolean>>({ instagram: true, tiktok: true, youtube: true });
  const togglePlatformSection = (p: string) => setOpenPlatforms((prev) => ({ ...prev, [p]: !prev[p] }));
  const [newService, setNewService] = useState({
    name: '', platform: 'instagram', category: 'followers',
    price_per_unit: '', min_quantity: '', max_quantity: '',
    delivery_speed: '1-3 days', provider_service_id: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const user = getStoredUser();
    if (user?.role !== 'admin') { router.push('/dashboard'); return; }
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getStats();
      setStats(res.data.stats);
    } catch { toast.error('Failed to load stats'); }
    finally { setLoading(false); }
  };

  const loadOrders = async (page = 1, status = '') => {
    setLoading(true);
    try {
      const res = await adminApi.getOrders(page, 20, status || undefined);
      setOrders(res.data.orders ?? []);
      setOrdersTotal(res.data.total ?? 0);
      setOrdersPage(page);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getServices();
      setServices(res.data.services ?? []);
    } catch { toast.error('Failed to load services'); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers();
      setUsers(res.data.users ?? []);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCoupons();
      setCoupons(res.data.coupons ?? []);
    } catch { toast.error('Failed to load coupons'); }
    finally { setLoading(false); }
  };

  const handleTabChange = (t: AdminTab) => {
    setTab(t);
    if (t === 'dashboard') loadDashboard();
    else if (t === 'orders') loadOrders(1, statusFilter);
    else if (t === 'services') loadServices();
    else if (t === 'users') loadUsers();
    else if (t === 'coupons') loadCoupons();
  };

  const toggleServiceStatus = async (service: Service) => {
    try {
      await adminApi.updateService(service.id, { is_active: !service.is_active });
      toast.success('Servicio actualizado');
      loadServices();
    } catch { toast.error('Error al actualizar'); }
  };

  const startEditService = (s: Service) => {
    setEditingService(s.id);
    setEditForm({
      name: s.name,
      price_per_unit: s.price_per_unit,
      min_quantity: s.min_quantity,
      max_quantity: s.max_quantity,
      delivery_speed: s.delivery_speed ?? '',
      provider_service_id: s.provider_service_id ?? '',
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
        provider_service_id: editForm.provider_service_id ? parseInt(String(editForm.provider_service_id)) : undefined,
      });
      toast.success('✅ Servicio guardado');
      setEditingService(null);
      loadServices();
    } catch { toast.error('Error al guardar'); }
    finally { setSavingService(false); }
  };

  const createNewService = async () => {
    if (!newService.name || !newService.price_per_unit) { toast.error('Nombre y precio son requeridos'); return; }
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
        provider_service_id: newService.provider_service_id ? parseInt(newService.provider_service_id) : undefined,
      });
      toast.success('✅ Servicio creado');
      setShowNewService(false);
      setNewService({ name: '', platform: 'instagram', category: 'followers', price_per_unit: '', min_quantity: '', max_quantity: '', delivery_speed: '1-3 days', provider_service_id: '' });
      loadServices();
    } catch { toast.error('Error al crear servicio'); }
    finally { setSavingService(false); }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      await adminApi.toggleUser(userId);
      toast.success('User status updated');
      loadUsers();
    } catch { toast.error('Failed to update user'); }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await adminApi.updateOrderStatus(orderId, status);
      toast.success('Order updated');
      loadOrders(ordersPage, statusFilter);
    } catch { toast.error('Failed to update order'); }
  };

  const retryOrder = async (orderId: string) => {
    try {
      const res = await adminApi.retryOrder(orderId);
      toast.success(`✅ Reenviado al proveedor #${res.data.providerOrderId}`);
      loadOrders(ordersPage, statusFilter);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al reintentar';
      toast.error(msg);
    }
  };

  const NAV_ITEMS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'services', label: 'Services', icon: Package },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'coupons', label: 'Coupons', icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-dark-300 flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/[0.06] bg-dark-300/80 backdrop-blur-xl flex flex-col fixed h-full z-40">
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
                  ? 'bg-primary-500/15 text-primary-300 border border-primary-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-56 p-8">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        )}

        {/* Dashboard Tab */}
        {tab === 'dashboard' && !loading && stats && (
          <div>
            <h1 className="text-2xl font-black text-white mb-8">Dashboard Overview</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-green-400', bg: 'bg-green-400/10' },
                { label: 'Today Revenue', value: formatCurrency(stats.todayRevenue), icon: TrendingUp, color: 'text-primary-400', bg: 'bg-primary-400/10' },
                { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                { label: 'Total Users', value: stats.totalUsers, icon: UserCheck, color: 'text-purple-400', bg: 'bg-purple-400/10' },
              ].map((s) => (
                <div key={s.label} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-400 text-xs">{s.label}</span>
                    <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white">{s.value}</div>
                </div>
              ))}
            </div>
            {stats.ordersByStatus && (
              <div className="glass-card p-6">
                <h3 className="text-white font-semibold mb-4">Orders by Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(stats.ordersByStatus).map(([status, count]) => (
                    <div key={status} className={`p-3 rounded-xl ${STATUS_COLORS[status as OrderStatus] ?? 'bg-slate-400/10 text-slate-400'}`}>
                      <div className="text-xl font-bold">{count}</div>
                      <div className="text-xs mt-0.5 capitalize">{STATUS_LABELS[status as OrderStatus] ?? status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {tab === 'orders' && !loading && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black text-white">Orders</h1>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); loadOrders(1, e.target.value); }}
                className="input-field w-auto text-sm"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {orders.map((order) => (
                <div key={order.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <code className="text-xs text-slate-500 font-mono">{order.id.slice(0, 8)}</code>
                      <span className={`status-badge ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                    </div>
                    <div className="text-white text-sm font-medium">{order.service_name}</div>
                    <div className="text-slate-400 text-xs flex gap-3 mt-1">
                      <span>🔗 {order.link}</span>
                      <span>📦 {order.quantity?.toLocaleString()}</span>
                      <span className="text-primary-400">{formatCurrency(order.price)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="text-slate-500 text-xs">{formatDate(order.created_at)}</span>
                    <select
                      defaultValue={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="text-xs bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1.5 text-white"
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => retryOrder(order.id)}
                      title="Reintentar en proveedor"
                      className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors border border-orange-500/20"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {ordersTotal > 20 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button disabled={ordersPage === 1} onClick={() => loadOrders(ordersPage - 1, statusFilter)} className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Prev</button>
                <span className="text-slate-400 text-sm">{ordersPage} / {Math.ceil(ordersTotal / 20)}</span>
                <button disabled={ordersPage >= Math.ceil(ordersTotal / 20)} onClick={() => loadOrders(ordersPage + 1, statusFilter)} className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Next</button>
              </div>
            )}
          </div>
        )}

        {/* Services Tab */}
        {tab === 'services' && !loading && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black text-white">Servicios</h1>
              <button onClick={() => setShowNewService(true)} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                <Plus className="w-4 h-4" /> Nuevo servicio
              </button>
            </div>

            {/* New service form */}
            {showNewService && (
              <div className="glass-card p-6 mb-6 border border-primary-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">Crear nuevo servicio</h3>
                  <button onClick={() => setShowNewService(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 mb-1 block">Nombre</label>
                    <input className="input-field" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} placeholder="Instagram Followers – Real" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Plataforma</label>
                    <select className="input-field" value={newService.platform} onChange={(e) => setNewService({ ...newService, platform: e.target.value })}>
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube">YouTube</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Categoría</label>
                    <select className="input-field" value={newService.category} onChange={(e) => setNewService({ ...newService, category: e.target.value })}>
                      <option value="followers">Seguidores</option>
                      <option value="likes">Likes</option>
                      <option value="views">Vistas</option>
                      <option value="comments">Comentarios</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">💰 Precio por unidad (ARS)</label>
                    <input className="input-field" type="number" step="0.0001" value={newService.price_per_unit} onChange={(e) => setNewService({ ...newService, price_per_unit: e.target.value })} placeholder="0.0025" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">⚡ Velocidad de entrega</label>
                    <input className="input-field" value={newService.delivery_speed} onChange={(e) => setNewService({ ...newService, delivery_speed: e.target.value })} placeholder="1-3 days" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">📦 Cantidad mínima</label>
                    <input className="input-field" type="number" value={newService.min_quantity} onChange={(e) => setNewService({ ...newService, min_quantity: e.target.value })} placeholder="100" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">📦 Cantidad máxima</label>
                    <input className="input-field" type="number" value={newService.max_quantity} onChange={(e) => setNewService({ ...newService, max_quantity: e.target.value })} placeholder="10000" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 mb-1 block">🔗 ID en el proveedor (smmengineer.com)</label>
                    <input className="input-field" type="number" value={newService.provider_service_id} onChange={(e) => setNewService({ ...newService, provider_service_id: e.target.value })} placeholder="Ej: 101" />
                    <p className="text-xs text-slate-500 mt-1">El número de servicio que aparece en el catálogo de smmengineer</p>
                  </div>
                </div>
                <button onClick={createNewService} disabled={savingService} className="btn-primary mt-4 flex items-center gap-2">
                  {savingService ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Crear servicio
                </button>
              </div>
            )}

            {/* ── Grouped by platform ── */}
            {(() => {
              const PLATFORM_META: Record<string, { label: string; emoji: string; color: string }> = {
                instagram: { label: 'Instagram', emoji: '📸', color: 'from-pink-500/20 to-purple-600/20 border-pink-500/30' },
                tiktok:    { label: 'TikTok',    emoji: '🎵', color: 'from-slate-600/20 to-slate-800/20 border-slate-500/30' },
                youtube:   { label: 'YouTube',   emoji: '▶️', color: 'from-red-600/20 to-red-700/20 border-red-500/30' },
              };
              const CAT_META: Record<string, string> = {
                followers: '👥 Seguidores', likes: '❤️ Likes',
                views: '👁️ Vistas', comments: '💬 Comentarios',
              };
              const platforms = [...new Set(services.map((s) => s.platform))];
              return platforms.map((platform) => {
                const meta = PLATFORM_META[platform] ?? { label: platform, emoji: '📱', color: 'from-slate-500/20 to-slate-600/20 border-slate-500/30' };
                const platServices = services.filter((s) => s.platform === platform);
                const categories = [...new Set(platServices.map((s) => s.category))];
                const isOpen = openPlatforms[platform] !== false;
                return (
                  <div key={platform} className={`rounded-2xl border bg-gradient-to-br ${meta.color} mb-4 overflow-hidden`}>
                    {/* Platform header */}
                    <button
                      onClick={() => togglePlatformSection(platform)}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{meta.emoji}</span>
                        <span className="text-white font-bold text-lg">{meta.label}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300">{platServices.length} servicios</span>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-4">
                        {categories.map((cat) => {
                          const catServices = platServices.filter((s) => s.category === cat);
                          return (
                            <div key={cat}>
                              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                {CAT_META[cat] ?? cat}
                                <span className="text-slate-600">({catServices.length})</span>
                              </div>
                              <div className="space-y-2">
                                {catServices.map((s) => (
                                  <div key={s.id} className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
                                    {editingService === s.id ? (
                                      /* ── Edit mode ── */
                                      <div>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                          <div className="col-span-2">
                                            <label className="text-xs text-slate-400 mb-1 block">Nombre</label>
                                            <input className="input-field" value={String(editForm.name)} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                                          </div>
                                          <div>
                                            <label className="text-xs text-slate-400 mb-1 block">💰 Precio/unidad (ARS)</label>
                                            <input className="input-field" type="number" step="0.0001" value={String(editForm.price_per_unit)} onChange={(e) => setEditForm({ ...editForm, price_per_unit: e.target.value })} />
                                            <p className="text-xs text-slate-500 mt-1">precio × cantidad = total al usuario</p>
                                          </div>
                                          <div>
                                            <label className="text-xs text-slate-400 mb-1 block">⚡ Velocidad de entrega</label>
                                            <input className="input-field" value={String(editForm.delivery_speed)} onChange={(e) => setEditForm({ ...editForm, delivery_speed: e.target.value })} />
                                          </div>
                                          <div>
                                            <label className="text-xs text-slate-400 mb-1 block">📦 Cant. mínima</label>
                                            <input className="input-field" type="number" value={String(editForm.min_quantity)} onChange={(e) => setEditForm({ ...editForm, min_quantity: e.target.value })} />
                                          </div>
                                          <div>
                                            <label className="text-xs text-slate-400 mb-1 block">📦 Cant. máxima</label>
                                            <input className="input-field" type="number" value={String(editForm.max_quantity)} onChange={(e) => setEditForm({ ...editForm, max_quantity: e.target.value })} />
                                          </div>
                                          <div className="col-span-2">
                                            <label className="text-xs text-slate-400 mb-1 block">🔗 ID en smmengineer.com</label>
                                            <input className="input-field" type="number" value={String(editForm.provider_service_id)} onChange={(e) => setEditForm({ ...editForm, provider_service_id: e.target.value })} placeholder="Ej: 101" />
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <button onClick={() => saveEditService(s.id)} disabled={savingService} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                                            {savingService ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Guardar
                                          </button>
                                          <button onClick={() => setEditingService(null)} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white border border-white/10 transition-all">
                                            Cancelar
                                          </button>
                                          <button onClick={() => toggleServiceStatus(s)} className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-medium ${s.is_active ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                            {s.is_active ? 'Desactivar' : 'Activar'}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* ── View mode ── */
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="text-white font-medium text-sm">{s.name}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-400/10 text-green-400' : 'bg-slate-400/10 text-slate-400'}`}>
                                              {s.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                          </div>
                                          <div className="text-xs flex gap-3 flex-wrap mt-1">
                                            <span className="text-primary-400 font-bold">💰 {formatCurrency(parseFloat(String(s.price_per_unit)))}/u</span>
                                            <span className="text-slate-400">📦 {s.min_quantity?.toLocaleString()}–{s.max_quantity?.toLocaleString()}</span>
                                            <span className="text-slate-400">⚡ {s.delivery_speed}</span>
                                            {s.provider_service_id && (
                                              <span className="text-slate-500">ID: {s.provider_service_id}</span>
                                            )}
                                          </div>
                                        </div>
                                        <button onClick={() => startEditService(s)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-all flex-shrink-0">
                                          <Edit className="w-3.5 h-3.5" /> Editar
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
        {tab === 'users' && !loading && (
          <div>
            <h1 className="text-2xl font-black text-white mb-6">Users ({users.length})</h1>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={String(u.id)} className="glass-card p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {String(u.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{String(u.name)}</span>
                      {String(u.role) === 'admin' && <span className="text-xs px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400">Admin</span>}
                      {u.is_active === false && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Banned</span>}
                    </div>
                    <div className="text-slate-400 text-xs">{String(u.email)} • Joined {u.created_at ? formatDate(String(u.created_at)) : '—'}</div>
                  </div>
                  <div className="flex items-center gap-2 text-right flex-shrink-0">
                    <span className="text-primary-400 text-sm font-semibold">{String(u.order_count ?? 0)} orders</span>
                    {String(u.role) !== 'admin' && (
                      <button onClick={() => toggleUserStatus(String(u.id))} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${u.is_active !== false ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                        {u.is_active !== false ? 'Ban' : 'Unban'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coupons Tab */}
        {tab === 'coupons' && !loading && (
          <div>
            <h1 className="text-2xl font-black text-white mb-6">Coupons</h1>
            <div className="space-y-2">
              {coupons.map((c) => (
                <div key={String(c.id)} className="glass-card p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-primary-400 font-mono font-bold">{String(c.code)}</code>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-400/10 text-green-400' : 'bg-slate-400/10 text-slate-400'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-slate-400 text-xs flex gap-3">
                      <span>{String(c.discount_type) === 'percentage' ? `${c.discount_value}% off` : `${formatCurrency(Number(c.discount_value))} off`}</span>
                      <span>Used: {String(c.used_count ?? 0)} / {c.max_uses ? String(c.max_uses) : '∞'}</span>
                      {c.expires_at != null && <span>Expires: {formatDate(String(c.expires_at))}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {coupons.length === 0 && (
                <p className="text-slate-500 text-center py-10">No coupons found.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

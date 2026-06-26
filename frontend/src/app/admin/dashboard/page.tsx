'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  DollarSign, ShoppingCart, Users, TrendingUp, ArrowLeft,
  RefreshCw, Calendar, Award, Star, Zap,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { getStoredUser, isAuthenticated } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
}
interface TopClient { name: string; email: string; totalSpent: number; orderCount: number }
interface TopService { name: string; orderCount: number; revenue: number }
interface OrderStatus { status: string; count: string | number }
interface DailySale { date: string; revenue: string | number; orders: string | number }
interface DashboardData {
  stats: DashboardStats;
  topClients: TopClient[];
  topServices: TopService[];
  ordersByStatus: OrderStatus[];
  dailySales: DailySale[];
  recentOrders: Record<string, unknown>[];
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completado',
  processing: 'Procesando',
  in_progress: 'En progreso',
  pending: 'Pendiente',
  failed: 'Fallido',
  cancelled: 'Cancelado',
  partial: 'Parcial',
  refunded: 'Reembolsado',
};

const STATUS_PIE_COLORS: Record<string, string> = {
  completed: '#10b981',
  processing: '#6366f1',
  in_progress: '#f59e0b',
  pending: '#64748b',
  failed: '#ef4444',
  cancelled: '#dc2626',
  partial: '#f97316',
  refunded: '#8b5cf6',
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'from-pink-500 to-purple-600',
  tiktok: 'from-slate-800 to-slate-600',
  youtube: 'from-red-600 to-red-500',
  twitter: 'from-sky-500 to-blue-600',
  facebook: 'from-blue-700 to-blue-600',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-200 border border-white/10 rounded-xl p-3 shadow-xl">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name === 'revenue' ? formatCurrency(Number(p.value)) : `${p.value} pedidos`}
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const user = getStoredUser();
    if (user?.role !== 'admin') { router.push('/dashboard'); return; }
    fetchData();
  }, []);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await adminApi.getDashboardStats();
      if (res.data.success) setData(res.data);
    } catch {
      /* handled silently */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-300 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-dark-300 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-sm">
          <p className="text-red-400 mb-4">No se pudieron cargar los datos</p>
          <button onClick={() => fetchData()} className="btn-primary px-6">Reintentar</button>
        </div>
      </div>
    );
  }

  // Normalize dailySales numbers
  const dailySales = data.dailySales.map(d => ({
    date: d.date ? d.date.toString().slice(5, 10) : '',
    revenue: Number(d.revenue),
    orders: Number(d.orders),
  }));

  const ordersByStatus = data.ordersByStatus.map(o => ({
    ...o,
    count: Number(o.count),
    label: STATUS_LABELS[o.status] || o.status,
    fill: STATUS_PIE_COLORS[o.status] || '#6b7280',
  }));

  const totalOrdersFromStatus = ordersByStatus.reduce((s, o) => s + o.count, 0);

  const maxRevenue = Math.max(...data.topClients.map(c => c.totalSpent), 1);
  const maxOrders = Math.max(...data.topServices.map(s => s.orderCount), 1);

  const kpis = [
    {
      label: 'Revenue Total',
      value: formatCurrency(data.stats.totalRevenue),
      icon: DollarSign,
      gradient: 'from-primary-500 to-purple-600',
      sub: `Hoy: ${formatCurrency(data.stats.todayRevenue)}`,
    },
    {
      label: 'Revenue Mensual',
      value: formatCurrency(data.stats.monthRevenue),
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-600',
      sub: 'Mes actual',
    },
    {
      label: 'Total Pedidos',
      value: data.stats.totalOrders.toLocaleString('es-AR'),
      icon: ShoppingCart,
      gradient: 'from-amber-500 to-orange-600',
      sub: `${ordersByStatus.find(o => o.status === 'completed')?.count ?? 0} completados`,
    },
    {
      label: 'Usuarios',
      value: data.stats.totalUsers.toLocaleString('es-AR'),
      icon: Users,
      gradient: 'from-sky-500 to-blue-600',
      sub: `${data.topClients.length} top clientes`,
    },
  ];

  return (
    <div className="min-h-screen bg-dark-300 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <Link href="/admin" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al admin
          </Link>
          <div className="sm:ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              Últimos 30 días
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-white">Analytics Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Resumen completo de tu negocio</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="glass-card p-4 sm:p-5 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-[0.06] rounded-2xl`} />
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center mb-3`}>
                <kpi.icon className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white leading-tight">{kpi.value}</div>
              <div className="text-slate-400 text-xs mt-0.5">{kpi.label}</div>
              <div className="text-slate-500 text-[11px] mt-1">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 mb-5">

          {/* Revenue Area Chart — 2/3 width */}
          <div className="xl:col-span-2 glass-card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold">Revenue Diario</h3>
                <p className="text-slate-500 text-xs mt-0.5">Últimos 30 días</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{dailySales.length} días</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailySales} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="revenue" stroke="#6366f1" strokeWidth={2}
                  fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Orders by Status Pie — 1/3 width */}
          <div className="glass-card p-4 sm:p-6">
            <h3 className="text-white font-bold mb-5">Pedidos por Estado</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  dataKey="count" paddingAngle={2}>
                  {ordersByStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any, n: any, props: any) => [v, props.payload.label]}
                  contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-3">
              {ordersByStatus.slice(0, 5).map((o, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: o.fill }} />
                    <span className="text-slate-400 text-xs">{o.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(o.count / totalOrdersFromStatus) * 100}%`, background: o.fill }} />
                    </div>
                    <span className="text-white text-xs font-semibold w-6 text-right">{o.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2 — Bar chart */}
        <div className="glass-card p-4 sm:p-6 mb-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-white font-bold">Pedidos Diarios</h3>
              <p className="text-slate-500 text-xs mt-0.5">Volumen de pedidos en los últimos 30 días</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dailySales} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="orders" name="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom row: Top Clients + Top Services + Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

          {/* Top Clients */}
          <div className="glass-card p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="text-white font-bold">Top Clientes</h3>
            </div>
            <div className="space-y-3">
              {data.topClients.map((client, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-500/20 text-amber-400' :
                    i === 1 ? 'bg-slate-400/20 text-slate-300' :
                    i === 2 ? 'bg-orange-700/20 text-orange-500' :
                    'bg-white/[0.05] text-slate-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{client.name}</div>
                    <div className="text-slate-500 text-xs truncate">{client.email}</div>
                    <div className="mt-1.5 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500"
                        style={{ width: `${(client.totalSpent / maxRevenue) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-primary-400 text-sm font-bold">{formatCurrency(client.totalSpent)}</div>
                    <div className="text-slate-500 text-xs">{client.orderCount} pedidos</div>
                  </div>
                </div>
              ))}
              {data.topClients.length === 0 && <p className="text-slate-500 text-sm text-center py-4">Sin datos aún</p>}
            </div>
          </div>

          {/* Top Services */}
          <div className="glass-card p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-4 h-4 text-primary-400" />
              <h3 className="text-white font-bold">Top Servicios</h3>
            </div>
            <div className="space-y-3">
              {data.topServices.map((service, i) => {
                const platform = Object.keys(PLATFORM_COLORS).find(p =>
                  service.name.toLowerCase().includes(p)
                );
                const gradient = platform ? PLATFORM_COLORS[platform] : 'from-slate-600 to-slate-500';
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{service.name}</div>
                      <div className="mt-1.5 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                          style={{ width: `${(service.orderCount / maxOrders) * 100}%` }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-white text-sm font-semibold">{service.orderCount}</div>
                      <div className="text-slate-500 text-xs">{formatCurrency(service.revenue)}</div>
                    </div>
                  </div>
                );
              })}
              {data.topServices.length === 0 && <p className="text-slate-500 text-sm text-center py-4">Sin datos aún</p>}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="glass-card p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Star className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-bold">Pedidos Recientes</h3>
            </div>
            <div className="space-y-2.5">
              {data.recentOrders.slice(0, 6).map((order: any, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium truncate">{order.service_name ?? 'Servicio'}</div>
                    <div className="text-slate-500 text-[11px] truncate">{order.user_email ?? '—'}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-primary-400 text-xs font-semibold">{formatCurrency(Number(order.price))}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                      order.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                      order.status === 'processing' || order.status === 'in_progress' ? 'bg-primary-500/15 text-primary-400' :
                      order.status === 'failed' || order.status === 'cancelled' ? 'bg-red-500/15 text-red-400' :
                      'bg-white/[0.06] text-slate-400'
                    }`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                </div>
              ))}
              {data.recentOrders.length === 0 && <p className="text-slate-500 text-sm text-center py-4">Sin pedidos aún</p>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

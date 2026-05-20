import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { OrderStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('es-AR').format(value);

export const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  awaiting_payment: 'Esperando pago',
  processing: 'Procesando',
  in_progress: 'En progreso',
  completed: 'Completado',
  partial: 'Parcial',
  failed: 'Fallido',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10',
  awaiting_payment: 'text-orange-400 bg-orange-400/10',
  processing: 'text-blue-400 bg-blue-400/10',
  in_progress: 'text-indigo-400 bg-indigo-400/10',
  completed: 'text-green-400 bg-green-400/10',
  partial: 'text-amber-400 bg-amber-400/10',
  failed: 'text-red-400 bg-red-400/10',
  refunded: 'text-purple-400 bg-purple-400/10',
  cancelled: 'text-slate-400 bg-slate-400/10',
};

export const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  tiktok: '🎵',
  youtube: '▶️',
};

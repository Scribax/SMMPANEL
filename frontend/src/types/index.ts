export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  balance: number;
  referral_code: string;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  category: 'followers' | 'likes' | 'views' | 'comments' | 'boost' | 'reactions';
  platform: 'instagram' | 'tiktok' | 'youtube' | 'discord' | 'telegram';
  description: string;
  price_per_unit: number;
  min_quantity: number;
  max_quantity: number;
  delivery_speed: string;
  is_active: boolean;
  sort_order: number;
  provider_service_id?: number | null;
  provider_id?: string | null;
}

export interface Order {
  id: string;
  service_id: string;
  service_name: string;
  platform: string;
  link: string;
  quantity: number;
  price: number;
  original_price: number | null;
  status: OrderStatus;
  provider_order_id: string | null;
  start_count: number | null;
  remains: number | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'processing'
  | 'in_progress'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  external_id: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
}

export interface Provider {
  id: string;
  name: string;
  api_url: string;
  is_active: boolean;
  created_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface CheckoutPayload {
  serviceId: string;
  quantity: number;
  link: string;
  email: string;
  couponCode?: string;
}

export interface CheckoutResult {
  orderId: string;
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
  price: number;
  originalPrice: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
}

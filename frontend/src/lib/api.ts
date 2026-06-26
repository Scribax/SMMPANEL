import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('FollowArg_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('FollowArg_token');
      localStorage.removeItem('FollowArg_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; password: string; name: string; referralCode?: string }) =>
    apiClient.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),
  getMe: () => apiClient.get('/auth/me'),
  getMyReferrals: () => apiClient.get('/auth/my-referrals'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put('/auth/change-password', data),
};

export const servicesApi = {
  getAll: () => apiClient.get('/services'),
  getById: (id: string) => apiClient.get(`/services/${id}`),
  getByPlatform: (platform: string) => apiClient.get(`/services/platform/${platform}`),
  calculatePrice: (serviceId: string, quantity: number) =>
    apiClient.post('/services/calculate-price', { serviceId, quantity }),
};

export const ordersApi = {
  getMyOrders: (page = 1, limit = 10) =>
    apiClient.get('/orders', { params: { page, limit } }),
  getById: (id: string) => apiClient.get(`/orders/${id}`),
  requestRefill: (id: string) => apiClient.post(`/orders/${id}/refill`),
  cancel: (id: string) => apiClient.post(`/orders/${id}/cancel`),
};

export const paymentsApi = {
  createCheckout: (data: {
    serviceId: string;
    quantity: number;
    link: string;
    email: string;
    couponCode?: string;
  }) => apiClient.post('/payments/checkout', data),
  getStatus: (orderId: string) => apiClient.get(`/payments/status/${orderId}`),
  createDeposit: (amount: number) => apiClient.post('/payments/deposit', { amount }),
  getDeposits: () => apiClient.get('/payments/deposits'),
  verifyDeposit: (paymentId: string) => apiClient.post('/payments/verify-deposit', { paymentId }),
};

export const couponsApi = {
  validate: (code: string, orderAmount?: number) =>
    apiClient.post('/coupons/validate', { code, orderAmount }),
};

export const ticketsApi = {
  createTicket: (data: { subject: string; message: string; priority?: string }) =>
    apiClient.post('/tickets', data),
  getMyTickets: (page = 1, limit = 20) =>
    apiClient.get('/tickets/my-tickets', { params: { page, limit } }),
  getTicketMessages: (ticketId: string) =>
    apiClient.get(`/tickets/${ticketId}/messages`),
  addMessage: (ticketId: string, message: string) =>
    apiClient.post(`/tickets/${ticketId}/messages`, { message }),
  adminGetAllTickets: (page = 1, limit = 20, status?: string) =>
    apiClient.get('/tickets/admin/all', { params: { page, limit, status } }),
  adminUpdateTicketStatus: (ticketId: string, data: { status: string; assigned_to?: string }) =>
    apiClient.put(`/tickets/admin/${ticketId}/status`, data),
};

export const utilsApi = {
  getLinkPreview: (url: string) => apiClient.get('/utils/link-preview', { params: { url } }),
};

export const adminApi = {
  getStats: () => apiClient.get('/admin/stats'),
  getDashboardStats: () => apiClient.get('/admin/dashboard-stats'),
  getServices: () => apiClient.get('/admin/services'),
  createService: (data: object) => apiClient.post('/admin/services', data),
  updateService: (id: string, data: object) => apiClient.put(`/admin/services/${id}`, data),
  deleteService: (id: string) => apiClient.delete(`/admin/services/${id}`),
  getProviders: () => apiClient.get('/admin/providers'),
  createProvider: (data: object) => apiClient.post('/admin/providers', data),
  updateProvider: (id: string, data: object) => apiClient.put(`/admin/providers/${id}`, data),
  getOrders: (page = 1, limit = 20, status?: string) =>
    apiClient.get('/admin/orders', { params: { page, limit, status } }),
  updateOrderStatus: (id: string, status: string) =>
    apiClient.put(`/admin/orders/${id}/status`, { status }),
  refundOrder: (id: string) => apiClient.post(`/admin/orders/${id}/refund`),
  retryOrder: (id: string) => apiClient.post(`/admin/orders/${id}/retry`),
  createOrder: (data: { userId: string; serviceId: string; quantity: number; link: string }) =>
    apiClient.post('/admin/orders', data),
  getUsers: (page = 1, limit = 200, search?: string) =>
    apiClient.get('/admin/users', { params: { page, limit, ...(search ? { search } : {}) } }),
  getUserDetail: (id: string) => apiClient.get(`/admin/users/${id}`),
  toggleUser: (id: string) => apiClient.post(`/admin/users/${id}/toggle`),
  adjustUserBalance: (id: string, amount: number, reason?: string) =>
    apiClient.post(`/admin/users/${id}/balance`, { amount, reason }),
  deleteUser: (id: string) => apiClient.delete(`/admin/users/${id}`),
  changeUserRole: (id: string, role: 'user' | 'admin') =>
    apiClient.put(`/admin/users/${id}/role`, { role }),
  deleteOrder: (id: string) => apiClient.delete(`/admin/orders/${id}`),
  getCoupons: () => apiClient.get('/admin/coupons'),
  createCoupon: (data: object) => apiClient.post('/admin/coupons', data),
  updateCoupon: (id: string, data: object) => apiClient.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id: string) => apiClient.delete(`/admin/coupons/${id}`),
  previewMarketingEmail: (data: {
    audience: 'all' | 'active' | 'selected';
    userIds: string[];
    subject: string;
    title: string;
    message: string;
    ctaText?: string;
    ctaUrl?: string;
    customHtml?: string;
  }) => apiClient.post('/admin/marketing-email/preview', data),
  sendMarketingEmail: (data: {
    audience: 'all' | 'active' | 'selected';
    userIds: string[];
    subject: string;
    title: string;
    message: string;
    ctaText?: string;
    ctaUrl?: string;
    customHtml?: string;
  }) => apiClient.post('/admin/marketing-email/send', data),
};

export const pushApi = {
  getVapidKey: () => apiClient.get<{ success: boolean; publicKey: string }>('/push/vapid-key'),
  subscribe: (subscription: any) => apiClient.post('/push/subscribe', subscription),
  unsubscribe: (endpoint: string) => apiClient.delete('/push/unsubscribe', { data: { endpoint } }),
};


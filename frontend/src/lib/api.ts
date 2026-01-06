import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token and session ID
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  const sessionId = useAuthStore.getState().sessionId;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (sessionId) {
    config.headers['X-Session-Id'] = sessionId;
  }

  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          useAuthStore.getState().setTokens(accessToken, newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const apiHelpers = {
  // Auth
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  getSession: () => api.post('/auth/session'),

  // Products
  getProducts: (params?: Record<string, unknown>) =>
    api.get('/products', { params }),
  getProduct: (idOrSlug: string) =>
    api.get(`/products/${idOrSlug}`),
  getFeaturedProducts: () =>
    api.get('/products/featured'),

  // Categories
  getCategories: () => api.get('/categories'),
  getCategory: (idOrSlug: string) =>
    api.get(`/categories/${idOrSlug}`),

  // Cart
  getCart: () => api.get('/cart'),
  addToCart: (data: { productId: string; quantity: number; warrantyId?: string; isUpsell?: boolean; upsellSource?: string }) =>
    api.post('/cart/items', data),
  updateCartItem: (itemId: string, data: { quantity?: number; warrantyId?: string | null }) =>
    api.put(`/cart/items/${itemId}`, data),
  removeCartItem: (itemId: string) =>
    api.delete(`/cart/items/${itemId}`),
  clearCart: () => api.delete('/cart'),
  setShippingAddress: (address: Record<string, unknown>) =>
    api.put('/cart/shipping-address', address),
  setBillingAddress: (address: Record<string, unknown>) =>
    api.put('/cart/billing-address', address),
  mergeCarts: () => api.post('/cart/merge'),

  // Orders
  createOrder: (data: { cartId: string; paymentMethod: string; paymentIntentId?: string; financingApprovalId?: string }) =>
    api.post('/orders', data),
  getOrders: (params?: Record<string, unknown>) =>
    api.get('/orders', { params }),
  getOrder: (id: string) => api.get(`/orders/${id}`),
  cancelOrder: (id: string, reason: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),

  // Financing
  getFinancingPlatforms: () => api.get('/financing/platforms'),
  getFinancingOptions: (platformId: string, cartId?: string) =>
    api.get(`/financing/platforms/${platformId}/options`, { params: { cartId } }),
  submitFinancingApplication: (data: { cartId: string; platformId: string; applicantInfo: Record<string, unknown> }) =>
    api.post('/financing/applications', data),
  getFinancingApplication: (id: string) =>
    api.get(`/financing/applications/${id}`),

  // Warranty
  getWarrantyPlans: (productId: string) =>
    api.get(`/warranty/product/${productId}/plans`),
  getWarrantyContracts: () => api.get('/warranty/contracts'),

  // Upsell
  getProductUpsells: (productId: string, params?: Record<string, unknown>) =>
    api.get(`/upsell/product/${productId}`, { params }),
  getCartUpsells: (cartId: string) =>
    api.get(`/upsell/cart/${cartId}`),
  trackUpsellInteraction: (data: { productId: string; suggestedProductId: string; source: string; action: string; location: string }) =>
    api.post('/upsell/track', data),

  // Payments
  createPaymentIntent: (cartId: string) =>
    api.post('/payments/create-intent', { cartId }),
  getPaymentMethods: () => api.get('/payments/methods'),

  // User
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: Record<string, unknown>) =>
    api.put('/users/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/users/password', data),
  getAddresses: () => api.get('/users/addresses'),
  addAddress: (address: Record<string, unknown>) =>
    api.post('/users/addresses', address),
  updateAddress: (id: string, address: Record<string, unknown>) =>
    api.put(`/users/addresses/${id}`, address),
  deleteAddress: (id: string) =>
    api.delete(`/users/addresses/${id}`),
};

export default api;


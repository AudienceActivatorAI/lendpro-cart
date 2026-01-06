import { create } from 'zustand';
import { apiHelpers } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: Array<{ url: string; isPrimary?: boolean }> | string;
  stock: number;
  isActive: boolean;
}

interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warrantyId?: string;
  warranty?: { id: string; name: string; price: number };
  warrantyPrice?: number;
  isUpsell: boolean;
  upsellSource?: string;
}

interface Cart {
  id: string;
  userId?: string;
  sessionId: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  itemCount?: number;
  couponCode?: string;
  shippingAddress?: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
}

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  isDrawerOpen: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number, warrantyId?: string, isUpsell?: boolean, upsellSource?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateWarranty: (itemId: string, warrantyId: string | null) => Promise<void>;
  clearCart: () => Promise<void>;
  setShippingAddress: (address: Record<string, unknown>) => Promise<void>;
  setBillingAddress: (address: Record<string, unknown>) => Promise<void>;
  mergeCarts: () => Promise<void>;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

export const useCartStore = create<CartState>((set, _get) => ({
  cart: null,
  isLoading: false,
  isDrawerOpen: false,
  error: null,

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiHelpers.getCart();
      set({ cart: response.data.data.cart, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch cart', isLoading: false });
    }
  },

  addToCart: async (productId, quantity = 1, warrantyId, isUpsell = false, upsellSource) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiHelpers.addToCart({
        productId,
        quantity,
        warrantyId,
        isUpsell,
        upsellSource,
      });
      set({ cart: response.data.data.cart, isLoading: false, isDrawerOpen: true });
    } catch (error) {
      set({ error: 'Failed to add to cart', isLoading: false });
      throw error;
    }
  },

  updateItem: async (itemId, quantity) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiHelpers.updateCartItem(itemId, { quantity });
      set({ cart: response.data.data.cart, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to update cart', isLoading: false });
      throw error;
    }
  },

  removeItem: async (itemId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiHelpers.removeCartItem(itemId);
      set({ cart: response.data.data.cart, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to remove item', isLoading: false });
      throw error;
    }
  },

  updateWarranty: async (itemId, warrantyId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiHelpers.updateCartItem(itemId, { warrantyId });
      set({ cart: response.data.data.cart, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to update warranty', isLoading: false });
      throw error;
    }
  },

  clearCart: async () => {
    set({ isLoading: true, error: null });
    try {
      await apiHelpers.clearCart();
      set({ cart: null, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to clear cart', isLoading: false });
      throw error;
    }
  },

  setShippingAddress: async (address) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiHelpers.setShippingAddress(address);
      set({ cart: response.data.data.cart, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to set shipping address', isLoading: false });
      throw error;
    }
  },

  setBillingAddress: async (address) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiHelpers.setBillingAddress(address);
      set({ cart: response.data.data.cart, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to set billing address', isLoading: false });
      throw error;
    }
  },

  mergeCarts: async () => {
    try {
      const response = await apiHelpers.mergeCarts();
      if (response.data.data.cart) {
        set({ cart: response.data.data.cart });
      }
    } catch (error) {
      console.error('Failed to merge carts:', error);
    }
  },

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
}));

export default useCartStore;


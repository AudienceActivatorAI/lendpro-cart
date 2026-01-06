import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  images: string[] | Array<{ url: string; isPrimary?: boolean }> | string;
  stock: number;
  isActive: boolean;
  category?: { id: string; name: string; slug: string };
}

interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warrantyId?: string;
  warranty?: { id: string; name: string; price: number };
  warrantyPrice?: number;
}

interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  itemCount: number;
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
  addProductToCart: (product: Product, quantity?: number) => void;
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

const TAX_RATE = 0.08;
const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_COST = 9.99;

function calculateCartTotals(items: CartItem[]): Omit<Cart, 'id' | 'items' | 'shippingAddress' | 'billingAddress'> {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxTotal = subtotal * TAX_RATE;
  const shippingTotal = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + taxTotal + shippingTotal;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotal,
    discountTotal: 0,
    taxTotal,
    shippingTotal,
    total,
    itemCount,
  };
}

function createEmptyCart(): Cart {
  return {
    id: `cart-${Date.now()}`,
    items: [],
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    shippingTotal: 0,
    total: 0,
    itemCount: 0,
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      isLoading: false,
      isDrawerOpen: false,
      error: null,

      fetchCart: async () => {
        // Cart is already in state via persist, just ensure it exists
        const currentCart = get().cart;
        if (!currentCart) {
          set({ cart: createEmptyCart() });
        }
      },

      addProductToCart: (product: Product, quantity = 1) => {
        set({ isLoading: true, error: null });
        
        const currentCart = get().cart || createEmptyCart();
        const existingItemIndex = currentCart.items.findIndex(
          item => item.productId === product.id
        );

        let newItems: CartItem[];

        if (existingItemIndex >= 0) {
          // Update existing item
          newItems = currentCart.items.map((item, index) => {
            if (index === existingItemIndex) {
              const newQuantity = item.quantity + quantity;
              return {
                ...item,
                quantity: newQuantity,
                totalPrice: item.unitPrice * newQuantity,
              };
            }
            return item;
          });
        } else {
          // Add new item
          const newItem: CartItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            productId: product.id,
            product,
            quantity,
            unitPrice: product.price,
            totalPrice: product.price * quantity,
          };
          newItems = [...currentCart.items, newItem];
        }

        const totals = calculateCartTotals(newItems);
        
        set({
          cart: {
            ...currentCart,
            items: newItems,
            ...totals,
          },
          isLoading: false,
          isDrawerOpen: true,
        });
      },

      addToCart: async (productId, quantity = 1) => {
        set({ isLoading: true, error: null });
        
        try {
          // Fetch product data from API
          const response = await fetch(`/api/products/${productId}`);
          const data = await response.json();
          
          if (!data.success || !data.data.product) {
            throw new Error('Product not found');
          }

          const product = data.data.product;
          get().addProductToCart(product, quantity);
        } catch (error) {
          set({ error: 'Failed to add to cart', isLoading: false });
          throw error;
        }
      },

      updateItem: async (itemId, quantity) => {
        set({ isLoading: true, error: null });
        
        const currentCart = get().cart;
        if (!currentCart) {
          set({ isLoading: false });
          return;
        }

        let newItems: CartItem[];
        
        if (quantity <= 0) {
          newItems = currentCart.items.filter(item => item.id !== itemId);
        } else {
          newItems = currentCart.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                quantity,
                totalPrice: item.unitPrice * quantity,
              };
            }
            return item;
          });
        }

        const totals = calculateCartTotals(newItems);
        
        set({
          cart: {
            ...currentCart,
            items: newItems,
            ...totals,
          },
          isLoading: false,
        });
      },

      removeItem: async (itemId) => {
        set({ isLoading: true, error: null });
        
        const currentCart = get().cart;
        if (!currentCart) {
          set({ isLoading: false });
          return;
        }

        const newItems = currentCart.items.filter(item => item.id !== itemId);
        const totals = calculateCartTotals(newItems);
        
        set({
          cart: {
            ...currentCart,
            items: newItems,
            ...totals,
          },
          isLoading: false,
        });
      },

      updateWarranty: async (itemId, warrantyId) => {
        // Warranty functionality - can be implemented later
        console.log('Update warranty:', itemId, warrantyId);
      },

      clearCart: async () => {
        set({ cart: createEmptyCart(), isLoading: false });
      },

      setShippingAddress: async (address) => {
        const currentCart = get().cart || createEmptyCart();
        set({
          cart: {
            ...currentCart,
            shippingAddress: address,
          },
        });
      },

      setBillingAddress: async (address) => {
        const currentCart = get().cart || createEmptyCart();
        set({
          cart: {
            ...currentCart,
            billingAddress: address,
          },
        });
      },

      mergeCarts: async () => {
        // No-op for client-side cart
      },

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
    }),
    {
      name: 'lendpro-cart-storage',
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);

export default useCartStore;

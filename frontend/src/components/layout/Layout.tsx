import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from '../cart/CartDrawer';
import { useCartStore } from '@/stores/cart';
import { useAuthStore } from '@/stores/auth';
import { apiHelpers } from '@/lib/api';

export function Layout() {
  const fetchCart = useCartStore((state) => state.fetchCart);
  const mergeCarts = useCartStore((state) => state.mergeCarts);
  const { isAuthenticated, setLoading, setUser, token } = useAuthStore();

  useEffect(() => {
    // Check if user is authenticated on mount
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await apiHelpers.getMe();
          setUser(response.data.data.user);
          // Merge carts after login verification
          await mergeCarts();
        } catch {
          // Token invalid, clear auth state
          useAuthStore.getState().logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token, setLoading, setUser, mergeCarts]);

  useEffect(() => {
    // Fetch cart on mount
    fetchCart();
  }, [fetchCart, isAuthenticated]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}

export default Layout;


import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '@/stores/cart';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const cart = useCartStore((state) => state.cart);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src="/images/lendpro-icon.svg" alt="LendPro" className="w-9 h-9" />
            <span className="font-display text-xl font-semibold">LendPro Cart</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/products" className="text-sm font-medium hover:text-primary transition-colors">
              Shop All
            </Link>
            <Link to="/tires-wheels" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
              <span>Tires & Wheels</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded-full">NEW</span>
            </Link>
            <Link to="/products?category=electronics" className="text-sm font-medium hover:text-primary transition-colors">
              Electronics
            </Link>
            <Link to="/products?category=furniture" className="text-sm font-medium hover:text-primary transition-colors">
              Furniture
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* User */}
            {isAuthenticated ? (
              <div className="relative group">
                <button className="p-2 hover:bg-muted rounded-full transition-colors flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span className="hidden md:inline text-sm">{user?.firstName}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-card border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="p-2">
                    <Link
                      to="/account"
                      className="block px-4 py-2 text-sm hover:bg-muted rounded-md"
                    >
                      My Account
                    </Link>
                    <Link
                      to="/account/orders"
                      className="block px-4 py-2 text-sm hover:bg-muted rounded-md"
                    >
                      Orders
                    </Link>
                    <hr className="my-2" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted rounded-md"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <User className="w-5 h-5" />
              </Link>
            )}

            {/* Cart */}
            <button
              onClick={openDrawer}
              className="relative p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            isSearchOpen ? 'h-16 opacity-100' : 'h-0 opacity-0'
          )}
        >
          <div className="py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300',
            isMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <nav className="py-4 space-y-2">
            <Link
              to="/products"
              className="block px-4 py-2 text-sm hover:bg-muted rounded-md"
              onClick={() => setIsMenuOpen(false)}
            >
              Shop All
            </Link>
            <Link
              to="/tires-wheels"
              className="block px-4 py-2 text-sm hover:bg-muted rounded-md flex items-center gap-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Tires & Wheels
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded-full">NEW</span>
            </Link>
            <Link
              to="/products?category=electronics"
              className="block px-4 py-2 text-sm hover:bg-muted rounded-md"
              onClick={() => setIsMenuOpen(false)}
            >
              Electronics
            </Link>
            <Link
              to="/products?category=furniture"
              className="block px-4 py-2 text-sm hover:bg-muted rounded-md"
              onClick={() => setIsMenuOpen(false)}
            >
              Furniture
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;


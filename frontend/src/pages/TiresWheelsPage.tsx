import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ShoppingCart, X, Trash2, ChevronRight, CreditCard, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// AutoSync API Key - can be set via environment variable
const AUTOSYNC_API_KEY = import.meta.env.VITE_AUTOSYNC_API_KEY || 'v3C4lXEncDytIJUmPnrC';

// Declare the Autosync type for TypeScript
declare global {
  interface Window {
    Autosync: new (config: AutosyncConfig) => void;
  }
}

interface AutosyncConfig {
  id: string;
  key: string;
  adaptiveHeight?: boolean;
  disableQuoteForm?: boolean;
  homeStyle?: string | null;
  productSegment?: string[] | string | null;
  onEvent?: (params: { event: string; data: AutosyncEventData }) => void;
  scrollBar?: boolean;
  startPage?: string | null;
  widget?: boolean | object;
  customStyleSheet?: string | null;
}

interface AutosyncProduct {
  partNumber: string;
  brand: string;
  displayName: string;
  price: number;
  quantity: number;
  image?: string;
}

interface AutosyncEventData {
  vehicle?: {
    id: number;
    make: string;
    model: string;
    year: number;
  };
  wheels?: AutosyncProduct[];
  tires?: AutosyncProduct[];
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  type: string;
  partNumber: string;
  brand: string;
}

export function TiresWheelsPage() {
  const scriptLoadedRef = useRef(false);
  const visualizerInitializedRef = useRef(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment' | 'info'>('cart');
  const [visualizerError, setVisualizerError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart items from localStorage on mount
  useEffect(() => {
    const loadCartItems = () => {
      const items = JSON.parse(localStorage.getItem('autosync-cart-items') || '[]');
      setCartItems(items);
    };
    
    loadCartItems();
    
    // Listen for cart updates
    const handleCartUpdate = () => loadCartItems();
    window.addEventListener('autosync-cart-updated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('autosync-cart-updated', handleCartUpdate);
    };
  }, []);

  useEffect(() => {
    // Prevent double initialization
    if (scriptLoadedRef.current) {
      if (!visualizerInitializedRef.current && window.Autosync) {
        initializeVisualizer();
      }
      return;
    }
    
    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://vvs.autosyncstudio.com/js/Autosync.js"]');
    if (existingScript) {
      scriptLoadedRef.current = true;
      if (window.Autosync && !visualizerInitializedRef.current) {
        initializeVisualizer();
      }
      return;
    }

    // Load the AutoSync script
    const script = document.createElement('script');
    script.src = 'https://vvs.autosyncstudio.com/js/Autosync.js';
    script.async = true;
    
    script.onload = () => {
      scriptLoadedRef.current = true;
      initializeVisualizer();
    };

    script.onerror = () => {
      console.error('Failed to load AutoSync script');
      setIsLoading(false);
      setVisualizerError(true);
    };
    
    document.body.appendChild(script);

    return () => {
      // Don't remove script on unmount to allow re-initialization
    };
  }, []);

  const initializeVisualizer = () => {
    if (!window.Autosync || visualizerInitializedRef.current) {
      return;
    }

    // Clear the container first
    const container = document.getElementById('autosync-visualizer');
    if (container) {
      container.innerHTML = '';
    }

    visualizerInitializedRef.current = true;
    setIsLoading(false);

    try {
      new window.Autosync({
        id: 'autosync-visualizer',
        key: AUTOSYNC_API_KEY,
        adaptiveHeight: true,
        disableQuoteForm: true,
        homeStyle: 'lookup',
        productSegment: ['tires', 'wheels', 'vehicles'],
        scrollBar: false,
        startPage: null,
        widget: false,
        onEvent: handleAutoSyncEvent,
      });

      // Check for error after a delay (AutoSync shows error in iframe)
      setTimeout(() => {
        const container = document.getElementById('autosync-visualizer');
        if (container) {
          const iframe = container.querySelector('iframe');
          if (!iframe || iframe.clientHeight < 100) {
            setVisualizerError(true);
          }
        }
      }, 3000);
    } catch (error) {
      console.error('Failed to initialize AutoSync visualizer:', error);
      setVisualizerError(true);
    }
  };

  const handleAutoSyncEvent = async ({ event, data }: { event: string; data: AutosyncEventData }) => {
    console.log('AutoSync Event:', event, data);

    if (event === 'submitQuote' || event === 'addToCart') {
      const wheels = data?.wheels || [];
      const tires = data?.tires || [];
      const allProducts = [...wheels, ...tires];

      if (allProducts.length === 0) {
        toast.error('No products selected');
        return;
      }

      // Add each product to the LendPro cart
      let addedCount = 0;
      for (const product of allProducts) {
        try {
          await addToCartCustomProduct({
            id: `autosync-${product.partNumber}`,
            name: product.displayName || `${product.brand} - ${product.partNumber}`,
            price: product.price || 0,
            quantity: product.quantity || 4,
            image: product.image,
            type: wheels.includes(product) ? 'wheel' : 'tire',
            partNumber: product.partNumber,
            brand: product.brand,
          });
          addedCount++;
        } catch (error) {
          console.error('Error adding product to cart:', error);
        }
      }

      if (addedCount > 0) {
        toast.success(`Added ${addedCount} item(s) to cart`, {
          description: 'Tires & wheels ready for checkout',
          action: {
            label: 'View Cart',
            onClick: () => setShowCartModal(true),
          },
        });
      }
    }
  };

  const addToCartCustomProduct = async (product: CartItem) => {
    try {
      const existingAutoSyncItems = JSON.parse(localStorage.getItem('autosync-cart-items') || '[]');
      
      const existingIndex = existingAutoSyncItems.findIndex(
        (item: CartItem) => item.partNumber === product.partNumber
      );
      
      if (existingIndex >= 0) {
        existingAutoSyncItems[existingIndex].quantity += product.quantity;
      } else {
        existingAutoSyncItems.push(product);
      }
      
      localStorage.setItem('autosync-cart-items', JSON.stringify(existingAutoSyncItems));
      setCartItems(existingAutoSyncItems);
      window.dispatchEvent(new CustomEvent('autosync-cart-updated'));
      
      return true;
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    }
  };

  const removeFromCart = (partNumber: string) => {
    const updatedItems = cartItems.filter(item => item.partNumber !== partNumber);
    localStorage.setItem('autosync-cart-items', JSON.stringify(updatedItems));
    setCartItems(updatedItems);
    window.dispatchEvent(new CustomEvent('autosync-cart-updated'));
  };

  const updateQuantity = (partNumber: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const updatedItems = cartItems.map(item => 
      item.partNumber === partNumber ? { ...item, quantity: newQuantity } : item
    );
    localStorage.setItem('autosync-cart-items', JSON.stringify(updatedItems));
    setCartItems(updatedItems);
  };

  const clearCart = () => {
    localStorage.removeItem('autosync-cart-items');
    setCartItems([]);
    window.dispatchEvent(new CustomEvent('autosync-cart-updated'));
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const monthlyPayment = (cartTotal * 1.15) / 18; // 15% financing cost over 18 months

  const handleProceedToCheckout = () => {
    setShowCartModal(false);
    setShowCheckoutModal(true);
    setCheckoutStep('payment');
  };

  const handlePaymentMethodSelect = (method: 'card' | 'financing') => {
    if (method === 'financing') {
      // Open LendPro financing in new tab or redirect
      window.open('https://lendpro.com/apply', '_blank');
      toast.success('Opening LendPro financing application...');
    } else {
      // Proceed to card payment
      setCheckoutStep('info');
    }
  };

  return (
    <div className="tires-wheels-page">
      {/* Financing Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="max-w-[1400px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <img src="/images/lendpro-icon.svg" alt="LendPro" className="w-10 h-10" />
              <div>
                <p className="font-semibold">Finance Your Tires & Wheels</p>
                <p className="text-sm text-gray-300">Pay over time with LendPro – No credit needed</p>
              </div>
            </div>
            <button 
              onClick={() => setShowCheckoutModal(true)}
              className="px-6 py-2.5 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 transition-colors"
            >
              Apply for Financing
            </button>
          </div>
        </div>
      </div>

      {/* AutoSync Visualizer Container */}
      <div className="relative">
        {/* Loading State */}
        {isLoading && (
          <div className="autosync-container flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading Tire & Wheel Visualizer...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {visualizerError && (
          <div className="autosync-container flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md p-8">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Visualizer Unavailable</h3>
              <p className="text-gray-600 mb-4">
                The tire & wheel visualizer is currently unavailable. This may be due to API configuration.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Please contact support or try again later.
              </p>
              <button
                onClick={() => {
                  setVisualizerError(false);
                  setIsLoading(true);
                  visualizerInitializedRef.current = false;
                  initializeVisualizer();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Visualizer Container */}
        <div 
          id="autosync-visualizer" 
          className={`autosync-container ${isLoading || visualizerError ? 'hidden' : ''}`}
        />

        {/* Floating Cart Button */}
        {cartItems.length > 0 && (
          <button
            onClick={() => setShowCartModal(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all hover:scale-105 animate-pulse-slow"
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                {cartCount}
              </span>
            </div>
            <div className="text-left">
              <p className="font-semibold">Checkout</p>
              <p className="text-sm opacity-90">{formatCurrency(cartTotal)}</p>
            </div>
          </button>
        )}
      </div>

      {/* Cart Modal */}
      {showCartModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-slate-800 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <img src="/images/lendpro-icon.svg" alt="LendPro" className="w-8 h-8" />
                <div>
                  <h2 className="text-xl font-bold">Your Cart</h2>
                  <p className="text-sm text-gray-300">{cartCount} item(s)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCartModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">Your cart is empty</p>
                  <p className="text-sm">Add tires or wheels from the visualizer</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.partNumber} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">🛞</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.brand} • {item.partNumber}</p>
                      <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => updateQuantity(item.partNumber, item.quantity - 1)}
                            className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold hover:bg-gray-300"
                          >
                            -
                          </button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.partNumber, item.quantity + 1)}
                            className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold hover:bg-gray-300"
                          >
                            +
                          </button>
                        </div>
                        <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.partNumber)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg self-start"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer with Totals and Checkout */}
            {cartItems.length > 0 && (
              <div className="border-t p-4 space-y-4 bg-gray-50">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Mounting & Balancing</span>
                    <span className="text-green-600 font-medium">FREE</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <img src="/images/lendpro-icon.svg" alt="LendPro" className="w-6 h-6" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">Pay as low as {formatCurrency(monthlyPayment)}/mo</p>
                      <p className="text-xs text-blue-700">with LendPro Financing • Up to 18 months</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={clearCart}
                    className="px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-100 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleProceedToCheckout}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Checkout
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-slate-800 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <img src="/images/lendpro-icon.svg" alt="LendPro" className="w-8 h-8" />
                <h2 className="text-xl font-bold">Checkout</h2>
              </div>
              <button 
                onClick={() => {
                  setShowCheckoutModal(false);
                  setCheckoutStep('cart');
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Method Selection */}
            {checkoutStep === 'payment' && (
              <div className="p-6 space-y-4">
                <p className="text-gray-600 text-center mb-6">Choose how you'd like to pay</p>
                
                {/* Order Summary */}
                {cartItems.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">{cartCount} item(s)</span>
                      <span className="font-semibold">{formatCurrency(cartTotal)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {cartItems.map(item => item.name).join(', ')}
                    </div>
                  </div>
                )}

                {/* Pay Today Option */}
                <button
                  onClick={() => handlePaymentMethodSelect('card')}
                  className="w-full flex items-center gap-4 p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <img src="/images/visa-logo.svg" alt="Visa" className="h-6" />
                    <img src="/images/mastercard-logo.svg" alt="Mastercard" className="h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">Pay Today</p>
                    <p className="text-sm text-gray-500">Credit / Debit Card</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                </button>

                {/* LendPro Financing Option */}
                <button
                  onClick={() => handlePaymentMethodSelect('financing')}
                  className="w-full flex items-center gap-4 p-5 border-2 border-blue-500 rounded-xl bg-blue-50 hover:bg-blue-100 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                    POPULAR
                  </div>
                  <img src="/images/lendpro-icon.svg" alt="LendPro" className="w-10 h-10" />
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">Pay Later with LendPro</p>
                    <p className="text-sm text-blue-600 font-medium">
                      As low as {formatCurrency(monthlyPayment)}/mo for 18 months
                    </p>
                    <p className="text-xs text-gray-500 mt-1">No credit needed • Instant approval</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-500" />
                </button>

                <p className="text-xs text-gray-500 text-center pt-4">
                  🔒 Secure checkout powered by LendPro
                </p>
              </div>
            )}

            {/* Card Payment Info Form */}
            {checkoutStep === 'info' && (
              <div className="p-6 space-y-4">
                <button 
                  onClick={() => setCheckoutStep('payment')}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Back to payment options
                </button>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="4242 4242 4242 4242"
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                      <input 
                        type="text" 
                        placeholder="MM/YY"
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                      <input 
                        type="text" 
                        placeholder="123"
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mt-4">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    toast.success('Payment processing...', { description: 'This is a demo checkout' });
                    setTimeout(() => {
                      clearCart();
                      setShowCheckoutModal(false);
                      setCheckoutStep('cart');
                      toast.success('Order placed successfully!', { description: 'Thank you for your purchase' });
                    }, 2000);
                  }}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Pay {formatCurrency(cartTotal)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-white border-t">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Visualize Before You Buy</h3>
              <p className="text-gray-600">See exactly how wheels will look on your specific vehicle before purchasing.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Flexible Financing</h3>
              <p className="text-gray-600">Get approved instantly with LendPro. Pay over 18 months with low monthly payments.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Professional Installation</h3>
              <p className="text-gray-600">Free mounting, balancing, and installation at partner locations nationwide.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TiresWheelsPage;

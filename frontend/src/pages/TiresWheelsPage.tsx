import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/stores/cart';
import { toast } from 'sonner';

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

export function TiresWheelsPage() {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const visualizerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Load the AutoSync script
    if (scriptLoadedRef.current) return;
    
    const script = document.createElement('script');
    script.src = 'https://vvs.autosyncstudio.com/js/Autosync.js';
    script.async = true;
    
    script.onload = () => {
      scriptLoadedRef.current = true;
      initializeVisualizer();
    };
    
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://vvs.autosyncstudio.com/js/Autosync.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const initializeVisualizer = () => {
    if (!window.Autosync) {
      console.error('AutoSync script not loaded');
      return;
    }

    new window.Autosync({
      id: 'autosync-visualizer',
      key: 'v3C4lXEncDytIJUmPnrC',
      adaptiveHeight: true,
      disableQuoteForm: true, // We'll use our own checkout
      homeStyle: 'lookup',
      productSegment: ['tires', 'wheels', 'vehicles'],
      scrollBar: true,
      startPage: null,
      widget: {
        sizesLookup: true,
        brandsLookup: true,
        vehiclesLookup: true,
      },
      onEvent: handleAutoSyncEvent,
    });
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
          // Create a custom product entry for tires/wheels
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
          description: 'Tires & wheels from AutoSync',
          action: {
            label: 'View Cart',
            onClick: () => navigate('/cart'),
          },
        });
      }
    }
  };

  // Custom function to add AutoSync products to cart
  const addToCartCustomProduct = async (product: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    type: string;
    partNumber: string;
    brand: string;
  }) => {
    // For now, we'll use the mock cart system
    // In production, this would call a dedicated API endpoint
    try {
      // Store in localStorage for the cart to pick up
      const existingAutoSyncItems = JSON.parse(localStorage.getItem('autosync-cart-items') || '[]');
      
      const existingIndex = existingAutoSyncItems.findIndex(
        (item: { partNumber: string }) => item.partNumber === product.partNumber
      );
      
      if (existingIndex >= 0) {
        existingAutoSyncItems[existingIndex].quantity += product.quantity;
      } else {
        existingAutoSyncItems.push(product);
      }
      
      localStorage.setItem('autosync-cart-items', JSON.stringify(existingAutoSyncItems));
      
      // Trigger a cart refresh event
      window.dispatchEvent(new CustomEvent('autosync-cart-updated'));
      
      return true;
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Tires & Wheels</h1>
          <p className="text-xl text-blue-100 max-w-2xl">
            Find the perfect tires and wheels for your vehicle. Visualize them on your car 
            and finance your purchase with LendPro - pay as low as $50/mo.
          </p>
          <div className="flex gap-4 mt-6">
            <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
              ✓ Free Mounting & Balancing
            </span>
            <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
              ✓ Financing Available
            </span>
            <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
              ✓ Price Match Guarantee
            </span>
          </div>
        </div>
      </div>

      {/* Financing Banner */}
      <div className="bg-yellow-50 border-b border-yellow-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <img src="/images/lendpro-icon.svg" alt="LendPro" className="w-10 h-10" />
              <div>
                <p className="font-semibold text-gray-900">Finance Your Tires & Wheels</p>
                <p className="text-sm text-gray-600">Pay over time with LendPro - No credit needed</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/checkout')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Apply for Financing
            </button>
          </div>
        </div>
      </div>

      {/* AutoSync Visualizer Container */}
      <div className="container mx-auto px-4 py-8">
        <div 
          id="autosync-visualizer" 
          ref={visualizerRef}
          className="min-h-[800px] bg-white rounded-2xl shadow-lg overflow-hidden"
        />
      </div>

      {/* Info Section */}
      <div className="bg-white border-t">
        <div className="container mx-auto px-4 py-12">
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


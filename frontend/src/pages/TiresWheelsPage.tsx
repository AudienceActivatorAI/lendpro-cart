import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function TiresWheelsPage() {
  const navigate = useNavigate();
  const scriptLoadedRef = useRef(false);
  const visualizerInitializedRef = useRef(false);

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

    new window.Autosync({
      id: 'autosync-visualizer',
      key: 'v3C4lXEncDytIJUmPnrC',
      adaptiveHeight: true,
      disableQuoteForm: true,
      homeStyle: 'lookup',
      productSegment: ['tires', 'wheels', 'vehicles'],
      scrollBar: false,
      startPage: null,
      widget: false,
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
    try {
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
      window.dispatchEvent(new CustomEvent('autosync-cart-updated'));
      
      return true;
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
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
              onClick={() => navigate('/checkout')}
              className="px-6 py-2.5 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 transition-colors"
            >
              Apply for Financing
            </button>
          </div>
        </div>
      </div>

      {/* AutoSync Visualizer Container */}
      <div 
        id="autosync-visualizer" 
        className="autosync-container"
      />

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

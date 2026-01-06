import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, ChevronLeft, Lock, X } from 'lucide-react';
import { useCartStore } from '@/stores/cart';
import { apiHelpers } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

type PaymentMethod = 'card' | 'financing' | null;

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, setShippingAddress, setBillingAddress } = useCartStore();
  const [showPaymentModal, setShowPaymentModal] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });

  const items = cart?.items || [];

  // Show modal on mount
  useEffect(() => {
    if (!paymentMethod) {
      setShowPaymentModal(true);
    }
  }, []);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-4">Your cart is empty</h1>
        <Link to="/products">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setShowPaymentModal(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cart) return;

    // Validate form
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error('Please fill in all contact information');
      return;
    }
    if (!formData.address1 || !formData.city || !formData.state || !formData.postalCode) {
      toast.error('Please fill in all shipping address fields');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Save addresses
      const address = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        address1: formData.address1,
        address2: formData.address2,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: formData.country,
        phone: formData.phone,
        email: formData.email,
      };

      await setShippingAddress(address);
      await setBillingAddress(address);

      if (paymentMethod === 'card') {
        // Card payment flow
        const intentResponse = await apiHelpers.createPaymentIntent(cart.id);
        const paymentIntentId = intentResponse.data.data.paymentIntent?.id || 'demo-intent';

        const orderResponse = await apiHelpers.createOrder({
          cartId: cart.id,
          paymentMethod: 'credit_card',
          paymentIntentId,
        });

        toast.success('Order placed successfully!');
        navigate(`/orders/${orderResponse.data.data.order?.id || 'demo'}/confirmation`);
      } else if (paymentMethod === 'financing') {
        // Financing flow - redirect to LendPro application
        toast.success('Redirecting to financing application...');
        // In production, this would open the LendPro financing modal/redirect
        setTimeout(() => {
          toast.info('Financing application submitted! You will receive a decision shortly.');
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Payment Method Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (paymentMethod) {
                setShowPaymentModal(false);
              } else {
                navigate('/cart');
              }
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-8">
            <button
              onClick={() => {
                if (paymentMethod) {
                  setShowPaymentModal(false);
                } else {
                  navigate('/cart');
                }
              }}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Select Payment Method</h2>
              <p className="text-gray-500 mt-2">Choose how you'd like to pay for your order</p>
            </div>

            <div className="space-y-4">
              {/* Pay Today Option */}
              <button
                onClick={() => handlePaymentMethodSelect('card')}
                className={cn(
                  'w-full p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg',
                  paymentMethod === 'card' 
                    ? 'border-blue-600 bg-blue-600 text-white' 
                    : 'border-gray-200 hover:border-blue-400 bg-white'
                )}
              >
                <div className={cn(
                  'text-lg font-semibold mb-4',
                  paymentMethod === 'card' ? 'text-white' : 'text-gray-900'
                )}>
                  Pay Today With
                </div>
                <div className="flex items-center justify-center gap-4">
                  <img src="/images/visa-logo.svg" alt="Visa" className="h-8" />
                  <img src="/images/mastercard-logo.svg" alt="Mastercard" className="h-8" />
                </div>
              </button>

              {/* Pay Later Option */}
              <button
                onClick={() => handlePaymentMethodSelect('financing')}
                className={cn(
                  'w-full p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg',
                  paymentMethod === 'financing' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-400 bg-white'
                )}
              >
                <div className="text-lg font-semibold mb-4 text-gray-900">
                  Pay Later, Regardless of Credit
                </div>
                <div className="flex items-center justify-center">
                  {/* LendPro Logo */}
                  <img 
                    src="/images/lendpro-logo.svg" 
                    alt="LendPro" 
                    className="h-10"
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/cart" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-4 h-4" />
            Back to cart
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Lock className="w-4 h-4 text-green-600" />
            <span>Secure Checkout</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handlePlaceOrder}>
              {/* Contact Information */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Contact Information</h2>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="(555) 555-5555"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Shipping Address</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                  <input
                    type="text"
                    name="address1"
                    value={formData.address1}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Display */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
                
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-3"
                >
                  {paymentMethod === 'card' && (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Pay with Credit/Debit Card</span>
                    </>
                  )}
                  {paymentMethod === 'financing' && (
                    <>
                      <img src="/images/lendpro-icon.svg" alt="" className="w-6 h-6" />
                      <span>Pay with LendPro Financing</span>
                    </>
                  )}
                  {!paymentMethod && <span>Select Payment Method</span>}
                </button>

                {paymentMethod && (
                  <p className="text-sm text-gray-500 text-center mt-3">
                    <button 
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Change payment method
                    </button>
                  </p>
                )}
              </div>

              {/* Place Order Button */}
              {paymentMethod && (
                <Button
                  type="submit"
                  size="lg"
                  className="w-full py-4 text-lg"
                  isLoading={isProcessing}
                  disabled={isProcessing}
                >
                  {paymentMethod === 'card' 
                    ? `Pay ${formatCurrency(cart?.total || 0)}`
                    : 'Apply for Financing'
                  }
                </Button>
              )}
            </form>
          </div>

          {/* Order Summary */}
          <div>
            <div className="sticky top-24 bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-lg text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-4 max-h-80 overflow-y-auto mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.product?.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(Number(item.totalPrice) + (item.warrantyPrice || 0))}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cart?.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (8%)</span>
                  <span>{formatCurrency(cart?.taxTotal || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{cart?.shippingTotal === 0 ? 'Free' : formatCurrency(cart?.shippingTotal || 0)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatCurrency(cart?.total || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;

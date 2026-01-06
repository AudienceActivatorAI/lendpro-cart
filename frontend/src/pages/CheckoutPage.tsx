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
            onClick={() => paymentMethod && setShowPaymentModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-8">
            <button
              onClick={() => paymentMethod && setShowPaymentModal(false)}
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
                  {/* Visa Logo */}
                  <svg className="h-8" viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="750" height="471" rx="40" fill="white"/>
                    <path d="M278.198 334.228L311.465 138.398H364.374L331.107 334.228H278.198Z" fill="#00579F"/>
                    <path d="M524.307 142.688C513.83 138.707 497.238 134.398 476.832 134.398C424.594 134.398 388.122 162.939 387.832 204.238C387.543 234.289 413.867 251.033 433.512 260.975C453.645 271.185 460.305 277.848 460.214 287.113C460.034 301.378 443.144 307.893 427.389 307.893C405.439 307.893 393.754 304.619 375.344 296.167L368.325 292.838L360.727 339.309C374.125 345.508 398.957 350.886 424.682 351.164C480.163 351.164 515.946 322.949 516.326 278.968C516.506 255.203 501.896 236.827 471.604 221.693C453.375 212.103 441.96 205.589 442.07 195.647C442.07 186.803 451.894 177.284 473.284 177.284C491.044 176.956 503.935 180.829 514.053 184.809L518.929 187.084L526.437 142.091L524.307 142.688Z" fill="#00579F"/>
                    <path d="M661.615 138.398H622.075C609.83 138.398 600.587 141.925 595.169 154.689L517.736 334.139H573.127L584.192 304.268L651.751 304.358C653.521 312.378 659.124 334.139 659.124 334.139H708.367L661.615 138.398ZM600.317 262.513C604.526 251.393 622.165 205.094 622.165 205.094C621.875 205.678 626.354 194.142 628.933 186.858L632.422 203.424C632.422 203.424 643.037 252.517 645.357 262.513H600.317Z" fill="#00579F"/>
                    <path d="M232.903 138.398L181.335 267.993L175.823 240.789C166.49 208.488 137.293 173.284 104.656 155.652L152.357 333.931H208.208L288.664 138.398H232.903Z" fill="#00579F"/>
                    <path d="M131.197 138.398H45.9893L45.1094 142.688C112.309 160.264 157.078 201.918 175.823 240.789L156.717 154.958C153.407 142.282 144.254 138.787 131.197 138.398Z" fill="#FAA61A"/>
                  </svg>
                  {/* Mastercard Logo */}
                  <svg className="h-8" viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="750" height="471" rx="40" fill="white"/>
                    <circle cx="299" cy="235" r="150" fill="#EB001B"/>
                    <circle cx="451" cy="235" r="150" fill="#F79E1B"/>
                    <path d="M375 116.227C345.165 139.863 324.5 174.227 315.5 213.5C306.5 252.773 310.5 294.727 326.5 332.227C342.5 294.727 346.5 252.773 337.5 213.5C328.5 174.227 307.835 139.863 278 116.227C297.728 98.5498 322.5 85.5 350 79.3135C377.5 85.5 402.272 98.5498 422 116.227C392.165 139.863 371.5 174.227 362.5 213.5C353.5 252.773 357.5 294.727 373.5 332.227C389.5 294.727 393.5 252.773 384.5 213.5C375.5 174.227 354.835 139.863 325 116.227" fill="#FF5F00"/>
                  </svg>
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

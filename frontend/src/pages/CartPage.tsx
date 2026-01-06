import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, CreditCard, Shield } from 'lucide-react';
import { useCartStore } from '@/stores/cart';
import { Button } from '@/components/ui/Button';
import { formatCurrency, getImageUrl, cn } from '@/lib/utils';

export function CartPage() {
  const { cart, updateItem, removeItem, isLoading } = useCartStore();
  const items = cart?.items || [];

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag className="w-20 h-20 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-2xl font-semibold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">
            Looks like you haven't added anything to your cart yet.
            Start shopping to find something you'll love!
          </p>
          <Link to="/products">
            <Button size="lg">
              Start Shopping
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-semibold mb-8">
        Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex gap-6 p-6 bg-card border rounded-xl',
                isLoading && 'opacity-50 pointer-events-none'
              )}
            >
              <Link to={`/products/${item.product?.slug}`} className="flex-shrink-0">
                <img
                  src={getImageUrl(item.product?.images)}
                  alt={item.product?.name}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <div>
                    <Link
                      to={`/products/${item.product?.slug}`}
                      className="font-medium hover:text-primary"
                    >
                      {item.product?.name}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(item.unitPrice)} each
                    </p>
                    {item.warranty && (
                      <p className="text-sm text-primary flex items-center gap-1 mt-2">
                        <Shield className="w-4 h-4" />
                        {item.warranty.name} (+{formatCurrency(item.warrantyPrice || 0)})
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {formatCurrency(Number(item.totalPrice) + (item.warrantyPrice || 0))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() => updateItem(item.id, Math.max(0, item.quantity - 1))}
                      className="p-2 hover:bg-muted transition-colors"
                      disabled={isLoading}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateItem(item.id, item.quantity + 1)}
                      className="p-2 hover:bg-muted transition-colors"
                      disabled={isLoading}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-card border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Order Summary</h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(cart?.subtotal || 0)}</span>
              </div>
              {Number(cart?.discountTotal || 0) > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount</span>
                  <span>-{formatCurrency(cart?.discountTotal || 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="pt-3 border-t flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatCurrency(cart?.total || 0)}</span>
              </div>
            </div>

            {/* Financing Badge */}
            {Number(cart?.total || 0) >= 50 && (
              <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <CreditCard className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Financing Available</p>
                  <p className="text-muted-foreground">
                    As low as {formatCurrency(Number(cart?.total || 0) / 4)}/mo
                  </p>
                </div>
              </div>
            )}

            <Link to="/checkout" className="block">
              <Button size="lg" className="w-full">
                Proceed to Checkout
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>

            <Link to="/products" className="block">
              <Button variant="ghost" className="w-full">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartPage;


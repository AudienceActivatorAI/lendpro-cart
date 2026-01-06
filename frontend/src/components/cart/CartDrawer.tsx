import { Link } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/stores/cart';
import { formatCurrency, getImageUrl, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function CartDrawer() {
  const { cart, isDrawerOpen, closeDrawer, updateItem, removeItem, isLoading } = useCartStore();

  const items = cart?.items || [];
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeItem(itemId);
    } else {
      await updateItem(itemId, newQuantity);
    }
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={closeDrawer}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5" />
                <h2 className="font-semibold text-lg">Your Cart</h2>
                <span className="text-sm text-muted-foreground">
                  ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </span>
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 hover:bg-muted rounded-full transition-colors"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-2">Your cart is empty</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Looks like you haven't added anything to your cart yet.
                  </p>
                  <Link
                    to="/products"
                    onClick={closeDrawer}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'flex space-x-4 p-4 bg-muted/30 rounded-lg',
                        isLoading && 'opacity-50 pointer-events-none'
                      )}
                    >
                      {/* Image */}
                      <Link
                        to={`/products/${item.product?.slug}`}
                        onClick={closeDrawer}
                        className="flex-shrink-0"
                      >
                        <img
                          src={getImageUrl(item.product?.images)}
                          alt={item.product?.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      </Link>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/products/${item.product?.slug}`}
                          onClick={closeDrawer}
                          className="font-medium hover:text-primary line-clamp-2"
                        >
                          {item.product?.name}
                        </Link>

                        {item.warranty && (
                          <p className="text-xs text-muted-foreground mt-1">
                            + {item.warranty.name} ({formatCurrency(item.warrantyPrice || 0)})
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              disabled={isLoading}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              disabled={isLoading}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {formatCurrency(Number(item.totalPrice) + (item.warrantyPrice || 0))}
                            </span>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                              disabled={isLoading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t p-4 space-y-4">
                <div className="space-y-2">
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
                  <div className="flex justify-between font-medium text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(cart?.total || 0)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Link
                    to="/checkout"
                    onClick={closeDrawer}
                    className="block w-full py-3 bg-primary text-primary-foreground text-center font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Checkout
                  </Link>
                  <Link
                    to="/cart"
                    onClick={closeDrawer}
                    className="block w-full py-3 border text-center font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    View Cart
                  </Link>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Financing available at checkout
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CartDrawer;


import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Package, Truck, CreditCard, ArrowRight } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const response = await apiHelpers.getOrder(id!);
      return response.data.data.order;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full mx-auto" />
          <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-4">Order not found</h1>
        <Link to="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    );
  }

  const shippingAddress = order.shippingAddress as { firstName: string; lastName: string; address1: string; city: string; state: string; postalCode: string };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h1 className="font-display text-3xl font-semibold mb-2">
            Thank You for Your Order!
          </h1>
          <p className="text-muted-foreground">
            Your order #{order.orderNumber} has been confirmed
          </p>
        </div>

        {/* Order Progress */}
        <div className="bg-card border rounded-xl p-6 mb-8">
          <div className="flex justify-between">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center mb-2">
                <CreditCard className="w-5 h-5 text-success-foreground" />
              </div>
              <span className="text-sm font-medium">Confirmed</span>
            </div>
            <div className="flex-1 flex items-center px-4">
              <div className="h-1 bg-muted flex-1 rounded-full">
                <div className="h-full w-1/3 bg-success rounded-full" />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mb-2">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Processing</span>
            </div>
            <div className="flex-1 flex items-center px-4">
              <div className="h-1 bg-muted flex-1 rounded-full" />
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mb-2">
                <Truck className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Shipped</span>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-semibold mb-4">Order Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Number</span>
                <span className="font-medium">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="capitalize">{order.paymentMethod.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize text-success">{order.status.toLowerCase()}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-semibold mb-4">Shipping Address</h3>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {shippingAddress.firstName} {shippingAddress.lastName}
              </p>
              <p>{shippingAddress.address1}</p>
              <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-card border rounded-xl p-6 mb-8">
          <h3 className="font-semibold mb-4">Order Items</h3>
          <div className="space-y-4">
            {order.items?.map((item: { id: string; productImage?: string; productName: string; quantity: number; totalPrice: number; warrantyPrice?: number }) => (
              <div key={item.id} className="flex gap-4">
                <img
                  src={item.productImage || '/placeholder-product.jpg'}
                  alt={item.productName}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium">
                  {formatCurrency(Number(item.totalPrice) + (item.warrantyPrice || 0))}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatCurrency(order.shippingTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(order.taxTotal)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/account/orders">
            <Button variant="outline" size="lg">
              View All Orders
            </Button>
          </Link>
          <Link to="/products">
            <Button size="lg">
              Continue Shopping
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OrderConfirmationPage;


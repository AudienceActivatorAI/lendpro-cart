import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { apiHelpers } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

export function OrdersPage() {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await apiHelpers.getOrders({ pageSize: 50 });
      return response.data.data;
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const orders = data?.orders || [];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'bg-success/10 text-success';
      case 'processing':
      case 'shipped':
        return 'bg-primary/10 text-primary';
      case 'cancelled':
      case 'refunded':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl font-semibold mb-8">My Orders</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">
              When you place an order, it will appear here
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: {
              id: string;
              orderNumber: string;
              createdAt: string;
              status: string;
              paymentStatus: string;
              total: number;
              items: Array<{
                id: string;
                productImage?: string;
                productName: string;
                quantity: number;
              }>;
            }) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}/confirmation`}
                className="block bg-card border rounded-xl p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold">Order #{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium capitalize',
                        getStatusColor(order.status)
                      )}
                    >
                      {order.status.toLowerCase()}
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {order.items?.slice(0, 3).map((item) => (
                      <img
                        key={item.id}
                        src={item.productImage || '/placeholder-product.jpg'}
                        alt={item.productName}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-background"
                      />
                    ))}
                    {order.items?.length > 3 && (
                      <div className="w-12 h-12 rounded-lg bg-muted border-2 border-background flex items-center justify-center text-sm font-medium">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {order.items?.length} {order.items?.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(order.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrdersPage;


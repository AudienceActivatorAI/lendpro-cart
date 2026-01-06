import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, Package, MapPin, CreditCard, Shield, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { apiHelpers } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

export function AccountPage() {
  const { isAuthenticated, user, logout } = useAuthStore();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await apiHelpers.getProfile();
      return response.data.data.user;
    },
    enabled: isAuthenticated,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: async () => {
      const response = await apiHelpers.getOrders({ pageSize: 3 });
      return response.data.data.orders;
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl font-semibold mb-8">My Account</h1>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="space-y-2">
            <Link
              to="/account"
              className="flex items-center gap-3 px-4 py-3 bg-muted rounded-lg font-medium"
            >
              <User className="w-5 h-5" />
              Profile
            </Link>
            <Link
              to="/account/orders"
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg"
            >
              <Package className="w-5 h-5" />
              Orders
            </Link>
            <Link
              to="#"
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg"
            >
              <MapPin className="w-5 h-5" />
              Addresses
            </Link>
            <Link
              to="#"
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg"
            >
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </Link>
            <Link
              to="#"
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg"
            >
              <Shield className="w-5 h-5" />
              Warranties
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-lg w-full text-left text-destructive"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4">Profile Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">First Name</label>
                    <p className="font-medium">{profile?.firstName || user?.firstName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Last Name</label>
                    <p className="font-medium">{profile?.lastName || user?.lastName}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="font-medium">{profile?.email || user?.email}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Member Since</label>
                  <p className="font-medium">
                    {profile?.createdAt ? formatDate(profile.createdAt) : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t">
                <Button variant="outline">Edit Profile</Button>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-card border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Recent Orders</h2>
                <Link to="/account/orders" className="text-sm text-primary hover:underline">
                  View All
                </Link>
              </div>
              {recentOrders && recentOrders.length > 0 ? (
                <div className="space-y-4">
                  {recentOrders.map((order: { id: string; orderNumber: string; createdAt: string; status: string; total: number }) => (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}/confirmation`}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">Order #{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${Number(order.total).toFixed(2)}</p>
                        <p className="text-sm capitalize text-muted-foreground">
                          {order.status.toLowerCase()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No orders yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountPage;


import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

interface DashboardData {
  dashboard: {
    orders: {
      total: number;
      today: number;
      thisMonth: number;
      lastMonth: number;
      pending: number;
      growth: string;
    };
    revenue: {
      thisMonth: number;
      lastMonth: number;
      growth: string;
    };
    products: {
      total: number;
      lowStock: number;
    };
    users: {
      total: number;
      newThisMonth: number;
    };
    financing: {
      applicationsThisMonth: number;
      approvedThisMonth: number;
      approvalRate: string;
    };
    recentOrders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      total: number;
      createdAt: string;
      user?: {
        firstName: string;
        lastName: string;
        email: string;
      };
      _count: { items: number };
    }>;
  };
}

export function AdminDashboard() {
  const { user, isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard');
      return response.data.data;
    },
    enabled: isAuthenticated && user?.role === 'ADMIN',
  });

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  const stats = data?.dashboard;

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    trend,
  }: {
    title: string;
    value: string | number;
    change?: string;
    icon: typeof DollarSign;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change && (
            <p
              className={cn(
                'text-sm mt-1 flex items-center gap-1',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}
            >
              {trend === 'up' && <TrendingUp className="w-4 h-4" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4" />}
              {change}
            </p>
          )}
        </div>
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.firstName}!</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Revenue This Month"
              value={formatCurrency(stats?.revenue.thisMonth || 0)}
              change={`${stats?.revenue.growth}% from last month`}
              icon={DollarSign}
              trend={Number(stats?.revenue.growth || 0) >= 0 ? 'up' : 'down'}
            />
            <StatCard
              title="Orders This Month"
              value={stats?.orders.thisMonth || 0}
              change={`${stats?.orders.growth}% from last month`}
              icon={ShoppingCart}
              trend={Number(stats?.orders.growth || 0) >= 0 ? 'up' : 'down'}
            />
            <StatCard
              title="Total Customers"
              value={stats?.users.total || 0}
              change={`+${stats?.users.newThisMonth} this month`}
              icon={Users}
              trend="up"
            />
            <StatCard
              title="Active Products"
              value={stats?.products.total || 0}
              change={stats?.products.lowStock ? `${stats.products.lowStock} low stock` : undefined}
              icon={Package}
              trend={stats?.products.lowStock ? 'down' : 'neutral'}
            />
          </div>

          {/* Financing Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-card border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Financing This Month</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applications</span>
                  <span className="font-medium">{stats?.financing.applicationsThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved</span>
                  <span className="font-medium text-success">{stats?.financing.approvedThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approval Rate</span>
                  <span className="font-medium">{stats?.financing.approvalRate}%</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-card border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Quick Stats</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{stats?.orders.today}</p>
                  <p className="text-sm text-muted-foreground">Orders Today</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{stats?.orders.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{stats?.products.lowStock}</p>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{stats?.users.newThisMonth}</p>
                  <p className="text-sm text-muted-foreground">New Users</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Recent Orders</h3>
                <Link to="/admin/orders" className="text-sm text-primary hover:underline flex items-center gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {stats?.recentOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">#{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{order.status.toLowerCase()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Inventory Alerts</h3>
                <Link to="/admin/inventory" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Manage <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {stats?.products.lowStock ? (
                <div className="flex items-center gap-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <AlertTriangle className="w-8 h-8 text-warning" />
                  <div>
                    <p className="font-medium">{stats.products.lowStock} products low on stock</p>
                    <p className="text-sm text-muted-foreground">
                      Review and reorder to avoid stockouts
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>All products are well-stocked!</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;


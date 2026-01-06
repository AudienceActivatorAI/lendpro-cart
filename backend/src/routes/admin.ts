import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// Dashboard stats
router.get('/dashboard', async (_req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      // Orders
      totalOrders,
      ordersToday,
      ordersThisMonth,
      ordersLastMonth,
      pendingOrders,
      
      // Revenue
      revenueThisMonth,
      revenueLastMonth,
      
      // Products
      totalProducts,
      lowStockProducts,
      
      // Users
      totalUsers,
      newUsersThisMonth,
      
      // Financing
      financingApplications,
      approvedApplications,
      
      // Recent orders
      recentOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({ 
        where: { 
          createdAt: { gte: startOfLastMonth, lt: startOfMonth } 
        } 
      }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      
      prisma.order.aggregate({
        where: { createdAt: { gte: startOfMonth }, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { 
          createdAt: { gte: startOfLastMonth, lt: startOfMonth },
          paymentStatus: 'PAID'
        },
        _sum: { total: true },
      }),
      
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ 
        where: { 
          isActive: true,
          trackInventory: true,
          stock: { lte: prisma.product.fields.lowStockThreshold }
        }
      }),
      
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      
      prisma.financingApplication.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.financingApplication.count({ 
        where: { 
          createdAt: { gte: startOfMonth },
          status: 'APPROVED'
        }
      }),
      
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          _count: { select: { items: true } },
        },
      }),
    ]);

    const currentMonthRevenue = Number(revenueThisMonth._sum.total) || 0;
    const lastMonthRevenue = Number(revenueLastMonth._sum.total) || 0;
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(2)
      : 0;

    const orderGrowth = ordersLastMonth > 0
      ? ((ordersThisMonth - ordersLastMonth) / ordersLastMonth * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        dashboard: {
          orders: {
            total: totalOrders,
            today: ordersToday,
            thisMonth: ordersThisMonth,
            lastMonth: ordersLastMonth,
            pending: pendingOrders,
            growth: orderGrowth,
          },
          revenue: {
            thisMonth: currentMonthRevenue,
            lastMonth: lastMonthRevenue,
            growth: revenueGrowth,
          },
          products: {
            total: totalProducts,
            lowStock: lowStockProducts,
          },
          users: {
            total: totalUsers,
            newThisMonth: newUsersThisMonth,
          },
          financing: {
            applicationsThisMonth: financingApplications,
            approvedThisMonth: approvedApplications,
            approvalRate: financingApplications > 0 
              ? (approvedApplications / financingApplications * 100).toFixed(2)
              : 0,
          },
          recentOrders,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Inventory alerts
router.get('/inventory/alerts', async (_req, res, next) => {
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        trackInventory: true,
        stock: { lte: 10 }, // Default threshold
      },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        stock: true,
        lowStockThreshold: true,
        images: true,
      },
      orderBy: { stock: 'asc' },
      take: 20,
    });

    const outOfStock = lowStockProducts.filter(p => p.stock === 0);
    const critical = lowStockProducts.filter(p => p.stock > 0 && p.stock <= 5);
    const warning = lowStockProducts.filter(p => p.stock > 5);

    res.json({
      success: true,
      data: {
        alerts: {
          outOfStock,
          critical,
          warning,
          totalAlerts: lowStockProducts.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update inventory
router.put('/inventory/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { stock, lowStockThreshold } = req.body;

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(stock !== undefined && { stock }),
        ...(lowStockThreshold !== undefined && { lowStockThreshold }),
      },
    });

    res.json({ success: true, data: { product } });
  } catch (error) {
    next(error);
  }
});

// Sales report
router.get('/reports/sales', async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        paymentStatus: 'PAID',
      },
      select: {
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const salesByDate: Record<string, { date: string; orders: number; revenue: number }> = {};
    
    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = { date: dateKey, orders: 0, revenue: 0 };
      }
      salesByDate[dateKey].orders++;
      salesByDate[dateKey].revenue += Number(order.total);
    }

    const salesData = Object.values(salesByDate);
    const totalRevenue = salesData.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = salesData.reduce((sum, d) => sum + d.orders, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      success: true,
      data: {
        report: {
          period: `Last ${days} days`,
          startDate,
          endDate: new Date(),
          totalRevenue,
          totalOrders,
          averageOrderValue,
          dailySales: salesData,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Top products report
router.get('/reports/top-products', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 10;

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPrice: true },
      _count: true,
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    // Get product details
    const productIds = topProducts.map(p => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, slug: true, images: true, price: true },
    });

    const enrichedProducts = topProducts.map(tp => {
      const product = products.find(p => p.id === tp.productId);
      return {
        product,
        unitsSold: tp._sum.quantity,
        revenue: tp._sum.totalPrice,
        orders: tp._count,
      };
    });

    res.json({
      success: true,
      data: { topProducts: enrichedProducts },
    });
  } catch (error) {
    next(error);
  }
});

// System settings
router.get('/settings', async (_req, res, next) => {
  try {
    // Get various configuration settings
    const [
      financingPlatforms,
      warrantyProviders,
      shippingMethods,
      taxRates,
    ] = await Promise.all([
      prisma.financingPlatform.findMany({
        select: { id: true, name: true, slug: true, enabled: true, priority: true },
        orderBy: { priority: 'asc' },
      }),
      prisma.warrantyProvider.findMany({
        select: { id: true, name: true, slug: true, enabled: true, priority: true },
        orderBy: { priority: 'asc' },
      }),
      prisma.shippingMethod.findMany({
        orderBy: { price: 'asc' },
      }),
      prisma.taxRate.count(),
    ]);

    res.json({
      success: true,
      data: {
        settings: {
          financingPlatforms,
          warrantyProviders,
          shippingMethods,
          taxRatesCount: taxRates,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;


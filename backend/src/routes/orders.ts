import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, requireAuth, requireAdmin } from '../middleware/auth.js';
import { NotFoundError, AppError } from '../middleware/error-handler.js';
import { nanoid } from 'nanoid';

const router = Router();

// Validation schemas
const orderQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED']).optional(),
  sortBy: z.enum(['createdAt', 'total', 'orderNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const orderIdSchema = z.object({
  id: z.string().uuid(),
});

const createOrderSchema = z.object({
  cartId: z.string().uuid(),
  paymentMethod: z.enum(['credit_card', 'debit_card', 'apple_pay', 'google_pay', 'ach', 'financing']),
  paymentIntentId: z.string().optional(),
  financingApprovalId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED']),
  notes: z.string().optional(),
});

const updateFulfillmentSchema = z.object({
  status: z.enum(['UNFULFILLED', 'PARTIAL', 'FULFILLED', 'RETURNED']),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
});

// Generate order number
const generateOrderNumber = (): string => {
  const prefix = 'LP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(4).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Get user orders
router.get('/', authenticate, requireAuth, validateQuery(orderQuerySchema), async (req, res, next) => {
  try {
    const { page, pageSize, status, sortBy, sortOrder } = req.query as z.infer<typeof orderQuerySchema>;

    const where: Record<string, unknown> = { userId: req.user!.id };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, slug: true, images: true },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single order
router.get('/:id', authenticate, requireAuth, validateParams(orderIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        ...(req.user!.role !== 'ADMIN' && { userId: req.user!.id }),
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, images: true },
            },
            warrantyContract: true,
          },
        },
        transactions: true,
        financingApproval: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    res.json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
});

// Create order from cart
router.post('/', authenticate, validateBody(createOrderSchema), async (req, res, next) => {
  try {
    const { cartId, paymentMethod, paymentIntentId, financingApprovalId, notes } = req.body;
    const sessionId = req.sessionId || req.headers['x-session-id'] as string;

    // Get cart
    const cart = await prisma.cart.findFirst({
      where: req.user ? { id: cartId, userId: req.user.id } : { id: cartId, sessionId },
      include: {
        items: {
          include: {
            product: true,
            warranty: true,
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundError('Cart');
    }

    if (cart.items.length === 0) {
      throw new AppError('Cart is empty', 400, 'CART_EMPTY');
    }

    if (!cart.shippingAddress || !cart.billingAddress) {
      throw new AppError('Shipping and billing addresses required', 400, 'ADDRESS_REQUIRED');
    }

    // Validate financing approval if payment method is financing
    let financingApproval = null;
    if (paymentMethod === 'financing') {
      if (!financingApprovalId) {
        throw new AppError('Financing approval required', 400, 'FINANCING_REQUIRED');
      }
      
      financingApproval = await prisma.financingApproval.findUnique({
        where: { id: financingApprovalId },
      });

      if (!financingApproval || financingApproval.status !== 'active') {
        throw new AppError('Invalid or expired financing approval', 400, 'FINANCING_INVALID');
      }

      if (Number(financingApproval.approvedAmount) < Number(cart.total)) {
        throw new AppError('Financing amount insufficient', 400, 'FINANCING_INSUFFICIENT');
      }
    }

    // Check stock for all items
    for (const item of cart.items) {
      if (item.product.trackInventory && item.product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for ${item.product.name}`, 400, 'INSUFFICIENT_STOCK');
      }
    }

    // Create order
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: req.user?.id,
          email: (cart.billingAddress as { email: string }).email,
          subtotal: cart.subtotal,
          discountTotal: cart.discountTotal,
          taxTotal: cart.taxTotal,
          shippingTotal: cart.shippingTotal,
          total: cart.total,
          paymentMethod,
          financingPlatformId: financingApproval?.platformId,
          financingApprovalId: financingApproval?.id,
          shippingAddress: cart.shippingAddress!,
          billingAddress: cart.billingAddress!,
          shippingMethod: cart.shippingMethodId || 'standard',
          notes,
        },
      });

      // Create order items
      for (const item of cart.items) {
        // Create warranty contract if warranty selected
        let warrantyContract = null;
        if (item.warranty) {
          warrantyContract = await tx.warrantyContract.create({
            data: {
              planId: item.warranty.id,
              providerId: item.warranty.providerId,
              orderId: newOrder.id,
              orderItemId: '', // Will update after order item created
              userId: req.user?.id,
              productId: item.productId,
              productName: item.product.name,
              productPrice: item.unitPrice,
              warrantyPrice: item.warranty.price,
              startDate: new Date(),
              endDate: new Date(Date.now() + item.warranty.durationMonths * 30 * 24 * 60 * 60 * 1000),
            },
          });
        }

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            productName: item.product.name,
            productSku: item.product.sku,
            productImage: (item.product.images as { url: string }[])?.[0]?.url,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            warrantyId: item.warrantyId,
            warrantyContractId: warrantyContract?.id,
            warrantyPrice: item.warrantyPrice,
            isUpsell: item.isUpsell,
            attributes: item.attributes,
          },
        });

        // Update warranty contract with order item ID
        if (warrantyContract) {
          await tx.warrantyContract.update({
            where: { id: warrantyContract.id },
            data: { orderItemId: orderItem.id },
          });
        }

        // Update stock
        if (item.product.trackInventory) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      // Update financing approval if used
      if (financingApproval) {
        await tx.financingApproval.update({
          where: { id: financingApproval.id },
          data: {
            status: 'used',
            usedAmount: cart.total,
          },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          subtotal: 0,
          discountTotal: 0,
          taxTotal: 0,
          shippingTotal: 0,
          total: 0,
          shippingAddress: null,
          billingAddress: null,
          shippingMethodId: null,
        },
      });

      return newOrder;
    });

    // Get full order with items
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, images: true },
            },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { order: fullOrder },
    });
  } catch (error) {
    next(error);
  }
});

// Update order status (admin only)
router.put('/:id/status', authenticate, requireAdmin, validateParams(orderIdSchema), validateBody(updateOrderStatusSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundError('Order');
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        internalNotes: notes ? `${order.internalNotes || ''}\n[${new Date().toISOString()}] Status changed to ${status}: ${notes}` : order.internalNotes,
        ...(status === 'CANCELLED' && {
          cancelledAt: new Date(),
          cancelReason: notes,
        }),
        ...(status === 'COMPLETED' && {
          completedAt: new Date(),
        }),
      },
      include: {
        items: true,
      },
    });

    res.json({ success: true, data: { order: updatedOrder } });
  } catch (error) {
    next(error);
  }
});

// Update fulfillment status (admin only)
router.put('/:id/fulfillment', authenticate, requireAdmin, validateParams(orderIdSchema), validateBody(updateFulfillmentSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, trackingUrl } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundError('Order');
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        fulfillmentStatus: status,
        trackingNumber,
        trackingUrl,
        ...(status === 'FULFILLED' && order.status === 'PROCESSING' && {
          status: 'SHIPPED',
        }),
      },
    });

    res.json({ success: true, data: { order: updatedOrder } });
  } catch (error) {
    next(error);
  }
});

// Cancel order
router.post('/:id/cancel', authenticate, requireAuth, validateParams(orderIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await prisma.order.findFirst({
      where: {
        id,
        ...(req.user!.role !== 'ADMIN' && { userId: req.user!.id }),
      },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // Check if order can be cancelled
    if (['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
      throw new AppError('Order cannot be cancelled', 400, 'ORDER_CANNOT_BE_CANCELLED');
    }

    // Cancel order and restore stock
    await prisma.$transaction(async (tx) => {
      // Restore stock
      for (const item of order.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product?.trackInventory) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // Update order
      await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason || 'Cancelled by user',
        },
      });
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    res.json({ success: true, data: { order: updatedOrder } });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all orders
router.get('/admin/all', authenticate, requireAdmin, validateQuery(orderQuerySchema), async (req, res, next) => {
  try {
    const { page, pageSize, status, sortBy, sortOrder } = req.query as z.infer<typeof orderQuerySchema>;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          items: {
            take: 3,
            include: {
              product: {
                select: { id: true, name: true, images: true },
              },
            },
          },
          _count: { select: { items: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;


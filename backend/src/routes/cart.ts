import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { NotFoundError, AppError } from '../middleware/error-handler.js';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router();

// Validation schemas
const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  warrantyId: z.string().uuid().optional(),
  attributes: z.record(z.string()).optional(),
  isUpsell: z.boolean().default(false),
  upsellSource: z.enum(['manual', 'category', 'ml']).optional(),
});

const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  warrantyId: z.string().uuid().nullable().optional(),
});

const setAddressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional(),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().default('US'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

// Helper to get or create cart
const getOrCreateCart = async (userId: string | undefined, sessionId: string) => {
  let cart = await prisma.cart.findFirst({
    where: userId ? { userId } : { sessionId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              images: true,
              stock: true,
              isActive: true,
            },
          },
          warranty: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                images: true,
                stock: true,
                isActive: true,
              },
            },
            warranty: true,
          },
        },
      },
    });
  }

  return cart;
};

// Helper to recalculate cart totals
const recalculateCart = async (cartId: string) => {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: { product: true, warranty: true },
  });

  let subtotal = new Decimal(0);
  for (const item of items) {
    subtotal = subtotal.add(item.totalPrice);
    if (item.warrantyPrice) {
      subtotal = subtotal.add(item.warrantyPrice);
    }
  }

  // TODO: Calculate tax and shipping based on address
  const taxTotal = new Decimal(0);
  const shippingTotal = new Decimal(0);
  const discountTotal = new Decimal(0);
  const total = subtotal.add(taxTotal).add(shippingTotal).sub(discountTotal);

  await prisma.cart.update({
    where: { id: cartId },
    data: {
      subtotal,
      taxTotal,
      shippingTotal,
      discountTotal,
      total,
    },
  });
};

// Get current cart
router.get('/', authenticate, async (req, res, next) => {
  try {
    const sessionId = req.sessionId || req.headers['x-session-id'] as string;
    if (!sessionId && !req.user) {
      return res.json({
        success: true,
        data: { cart: null, message: 'No session ID provided' },
      });
    }

    const cart = await getOrCreateCart(req.user?.id, sessionId);

    // Filter out inactive products
    const activeItems = cart.items.filter(item => item.product.isActive);

    res.json({
      success: true,
      data: {
        cart: {
          ...cart,
          items: activeItems,
          itemCount: activeItems.reduce((sum, item) => sum + item.quantity, 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Add item to cart
router.post('/items', authenticate, validateBody(addToCartSchema), async (req, res, next) => {
  try {
    const sessionId = req.sessionId || req.headers['x-session-id'] as string;
    if (!sessionId && !req.user) {
      throw new AppError('Session ID required', 400, 'SESSION_REQUIRED');
    }

    const { productId, quantity, warrantyId, attributes, isUpsell, upsellSource } = req.body;

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundError('Product');
    }

    // Check stock
    if (product.trackInventory && product.stock < quantity) {
      throw new AppError('Insufficient stock', 400, 'INSUFFICIENT_STOCK');
    }

    // Get warranty if provided
    let warranty = null;
    if (warrantyId) {
      warranty = await prisma.warrantyPlan.findUnique({
        where: { id: warrantyId },
      });
      if (!warranty || !warranty.isActive) {
        throw new NotFoundError('Warranty plan');
      }
    }

    // Get or create cart
    const cart = await getOrCreateCart(req.user?.id, sessionId);

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        attributes: attributes || undefined,
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      
      if (product.trackInventory && product.stock < newQuantity) {
        throw new AppError('Insufficient stock', 400, 'INSUFFICIENT_STOCK');
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          totalPrice: product.price.mul(newQuantity),
          warrantyId: warrantyId || existingItem.warrantyId,
          warrantyPrice: warranty ? warranty.price : existingItem.warrantyPrice,
        },
      });
    } else {
      // Create new item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          unitPrice: product.price,
          totalPrice: product.price.mul(quantity),
          warrantyId,
          warrantyPrice: warranty?.price,
          isUpsell,
          upsellSource,
          attributes,
        },
      });
    }

    // Recalculate totals
    await recalculateCart(cart.id);

    // Get updated cart
    const updatedCart = await getOrCreateCart(req.user?.id, sessionId);

    res.json({
      success: true,
      data: { cart: updatedCart },
    });
  } catch (error) {
    next(error);
  }
});

// Update cart item
router.put('/items/:itemId', authenticate, validateBody(updateCartItemSchema), async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity, warrantyId } = req.body;
    const sessionId = req.sessionId || req.headers['x-session-id'] as string;

    // Get cart item
    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true, product: true },
    });

    if (!item) {
      throw new NotFoundError('Cart item');
    }

    // Verify ownership
    if (req.user) {
      if (item.cart.userId !== req.user.id) {
        throw new NotFoundError('Cart item');
      }
    } else if (item.cart.sessionId !== sessionId) {
      throw new NotFoundError('Cart item');
    }

    // If quantity is 0, delete item
    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
    } else if (quantity !== undefined) {
      // Check stock
      if (item.product.trackInventory && item.product.stock < quantity) {
        throw new AppError('Insufficient stock', 400, 'INSUFFICIENT_STOCK');
      }

      // Get warranty if provided
      let warranty = null;
      if (warrantyId !== undefined) {
        if (warrantyId === null) {
          warranty = null;
        } else {
          warranty = await prisma.warrantyPlan.findUnique({
            where: { id: warrantyId },
          });
        }
      }

      await prisma.cartItem.update({
        where: { id: itemId },
        data: {
          quantity,
          totalPrice: item.unitPrice.mul(quantity),
          ...(warrantyId !== undefined && {
            warrantyId: warrantyId,
            warrantyPrice: warranty?.price || null,
          }),
        },
      });
    }

    // Recalculate totals
    await recalculateCart(item.cartId);

    // Get updated cart
    const updatedCart = await getOrCreateCart(req.user?.id, sessionId);

    res.json({
      success: true,
      data: { cart: updatedCart },
    });
  } catch (error) {
    next(error);
  }
});

// Remove item from cart
router.delete('/items/:itemId', authenticate, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const sessionId = req.sessionId || req.headers['x-session-id'] as string;

    // Get cart item
    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item) {
      throw new NotFoundError('Cart item');
    }

    // Verify ownership
    if (req.user) {
      if (item.cart.userId !== req.user.id) {
        throw new NotFoundError('Cart item');
      }
    } else if (item.cart.sessionId !== sessionId) {
      throw new NotFoundError('Cart item');
    }

    await prisma.cartItem.delete({ where: { id: itemId } });

    // Recalculate totals
    await recalculateCart(item.cartId);

    // Get updated cart
    const updatedCart = await getOrCreateCart(req.user?.id, sessionId);

    res.json({
      success: true,
      data: { cart: updatedCart },
    });
  } catch (error) {
    next(error);
  }
});

// Clear cart
router.delete('/', authenticate, async (req, res, next) => {
  try {
    const sessionId = req.sessionId || req.headers['x-session-id'] as string;

    const cart = await prisma.cart.findFirst({
      where: req.user ? { userId: req.user.id } : { sessionId },
    });

    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await recalculateCart(cart.id);
    }

    res.json({
      success: true,
      data: { message: 'Cart cleared' },
    });
  } catch (error) {
    next(error);
  }
});

// Set shipping address
router.put('/shipping-address', authenticate, validateBody(setAddressSchema), async (req, res, next) => {
  try {
    const sessionId = req.sessionId || req.headers['x-session-id'] as string;
    const cart = await getOrCreateCart(req.user?.id, sessionId);

    await prisma.cart.update({
      where: { id: cart.id },
      data: { shippingAddress: req.body },
    });

    // Recalculate with shipping
    await recalculateCart(cart.id);

    const updatedCart = await getOrCreateCart(req.user?.id, sessionId);

    res.json({
      success: true,
      data: { cart: updatedCart },
    });
  } catch (error) {
    next(error);
  }
});

// Set billing address
router.put('/billing-address', authenticate, validateBody(setAddressSchema), async (req, res, next) => {
  try {
    const sessionId = req.sessionId || req.headers['x-session-id'] as string;
    const cart = await getOrCreateCart(req.user?.id, sessionId);

    await prisma.cart.update({
      where: { id: cart.id },
      data: { billingAddress: req.body },
    });

    const updatedCart = await getOrCreateCart(req.user?.id, sessionId);

    res.json({
      success: true,
      data: { cart: updatedCart },
    });
  } catch (error) {
    next(error);
  }
});

// Merge guest cart to user cart
router.post('/merge', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const sessionId = req.sessionId || req.headers['x-session-id'] as string;
    if (!sessionId) {
      return res.json({
        success: true,
        data: { message: 'No guest cart to merge' },
      });
    }

    // Get guest cart
    const guestCart = await prisma.cart.findFirst({
      where: { sessionId, userId: null },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return res.json({
        success: true,
        data: { message: 'No guest cart items to merge' },
      });
    }

    // Get or create user cart
    let userCart = await prisma.cart.findFirst({
      where: { userId: req.user.id },
    });

    if (!userCart) {
      userCart = await prisma.cart.create({
        data: {
          userId: req.user.id,
          sessionId: `user-${req.user.id}`,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Merge items
    for (const item of guestCart.items) {
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: userCart.id,
          productId: item.productId,
          attributes: item.attributes || undefined,
        },
      });

      if (existingItem) {
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + item.quantity,
            totalPrice: existingItem.unitPrice.mul(existingItem.quantity + item.quantity),
          },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            warrantyId: item.warrantyId,
            warrantyPrice: item.warrantyPrice,
            isUpsell: item.isUpsell,
            upsellSource: item.upsellSource,
            attributes: item.attributes,
          },
        });
      }
    }

    // Delete guest cart
    await prisma.cart.delete({ where: { id: guestCart.id } });

    // Recalculate user cart
    await recalculateCart(userCart.id);

    // Get updated cart
    const updatedCart = await getOrCreateCart(req.user.id, `user-${req.user.id}`);

    res.json({
      success: true,
      data: { cart: updatedCart },
    });
  } catch (error) {
    next(error);
  }
});

export default router;


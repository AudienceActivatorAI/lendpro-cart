import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { cache } from '../lib/redis.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { NotFoundError } from '../middleware/error-handler.js';

const router = Router();

// Validation schemas
const productIdSchema = z.object({
  productId: z.string().uuid(),
});

const getUpsellsQuerySchema = z.object({
  location: z.enum(['product_page', 'cart_page', 'cart_drawer', 'checkout', 'post_purchase']).default('product_page'),
  limit: z.coerce.number().min(1).max(20).default(8),
  includeWarranties: z.coerce.boolean().default(true),
});

const trackInteractionSchema = z.object({
  productId: z.string().uuid(),
  suggestedProductId: z.string().uuid(),
  source: z.enum(['manual', 'category', 'ml']),
  action: z.enum(['view', 'click', 'add_to_cart', 'purchase']),
  location: z.enum(['product_page', 'cart_page', 'cart_drawer', 'checkout', 'post_purchase']),
});

const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  ruleType: z.enum(['bundle', 'accessory', 'upgrade', 'warranty', 'cross_sell']),
  config: z.object({
    displayText: z.string().optional(),
    displayLocation: z.array(z.enum(['product_page', 'cart_page', 'cart_drawer', 'checkout', 'post_purchase'])),
    maxSuggestions: z.number().min(1).max(20).default(4),
    bundleDiscount: z.number().min(0).max(100).optional(),
    bundleDiscountType: z.enum(['percentage', 'fixed']).optional(),
    requireAll: z.boolean().optional(),
    showPriceComparison: z.boolean().optional(),
  }),
  suggestedProducts: z.array(z.object({
    productId: z.string().uuid(),
    sortOrder: z.number().default(0),
    customPrice: z.number().optional(),
    customText: z.string().optional(),
  })),
  warranty: z.object({
    enabled: z.boolean(),
    providers: z.array(z.string()),
    displayText: z.string().optional(),
  }).optional(),
  priority: z.number().default(0),
  isActive: z.boolean().default(true),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  conditions: z.array(z.object({
    type: z.enum(['min_cart_value', 'min_quantity', 'has_product', 'has_category', 'customer_tag']),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains']),
    value: z.union([z.string(), z.number()]),
  })).optional(),
});

// Get upsells for a product
router.get('/product/:productId', validateParams(productIdSchema), validateQuery(getUpsellsQuerySchema), async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { location, limit, includeWarranties } = req.query as z.infer<typeof getUpsellsQuerySchema>;

    // Try cache first
    const cacheKey = `upsells:${productId}:${location}:${limit}`;
    const cached = await cache.get<typeof upsellGroups>(cacheKey);
    if (cached) {
      return res.json({ success: true, data: { groups: cached } });
    }

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    const upsellGroups: Array<{
      type: string;
      priority: number;
      displayText?: string;
      items: Array<{
        product: typeof product;
        reason: string;
        score: number;
        bundleDiscount?: number;
      }>;
    }> = [];

    // 1. Manual rules (highest priority)
    const manualRules = await prisma.upsellRule.findMany({
      where: {
        isActive: true,
        OR: [
          { productId },
          { categoryId: product.categoryId },
        ],
        config: {
          path: ['displayLocation'],
          array_contains: location,
        },
      },
      orderBy: { priority: 'asc' },
    });

    for (const rule of manualRules) {
      const suggestedProducts = rule.suggestedProducts as Array<{
        productId: string;
        sortOrder: number;
        customPrice?: number;
        customText?: string;
      }>;

      const products = await prisma.product.findMany({
        where: {
          id: { in: suggestedProducts.map(sp => sp.productId) },
          isActive: true,
        },
        include: { category: true },
      });

      const config = rule.config as { displayText?: string; bundleDiscount?: number };

      if (products.length > 0) {
        upsellGroups.push({
          type: 'manual',
          priority: rule.priority,
          displayText: config.displayText || 'Complete your purchase',
          items: products.map((p, i) => ({
            product: p,
            reason: suggestedProducts[i]?.customText || 'Recommended',
            score: 1,
            bundleDiscount: config.bundleDiscount,
          })),
        });
      }
    }

    // 2. Category-based suggestions
    const categoryMappings = await prisma.categoryUpsellMapping.findMany({
      where: {
        sourceCategoryId: product.categoryId,
        isActive: true,
      },
      orderBy: { priority: 'asc' },
    });

    if (categoryMappings.length > 0) {
      const targetCategoryIds = categoryMappings.map(m => m.targetCategoryId);
      
      const categoryProducts = await prisma.product.findMany({
        where: {
          categoryId: { in: targetCategoryIds },
          isActive: true,
          id: { not: productId },
        },
        include: { category: true },
        take: limit,
        orderBy: { isFeatured: 'desc' },
      });

      if (categoryProducts.length > 0) {
        upsellGroups.push({
          type: 'category',
          priority: 50,
          displayText: categoryMappings[0].displayText || 'You might also need',
          items: categoryProducts.map(p => ({
            product: p,
            reason: `Popular in ${p.category.name}`,
            score: 0.8,
          })),
        });
      }
    }

    // 3. ML-based associations
    const associations = await prisma.productAssociation.findMany({
      where: {
        productAId: productId,
        confidence: { gte: 0.3 },
      },
      orderBy: { confidence: 'desc' },
      take: limit,
    });

    if (associations.length > 0) {
      const associatedProducts = await prisma.product.findMany({
        where: {
          id: { in: associations.map(a => a.productBId) },
          isActive: true,
        },
        include: { category: true },
      });

      if (associatedProducts.length > 0) {
        upsellGroups.push({
          type: 'ml',
          priority: 100,
          displayText: 'Frequently bought together',
          items: associatedProducts.map(p => {
            const assoc = associations.find(a => a.productBId === p.id);
            return {
              product: p,
              reason: 'Customers also bought',
              score: assoc?.confidence || 0.5,
            };
          }),
        });
      }
    }

    // Get warranties if requested
    let warranties: Awaited<ReturnType<typeof prisma.warrantyPlan.findMany>> = [];
    if (includeWarranties) {
      warranties = await prisma.warrantyPlan.findMany({
        where: {
          isActive: true,
          OR: [
            { productId },
            { productId: null },
          ],
          provider: { enabled: true },
        },
        include: {
          provider: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
        orderBy: { price: 'asc' },
      });
    }

    // Cache for 5 minutes
    await cache.set(cacheKey, upsellGroups, 300);

    res.json({
      success: true,
      data: {
        groups: upsellGroups,
        warranties,
        totalItems: upsellGroups.reduce((sum, g) => sum + g.items.length, 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get upsells for cart
router.get('/cart/:cartId', authenticate, async (req, res, next) => {
  try {
    const { cartId } = req.params;
    const sessionId = req.sessionId || req.headers['x-session-id'] as string;

    const cart = await prisma.cart.findFirst({
      where: req.user ? { id: cartId, userId: req.user.id } : { id: cartId, sessionId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart) {
      throw new NotFoundError('Cart');
    }

    const productIds = cart.items.map(item => item.productId);
    const categoryIds = [...new Set(cart.items.map(item => item.product.categoryId))];

    // Get suggestions based on cart contents
    const suggestions = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { notIn: productIds },
        OR: [
          // Products from related categories
          {
            category: {
              categoryMappings: {
                some: {
                  sourceCategoryId: { in: categoryIds },
                  isActive: true,
                },
              },
            },
          },
          // Products with associations to cart items
          {
            associationsB: {
              some: {
                productAId: { in: productIds },
                confidence: { gte: 0.3 },
              },
            },
          },
        ],
      },
      include: { category: true },
      take: 8,
      orderBy: { isFeatured: 'desc' },
    });

    res.json({
      success: true,
      data: {
        suggestions,
        displayText: 'Complete your purchase',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Track upsell interaction
router.post('/track', authenticate, validateBody(trackInteractionSchema), async (req, res, next) => {
  try {
    const { productId, suggestedProductId, source, action, location } = req.body;
    const sessionId = req.sessionId || req.headers['x-session-id'] as string || 'anonymous';

    await prisma.upsellInteraction.create({
      data: {
        productId,
        suggestedProductId,
        source,
        action,
        location,
        sessionId,
        userId: req.user?.id,
      },
    });

    // Update association confidence if purchase
    if (action === 'purchase') {
      const existing = await prisma.productAssociation.findFirst({
        where: {
          productAId: productId,
          productBId: suggestedProductId,
        },
      });

      if (existing) {
        await prisma.productAssociation.update({
          where: { id: existing.id },
          data: {
            coOccurrences: { increment: 1 },
            confidence: { increment: 0.01 },
            lastUpdated: new Date(),
          },
        });
      } else {
        await prisma.productAssociation.create({
          data: {
            productAId: productId,
            productBId: suggestedProductId,
            confidence: 0.3,
            support: 0.01,
            lift: 1,
            coOccurrences: 1,
          },
        });
      }
    }

    res.json({ success: true, data: { tracked: true } });
  } catch (error) {
    next(error);
  }
});

// Admin: Get upsell rules
router.get('/rules', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const rules = await prisma.upsellRule.findMany({
      include: {
        product: {
          select: { id: true, name: true, slug: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { priority: 'asc' },
    });

    res.json({ success: true, data: { rules } });
  } catch (error) {
    next(error);
  }
});

// Admin: Create upsell rule
router.post('/rules', authenticate, requireAdmin, validateBody(createRuleSchema), async (req, res, next) => {
  try {
    const data = req.body;

    const rule = await prisma.upsellRule.create({
      data: {
        name: data.name,
        description: data.description,
        productId: data.productId,
        categoryId: data.categoryId,
        ruleType: data.ruleType,
        config: data.config,
        suggestedProducts: data.suggestedProducts,
        warranty: data.warranty,
        priority: data.priority,
        isActive: data.isActive,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        conditions: data.conditions || [],
      },
      include: {
        product: {
          select: { id: true, name: true, slug: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Invalidate cache
    await cache.delPattern('upsells:*');

    res.status(201).json({ success: true, data: { rule } });
  } catch (error) {
    next(error);
  }
});

// Admin: Update upsell rule
router.put('/rules/:ruleId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { ruleId } = req.params;
    const data = req.body;

    const rule = await prisma.upsellRule.update({
      where: { id: ruleId },
      data,
      include: {
        product: {
          select: { id: true, name: true, slug: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Invalidate cache
    await cache.delPattern('upsells:*');

    res.json({ success: true, data: { rule } });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete upsell rule
router.delete('/rules/:ruleId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { ruleId } = req.params;

    await prisma.upsellRule.delete({ where: { id: ruleId } });

    // Invalidate cache
    await cache.delPattern('upsells:*');

    res.json({ success: true, data: { message: 'Rule deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

// Admin: Get upsell analytics
router.get('/analytics', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [
      totalImpressions,
      totalClicks,
      totalAddToCarts,
      totalPurchases,
      bySource,
    ] = await Promise.all([
      prisma.upsellInteraction.count({ where: { action: 'view' } }),
      prisma.upsellInteraction.count({ where: { action: 'click' } }),
      prisma.upsellInteraction.count({ where: { action: 'add_to_cart' } }),
      prisma.upsellInteraction.count({ where: { action: 'purchase' } }),
      prisma.upsellInteraction.groupBy({
        by: ['source', 'action'],
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        analytics: {
          totalImpressions,
          totalClicks,
          totalAddToCarts,
          totalPurchases,
          clickThroughRate: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : 0,
          addToCartRate: totalClicks > 0 ? (totalAddToCarts / totalClicks * 100).toFixed(2) : 0,
          conversionRate: totalImpressions > 0 ? (totalPurchases / totalImpressions * 100).toFixed(2) : 0,
          bySource,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;


import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { cache } from '../lib/redis.js';
import { validateQuery, validateBody, validateParams } from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { NotFoundError } from '../middleware/error-handler.js';
import { Prisma } from '@prisma/client';

const router = Router();

// Validation schemas
const productQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'price', 'createdAt', 'stock']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const productIdSchema = z.object({
  id: z.string().uuid(),
});

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  shortDescription: z.string().max(500).optional(),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  categoryId: z.string().uuid(),
  brand: z.string().optional(),
  attributes: z.record(z.any()).optional(),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    sortOrder: z.number().default(0),
    isPrimary: z.boolean().default(false),
  })).optional(),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  trackInventory: z.boolean().default(true),
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
    unit: z.enum(['in', 'cm']),
  }).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

// Generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Get all products with filtering and pagination
router.get('/', validateQuery(productQuerySchema), async (req, res, next) => {
  try {
    const {
      page,
      pageSize,
      categoryId,
      categorySlug,
      brand,
      minPrice,
      maxPrice,
      inStock,
      isFeatured,
      search,
      sortBy,
      sortOrder,
    } = req.query as z.infer<typeof productQuerySchema>;

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (categorySlug) {
      const category = await prisma.productCategory.findUnique({
        where: { slug: categorySlug },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    if (brand) {
      where.brand = brand;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (inStock !== undefined) {
      where.stock = inStock ? { gt: 0 } : { lte: 0 };
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.product.count({ where });

    // Get products
    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    res.json({
      success: true,
      data: {
        products,
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

// Get featured products
router.get('/featured', async (_req, res, next) => {
  try {
    // Try cache first
    const cacheKey = 'products:featured';
    const cached = await cache.get<typeof products>(cacheKey);
    if (cached) {
      return res.json({ success: true, data: { products: cached } });
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    // Cache for 5 minutes
    await cache.set(cacheKey, products, 300);

    res.json({ success: true, data: { products } });
  } catch (error) {
    next(error);
  }
});

// Get single product by ID or slug
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if ID is UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const product = await prisma.product.findFirst({
      where: isUuid ? { id, isActive: true } : { slug: id, isActive: true },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    res.json({ success: true, data: { product } });
  } catch (error) {
    next(error);
  }
});

// Create product (admin only)
router.post('/', authenticate, requireAdmin, validateBody(createProductSchema), async (req, res, next) => {
  try {
    const data = req.body;

    // Generate unique slug
    let slug = generateSlug(data.name);
    let slugExists = await prisma.product.findUnique({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(data.name)}-${counter}`;
      slugExists = await prisma.product.findUnique({ where: { slug } });
      counter++;
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        slug,
        images: data.images || [],
        attributes: data.attributes || {},
        dimensions: data.dimensions || null,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Invalidate cache
    await cache.delPattern('products:*');

    res.status(201).json({ success: true, data: { product } });
  } catch (error) {
    next(error);
  }
});

// Update product (admin only)
router.put('/:id', authenticate, requireAdmin, validateParams(productIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Check if product exists
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Product');
    }

    // Update slug if name changed
    let slug = existing.slug;
    if (data.name && data.name !== existing.name) {
      slug = generateSlug(data.name);
      let slugExists = await prisma.product.findFirst({ 
        where: { slug, NOT: { id } } 
      });
      let counter = 1;
      while (slugExists) {
        slug = `${generateSlug(data.name)}-${counter}`;
        slugExists = await prisma.product.findFirst({ 
          where: { slug, NOT: { id } } 
        });
        counter++;
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        slug,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Invalidate cache
    await cache.delPattern('products:*');

    res.json({ success: true, data: { product } });
  } catch (error) {
    next(error);
  }
});

// Delete product (admin only)
router.delete('/:id', authenticate, requireAdmin, validateParams(productIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({ where: { id } });

    // Invalidate cache
    await cache.delPattern('products:*');

    res.json({ success: true, data: { message: 'Product deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

export default router;


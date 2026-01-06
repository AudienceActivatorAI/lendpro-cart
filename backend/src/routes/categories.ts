import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { cache } from '../lib/redis.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { NotFoundError } from '../middleware/error-handler.js';

const router = Router();

// Validation schemas
const categoryIdSchema = z.object({
  id: z.string().uuid(),
});

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  image: z.string().url().optional(),
  attributesSchema: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'select', 'multiselect']),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

// Generate slug
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Get all categories (with hierarchy)
router.get('/', async (_req, res, next) => {
  try {
    // Try cache first
    const cacheKey = 'categories:all';
    const cached = await cache.get<typeof categories>(cacheKey);
    if (cached) {
      return res.json({ success: true, data: { categories: cached } });
    }

    const categories = await prisma.productCategory.findMany({
      where: { isActive: true, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
            _count: { select: { products: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Cache for 10 minutes
    await cache.set(cacheKey, categories, 600);

    res.json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
});

// Get flat list of categories
router.get('/flat', async (_req, res, next) => {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: { select: { products: true } },
      },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    });

    res.json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
});

// Get single category
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if ID is UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const category = await prisma.productCategory.findFirst({
      where: isUuid ? { id } : { slug: id },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true, image: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundError('Category');
    }

    res.json({ success: true, data: { category } });
  } catch (error) {
    next(error);
  }
});

// Create category (admin only)
router.post('/', authenticate, requireAdmin, validateBody(createCategorySchema), async (req, res, next) => {
  try {
    const data = req.body;

    // Generate unique slug
    let slug = generateSlug(data.name);
    let slugExists = await prisma.productCategory.findUnique({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(data.name)}-${counter}`;
      slugExists = await prisma.productCategory.findUnique({ where: { slug } });
      counter++;
    }

    const category = await prisma.productCategory.create({
      data: {
        ...data,
        slug,
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Invalidate cache
    await cache.del('categories:all');

    res.status(201).json({ success: true, data: { category } });
  } catch (error) {
    next(error);
  }
});

// Update category (admin only)
router.put('/:id', authenticate, requireAdmin, validateParams(categoryIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.productCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Category');
    }

    // Update slug if name changed
    let slug = existing.slug;
    if (data.name && data.name !== existing.name) {
      slug = generateSlug(data.name);
      let slugExists = await prisma.productCategory.findFirst({
        where: { slug, NOT: { id } },
      });
      let counter = 1;
      while (slugExists) {
        slug = `${generateSlug(data.name)}-${counter}`;
        slugExists = await prisma.productCategory.findFirst({
          where: { slug, NOT: { id } },
        });
        counter++;
      }
    }

    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        ...data,
        slug,
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Invalidate cache
    await cache.del('categories:all');

    res.json({ success: true, data: { category } });
  } catch (error) {
    next(error);
  }
});

// Delete category (admin only)
router.delete('/:id', authenticate, requireAdmin, validateParams(categoryIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check for products in category
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CATEGORY_HAS_PRODUCTS',
          message: 'Cannot delete category with products. Move or delete products first.',
        },
      });
    }

    // Check for child categories
    const childCount = await prisma.productCategory.count({ where: { parentId: id } });
    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CATEGORY_HAS_CHILDREN',
          message: 'Cannot delete category with subcategories. Delete subcategories first.',
        },
      });
    }

    await prisma.productCategory.delete({ where: { id } });

    // Invalidate cache
    await cache.del('categories:all');

    res.json({ success: true, data: { message: 'Category deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

export default router;


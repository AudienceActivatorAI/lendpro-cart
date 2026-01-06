import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { authenticate, requireAuth, requireAdmin } from '../middleware/auth.js';
import { NotFoundError, AppError } from '../middleware/error-handler.js';

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  preferences: z.object({
    marketingEmails: z.boolean().optional(),
    orderNotifications: z.boolean().optional(),
    currency: z.string().optional(),
    language: z.string().optional(),
  }).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const addressSchema = z.object({
  label: z.string().optional(),
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
  isDefault: z.boolean().default(false),
  type: z.enum(['SHIPPING', 'BILLING', 'BOTH']).default('BOTH'),
});

const addressIdSchema = z.object({
  addressId: z.string().uuid(),
});

// Get current user profile
router.get('/profile', authenticate, requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isEmailVerified: true,
        preferences: true,
        addresses: {
          orderBy: { isDefault: 'desc' },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/profile', authenticate, requireAuth, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const data = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...data,
        preferences: data.preferences 
          ? { ...(await prisma.user.findUnique({ where: { id: req.user!.id } }))?.preferences as object, ...data.preferences }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatarUrl: true,
        preferences: true,
      },
    });

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// Change password
router.put('/password', authenticate, requireAuth, validateBody(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash },
    });

    res.json({ success: true, data: { message: 'Password changed successfully' } });
  } catch (error) {
    next(error);
  }
});

// Get addresses
router.get('/addresses', authenticate, requireAuth, async (req, res, next) => {
  try {
    const addresses = await prisma.userAddress.findMany({
      where: { userId: req.user!.id },
      orderBy: { isDefault: 'desc' },
    });

    res.json({ success: true, data: { addresses } });
  } catch (error) {
    next(error);
  }
});

// Add address
router.post('/addresses', authenticate, requireAuth, validateBody(addressSchema), async (req, res, next) => {
  try {
    const data = req.body;

    // If this is default, unset other defaults
    if (data.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId: req.user!.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.userAddress.create({
      data: {
        ...data,
        userId: req.user!.id,
      },
    });

    res.status(201).json({ success: true, data: { address } });
  } catch (error) {
    next(error);
  }
});

// Update address
router.put('/addresses/:addressId', authenticate, requireAuth, validateParams(addressIdSchema), validateBody(addressSchema.partial()), async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const data = req.body;

    // Check ownership
    const existing = await prisma.userAddress.findFirst({
      where: { id: addressId, userId: req.user!.id },
    });

    if (!existing) {
      throw new NotFoundError('Address');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId: req.user!.id, isDefault: true, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }

    const address = await prisma.userAddress.update({
      where: { id: addressId },
      data,
    });

    res.json({ success: true, data: { address } });
  } catch (error) {
    next(error);
  }
});

// Delete address
router.delete('/addresses/:addressId', authenticate, requireAuth, validateParams(addressIdSchema), async (req, res, next) => {
  try {
    const { addressId } = req.params;

    // Check ownership
    const existing = await prisma.userAddress.findFirst({
      where: { id: addressId, userId: req.user!.id },
    });

    if (!existing) {
      throw new NotFoundError('Address');
    }

    await prisma.userAddress.delete({ where: { id: addressId } });

    res.json({ success: true, data: { message: 'Address deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all users
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const search = req.query.search as string | undefined;

    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
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

// Admin: Update user
router.put('/:userId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

export default router;


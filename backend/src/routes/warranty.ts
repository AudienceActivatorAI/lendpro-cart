import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { authenticate, requireAuth, requireAdmin } from '../middleware/auth.js';
import { NotFoundError, AppError } from '../middleware/error-handler.js';

const router = Router();

// Validation schemas
const productIdSchema = z.object({
  productId: z.string().uuid(),
});

const contractIdSchema = z.object({
  contractId: z.string().uuid(),
});

const fileClaimSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(10),
});

// Get warranty plans for a product
router.get('/product/:productId/plans', validateParams(productIdSchema), async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Get product to check category
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, price: true, categoryId: true },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    // Get warranty plans
    const plans = await prisma.warrantyPlan.findMany({
      where: {
        isActive: true,
        OR: [
          { productId },
          { productId: null }, // Universal plans
        ],
        provider: {
          enabled: true,
          OR: [
            { supportedCategories: { isEmpty: true } },
            { supportedCategories: { has: product.categoryId } },
          ],
        },
      },
      include: {
        provider: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
      orderBy: [{ provider: { priority: 'asc' } }, { price: 'asc' }],
    });

    res.json({ success: true, data: { plans } });
  } catch (error) {
    next(error);
  }
});

// Get warranty contract details
router.get('/contracts/:contractId', authenticate, requireAuth, validateParams(contractIdSchema), async (req, res, next) => {
  try {
    const { contractId } = req.params;

    const contract = await prisma.warrantyContract.findFirst({
      where: {
        id: contractId,
        ...(req.user!.role !== 'ADMIN' && { userId: req.user!.id }),
      },
      include: {
        plan: true,
        provider: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        claims: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contract) {
      throw new NotFoundError('Warranty contract');
    }

    res.json({ success: true, data: { contract } });
  } catch (error) {
    next(error);
  }
});

// Get user's warranty contracts
router.get('/contracts', authenticate, requireAuth, async (req, res, next) => {
  try {
    const contracts = await prisma.warrantyContract.findMany({
      where: { userId: req.user!.id },
      include: {
        plan: true,
        provider: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        _count: { select: { claims: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { contracts } });
  } catch (error) {
    next(error);
  }
});

// File a warranty claim
router.post('/contracts/:contractId/claims', authenticate, requireAuth, validateParams(contractIdSchema), validateBody(fileClaimSchema), async (req, res, next) => {
  try {
    const { contractId } = req.params;
    const { type, description } = req.body;

    // Get contract
    const contract = await prisma.warrantyContract.findFirst({
      where: {
        id: contractId,
        userId: req.user!.id,
      },
      include: { plan: true },
    });

    if (!contract) {
      throw new NotFoundError('Warranty contract');
    }

    // Check if contract is active
    if (contract.status !== 'active') {
      throw new AppError('Warranty contract is not active', 400, 'WARRANTY_NOT_ACTIVE');
    }

    // Check if contract is expired
    if (new Date() > contract.endDate) {
      throw new AppError('Warranty contract has expired', 400, 'WARRANTY_EXPIRED');
    }

    // Check claims limit
    if (contract.maxClaims && contract.claimsUsed >= contract.maxClaims) {
      throw new AppError('Maximum claims reached for this warranty', 400, 'MAX_CLAIMS_REACHED');
    }

    // Create claim
    const claim = await prisma.warrantyClaim.create({
      data: {
        contractId,
        type,
        description,
        status: 'submitted',
      },
    });

    // Update claims count
    await prisma.warrantyContract.update({
      where: { id: contractId },
      data: { claimsUsed: { increment: 1 } },
    });

    res.status(201).json({ success: true, data: { claim } });
  } catch (error) {
    next(error);
  }
});

// Get warranty providers
router.get('/providers', async (_req, res, next) => {
  try {
    const providers = await prisma.warrantyProvider.findMany({
      where: { enabled: true },
      orderBy: { priority: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        type: true,
        supportedCategories: true,
      },
    });

    res.json({ success: true, data: { providers } });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all warranty plans
router.get('/plans', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const plans = await prisma.warrantyPlan.findMany({
      include: {
        provider: {
          select: { id: true, name: true, slug: true },
        },
        product: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { plans } });
  } catch (error) {
    next(error);
  }
});

// Admin: Create warranty plan
router.post('/plans', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const data = req.body;

    const plan = await prisma.warrantyPlan.create({
      data,
      include: {
        provider: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.status(201).json({ success: true, data: { plan } });
  } catch (error) {
    next(error);
  }
});

// Admin: Update warranty plan
router.put('/plans/:planId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { planId } = req.params;
    const data = req.body;

    const plan = await prisma.warrantyPlan.update({
      where: { id: planId },
      data,
      include: {
        provider: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.json({ success: true, data: { plan } });
  } catch (error) {
    next(error);
  }
});

// Admin: Update claim status
router.put('/claims/:claimId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const { status, resolution, approvedAmount } = req.body;

    const claim = await prisma.warrantyClaim.update({
      where: { id: claimId },
      data: {
        status,
        resolution,
        approvedAmount,
        ...(status === 'completed' && { resolvedAt: new Date() }),
      },
    });

    res.json({ success: true, data: { claim } });
  } catch (error) {
    next(error);
  }
});

// Admin: Get warranty analytics
router.get('/analytics', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [
      totalContracts,
      activeContracts,
      totalClaims,
      contractsByProvider,
    ] = await Promise.all([
      prisma.warrantyContract.count(),
      prisma.warrantyContract.count({ where: { status: 'active' } }),
      prisma.warrantyClaim.count(),
      prisma.warrantyContract.groupBy({
        by: ['providerId'],
        _count: true,
        _sum: { warrantyPrice: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        analytics: {
          totalContracts,
          activeContracts,
          totalClaims,
          claimRate: totalContracts > 0 ? (totalClaims / totalContracts * 100).toFixed(2) : 0,
          contractsByProvider,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;


import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { NotFoundError, AppError } from '../middleware/error-handler.js';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router();

// Validation schemas
const platformIdSchema = z.object({
  platformId: z.string().uuid(),
});

const applicationSchema = z.object({
  cartId: z.string().uuid(),
  platformId: z.string().uuid(),
  applicantInfo: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(10),
    dateOfBirth: z.string(),
    ssnLast4: z.string().length(4).optional(),
    annualIncome: z.number().min(0).optional(),
    employmentStatus: z.enum(['employed', 'self_employed', 'unemployed', 'retired', 'student']).optional(),
    employer: z.string().optional(),
    address: z.object({
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      postalCode: z.string().min(5),
      country: z.string().default('US'),
    }),
  }),
});

const updatePlatformSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  priority: z.number().optional(),
  config: z.record(z.any()).optional(),
});

// Mock financing decision logic
const mockFinancingDecision = async (
  platform: { slug: string; minAmount: Decimal; maxAmount: Decimal },
  cartValue: number,
  applicantInfo: z.infer<typeof applicationSchema>['applicantInfo']
) => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

  // Check cart value bounds
  if (cartValue < Number(platform.minAmount) || cartValue > Number(platform.maxAmount)) {
    return {
      status: 'declined' as const,
      reason: 'Cart value outside financing range',
    };
  }

  // Calculate approval probability based on mock criteria
  let approvalScore = 50;

  // Income scoring
  if (applicantInfo.annualIncome) {
    if (applicantInfo.annualIncome >= 100000) approvalScore += 30;
    else if (applicantInfo.annualIncome >= 50000) approvalScore += 20;
    else if (applicantInfo.annualIncome >= 30000) approvalScore += 10;
  }

  // Employment scoring
  if (applicantInfo.employmentStatus === 'employed') approvalScore += 15;
  else if (applicantInfo.employmentStatus === 'self_employed') approvalScore += 10;

  // Cart value relative to income
  if (applicantInfo.annualIncome) {
    const ratio = cartValue / applicantInfo.annualIncome;
    if (ratio < 0.05) approvalScore += 10;
    else if (ratio > 0.2) approvalScore -= 20;
  }

  // Random factor
  approvalScore += Math.random() * 20 - 10;

  // Platform-specific adjustments for LendPro
  if (platform.slug === 'lendpro') {
    // LendPro has lenient approval with multiple lenders
    approvalScore += 15;
  }

  // Decision
  const approved = approvalScore >= 60;

  if (approved) {
    // Calculate terms - LendPro offers 0% APR for qualified customers
    const apr = approvalScore >= 80 ? 0 : 5.99;
    const numPayments = 4;
    const paymentAmount = cartValue / numPayments;

    return {
      status: 'approved' as const,
      approvedAmount: cartValue,
      terms: {
        apr,
        numPayments,
        paymentFrequency: 'biweekly' as const,
        paymentAmount,
        totalAmount: cartValue * (1 + apr / 100),
        firstPaymentDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      lenderName: 'LendPro Partner',
      lenderId: `lendpro-partner-${Math.floor(Math.random() * 35) + 1}`,
    };
  }

  return {
    status: 'declined' as const,
    reason: 'Application did not meet approval criteria',
    declineReasons: ['Credit profile does not meet minimum requirements'],
  };
};

// Get available financing platforms
router.get('/platforms', authenticate, async (req, res, next) => {
  try {
    const platforms = await prisma.financingPlatform.findMany({
      where: { enabled: true },
      orderBy: { priority: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        type: true,
        supportedFinancingTypes: true,
        minAmount: true,
        maxAmount: true,
      },
    });

    res.json({ success: true, data: { platforms } });
  } catch (error) {
    next(error);
  }
});

// Get financing options for cart
router.get('/platforms/:platformId/options', authenticate, validateParams(platformIdSchema), async (req, res, next) => {
  try {
    const { platformId } = req.params;
    const cartId = req.query.cartId as string;

    const platform = await prisma.financingPlatform.findUnique({
      where: { id: platformId },
    });

    if (!platform || !platform.enabled) {
      throw new NotFoundError('Financing platform');
    }

    let cartValue = 100; // Default for demo
    if (cartId) {
      const cart = await prisma.cart.findUnique({ where: { id: cartId } });
      if (cart) {
        cartValue = Number(cart.total);
      }
    }

    // Check if cart value is within platform bounds
    const eligible = cartValue >= Number(platform.minAmount) && cartValue <= Number(platform.maxAmount);

    // Generate sample financing options
    const options = eligible ? [
      {
        type: 'bnpl',
        name: 'Pay in 4',
        description: 'Split your purchase into 4 interest-free payments',
        terms: {
          apr: 0,
          numPayments: 4,
          paymentFrequency: 'biweekly',
          paymentAmount: cartValue / 4,
          totalAmount: cartValue,
        },
      },
      {
        type: 'installment',
        name: '6 Month Plan',
        description: 'Pay over 6 months with low interest',
        terms: {
          apr: 5.99,
          numPayments: 6,
          paymentFrequency: 'monthly',
          paymentAmount: (cartValue * 1.0599) / 6,
          totalAmount: cartValue * 1.0599,
        },
      },
    ] : [];

    res.json({
      success: true,
      data: {
        platform: {
          id: platform.id,
          name: platform.name,
          slug: platform.slug,
          description: platform.description,
        },
        eligible,
        minAmount: platform.minAmount,
        maxAmount: platform.maxAmount,
        cartValue,
        options,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Submit financing application
router.post('/applications', authenticate, validateBody(applicationSchema), async (req, res, next) => {
  try {
    const { cartId, platformId, applicantInfo } = req.body;
    const sessionId = req.sessionId || req.headers['x-session-id'] as string;

    // Get cart
    const cart = await prisma.cart.findFirst({
      where: req.user ? { id: cartId, userId: req.user.id } : { id: cartId, sessionId },
    });

    if (!cart) {
      throw new NotFoundError('Cart');
    }

    if (Number(cart.total) <= 0) {
      throw new AppError('Cart is empty', 400, 'CART_EMPTY');
    }

    // Get platform
    const platform = await prisma.financingPlatform.findUnique({
      where: { id: platformId },
    });

    if (!platform || !platform.enabled) {
      throw new NotFoundError('Financing platform');
    }

    // Create application
    const application = await prisma.financingApplication.create({
      data: {
        cartId,
        platformId,
        userId: req.user?.id,
        applicantInfo,
        cartValue: cart.total,
        status: 'PROCESSING',
      },
    });

    // Process application (mock)
    const decision = await mockFinancingDecision(platform, Number(cart.total), applicantInfo);

    // Update application with decision
    const updatedApplication = await prisma.financingApplication.update({
      where: { id: application.id },
      data: {
        status: decision.status === 'approved' ? 'APPROVED' : 'DECLINED',
        decision,
        attemptLog: [{
          platformId: platform.id,
          platformName: platform.name,
          timestamp: new Date(),
          status: decision.status,
          responseTimeMs: 2000,
        }],
      },
    });

    // If approved, create approval record
    let approval = null;
    if (decision.status === 'approved') {
      approval = await prisma.financingApproval.create({
        data: {
          applicationId: application.id,
          platformId,
          approvedAmount: decision.approvedAmount,
          terms: decision.terms,
          lenderName: decision.lenderName,
          lenderId: decision.lenderId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
        include: {
          platform: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      // Create payment schedule
      const payments = [];
      for (let i = 1; i <= decision.terms.numPayments; i++) {
        const dueDate = new Date(decision.terms.firstPaymentDate);
        dueDate.setDate(dueDate.getDate() + (i - 1) * 14); // biweekly

        payments.push({
          approvalId: approval.id,
          paymentNumber: i,
          amount: decision.terms.paymentAmount,
          principal: decision.terms.paymentAmount * 0.95,
          interest: decision.terms.paymentAmount * 0.05,
          dueDate,
        });
      }

      await prisma.financingPayment.createMany({ data: payments });
    }

    res.json({
      success: true,
      data: {
        application: updatedApplication,
        approval,
        decision: {
          status: decision.status,
          ...(decision.status === 'approved' ? {
            approvedAmount: decision.approvedAmount,
            terms: decision.terms,
          } : {
            reason: decision.reason,
            declineReasons: decision.declineReasons,
          }),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get application status
router.get('/applications/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const sessionId = req.sessionId || req.headers['x-session-id'] as string;

    const application = await prisma.financingApplication.findFirst({
      where: {
        id,
        ...(req.user ? { userId: req.user.id } : { cart: { sessionId } }),
      },
      include: {
        platform: {
          select: { id: true, name: true, slug: true },
        },
        approval: {
          include: {
            payments: {
              orderBy: { paymentNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundError('Financing application');
    }

    res.json({ success: true, data: { application } });
  } catch (error) {
    next(error);
  }
});

// Get user's financing applications
router.get('/applications', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: { applications: [] } });
    }

    const applications = await prisma.financingApplication.findMany({
      where: { userId: req.user.id },
      include: {
        platform: {
          select: { id: true, name: true, slug: true },
        },
        approval: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { applications } });
  } catch (error) {
    next(error);
  }
});

// Admin: Update platform
router.put('/platforms/:platformId', authenticate, requireAdmin, validateParams(platformIdSchema), validateBody(updatePlatformSchema), async (req, res, next) => {
  try {
    const { platformId } = req.params;
    const data = req.body;

    const platform = await prisma.financingPlatform.update({
      where: { id: platformId },
      data,
    });

    res.json({ success: true, data: { platform } });
  } catch (error) {
    next(error);
  }
});

// Admin: Get financing analytics
router.get('/analytics', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [
      totalApplications,
      approvedApplications,
      applications,
    ] = await Promise.all([
      prisma.financingApplication.count(),
      prisma.financingApplication.count({ where: { status: 'APPROVED' } }),
      prisma.financingApplication.groupBy({
        by: ['platformId'],
        _count: true,
      }),
    ]);

    const approvalRate = totalApplications > 0 
      ? (approvedApplications / totalApplications * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        analytics: {
          totalApplications,
          approvedApplications,
          approvalRate,
          applicationsByPlatform: applications,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;


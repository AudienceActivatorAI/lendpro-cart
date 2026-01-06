import { Router } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate, requireAuth, requireAdmin } from '../middleware/auth.js';
import { NotFoundError, AppError } from '../middleware/error-handler.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Initialize Stripe (with fallback for development)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

// Validation schemas
const createPaymentIntentSchema = z.object({
  cartId: z.string().uuid(),
  savePaymentMethod: z.boolean().default(false),
});

const savePaymentMethodSchema = z.object({
  stripePaymentMethodId: z.string(),
  isDefault: z.boolean().default(false),
});

const processRefundSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().min(0).optional(),
  reason: z.enum(['customer_request', 'duplicate', 'fraudulent', 'product_not_received', 'product_unacceptable', 'other']),
  notes: z.string().optional(),
});

// Create payment intent
router.post('/create-intent', authenticate, validateBody(createPaymentIntentSchema), async (req, res, next) => {
  try {
    const { cartId, savePaymentMethod } = req.body;
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

    // Check if Stripe is configured
    if (stripeSecretKey === 'sk_test_placeholder') {
      // Return mock payment intent for development
      return res.json({
        success: true,
        data: {
          paymentIntent: {
            id: `mock_pi_${Date.now()}`,
            clientSecret: `mock_secret_${Date.now()}`,
            amount: Math.round(Number(cart.total) * 100),
            currency: 'usd',
            status: 'requires_payment_method',
          },
          mock: true,
        },
      });
    }

    // Create Stripe payment intent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(Number(cart.total) * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        cartId: cart.id,
        userId: req.user?.id || 'guest',
      },
    };

    // If user is logged in and wants to save payment method
    if (req.user && savePaymentMethod) {
      // Get or create Stripe customer
      let customerId = await getOrCreateStripeCustomer(req.user.id);
      paymentIntentParams.customer = customerId;
      paymentIntentParams.setup_future_usage = 'off_session';
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    res.json({
      success: true,
      data: {
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Save payment method
router.post('/methods', authenticate, requireAuth, validateBody(savePaymentMethodSchema), async (req, res, next) => {
  try {
    const { stripePaymentMethodId, isDefault } = req.body;

    // Check if Stripe is configured
    if (stripeSecretKey === 'sk_test_placeholder') {
      // Create mock payment method
      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          userId: req.user!.id,
          type: 'card',
          stripePaymentMethodId,
          cardBrand: 'visa',
          cardLast4: '4242',
          cardExpMonth: 12,
          cardExpYear: 2025,
          isDefault,
        },
      });

      return res.status(201).json({ success: true, data: { paymentMethod } });
    }

    // Get payment method from Stripe
    const stripePaymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId: req.user!.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Save to database
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: req.user!.id,
        type: stripePaymentMethod.type,
        stripePaymentMethodId,
        cardBrand: stripePaymentMethod.card?.brand,
        cardLast4: stripePaymentMethod.card?.last4,
        cardExpMonth: stripePaymentMethod.card?.exp_month,
        cardExpYear: stripePaymentMethod.card?.exp_year,
        isDefault,
      },
    });

    res.status(201).json({ success: true, data: { paymentMethod } });
  } catch (error) {
    next(error);
  }
});

// Get user's saved payment methods
router.get('/methods', authenticate, requireAuth, async (req, res, next) => {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: req.user!.id },
      orderBy: { isDefault: 'desc' },
    });

    res.json({ success: true, data: { paymentMethods } });
  } catch (error) {
    next(error);
  }
});

// Delete payment method
router.delete('/methods/:methodId', authenticate, requireAuth, async (req, res, next) => {
  try {
    const { methodId } = req.params;

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id: methodId, userId: req.user!.id },
    });

    if (!paymentMethod) {
      throw new NotFoundError('Payment method');
    }

    // Delete from Stripe if configured
    if (stripeSecretKey !== 'sk_test_placeholder' && paymentMethod.stripePaymentMethodId) {
      try {
        await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
      } catch (error) {
        logger.warn('Failed to detach payment method from Stripe:', error);
      }
    }

    await prisma.paymentMethod.delete({ where: { id: methodId } });

    res.json({ success: true, data: { message: 'Payment method deleted' } });
  } catch (error) {
    next(error);
  }
});

// Process refund
router.post('/refunds', authenticate, requireAdmin, validateBody(processRefundSchema), async (req, res, next) => {
  try {
    const { orderId, amount, reason, notes } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        transactions: {
          where: { type: 'CHARGE', status: 'SUCCEEDED' },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    const chargeTransaction = order.transactions[0];
    if (!chargeTransaction) {
      throw new AppError('No successful charge found for this order', 400, 'NO_CHARGE_FOUND');
    }

    const refundAmount = amount || Number(order.total);
    if (refundAmount > Number(order.total)) {
      throw new AppError('Refund amount exceeds order total', 400, 'REFUND_EXCEEDS_TOTAL');
    }

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        orderId,
        transactionId: chargeTransaction.id,
        amount: refundAmount,
        reason,
        notes,
        status: 'PROCESSING',
      },
    });

    // Process Stripe refund if configured
    if (stripeSecretKey !== 'sk_test_placeholder' && chargeTransaction.stripeChargeId) {
      try {
        const stripeRefund = await stripe.refunds.create({
          charge: chargeTransaction.stripeChargeId,
          amount: Math.round(refundAmount * 100),
          reason: reason === 'fraudulent' ? 'fraudulent' : reason === 'duplicate' ? 'duplicate' : 'requested_by_customer',
        });

        await prisma.refund.update({
          where: { id: refund.id },
          data: {
            stripeRefundId: stripeRefund.id,
            status: stripeRefund.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING',
            processedAt: stripeRefund.status === 'succeeded' ? new Date() : null,
          },
        });

        // Create refund transaction
        await prisma.transaction.create({
          data: {
            orderId,
            type: refundAmount === Number(order.total) ? 'REFUND' : 'PARTIAL_REFUND',
            amount: refundAmount,
            status: 'SUCCEEDED',
            stripeRefundId: stripeRefund.id,
          },
        });
      } catch (error) {
        await prisma.refund.update({
          where: { id: refund.id },
          data: { status: 'FAILED' },
        });
        throw new AppError('Stripe refund failed', 500, 'REFUND_FAILED');
      }
    } else {
      // Mock refund for development
      await prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: 'SUCCEEDED',
          processedAt: new Date(),
        },
      });

      await prisma.transaction.create({
        data: {
          orderId,
          type: refundAmount === Number(order.total) ? 'REFUND' : 'PARTIAL_REFUND',
          amount: refundAmount,
          status: 'SUCCEEDED',
        },
      });
    }

    // Update order status
    const newPaymentStatus = refundAmount === Number(order.total) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: newPaymentStatus,
        ...(refundAmount === Number(order.total) && {
          status: 'REFUNDED',
          refundedAt: new Date(),
        }),
        refundAmount: { increment: refundAmount },
      },
    });

    const updatedRefund = await prisma.refund.findUnique({
      where: { id: refund.id },
    });

    res.json({ success: true, data: { refund: updatedRefund } });
  } catch (error) {
    next(error);
  }
});

// Stripe webhook handler
router.post('/webhook', async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.warn('Stripe webhook secret not configured');
      return res.status(200).json({ received: true });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logger.info(`PaymentIntent ${paymentIntent.id} succeeded`);
        
        // Update order payment status if needed
        if (paymentIntent.metadata.cartId) {
          // Handle order creation or update
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logger.warn(`PaymentIntent ${paymentIntent.id} failed`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        logger.info(`Charge ${charge.id} was refunded`);
        break;
      }

      default:
        logger.debug(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

// Admin: Get payment analytics
router.get('/analytics', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const [
      totalTransactions,
      successfulTransactions,
      totalRevenue,
      refundedAmount,
      transactionsByMethod,
    ] = await Promise.all([
      prisma.transaction.count({ where: { type: 'CHARGE' } }),
      prisma.transaction.count({ where: { type: 'CHARGE', status: 'SUCCEEDED' } }),
      prisma.transaction.aggregate({
        where: { type: 'CHARGE', status: 'SUCCEEDED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: { in: ['REFUND', 'PARTIAL_REFUND'] }, status: 'SUCCEEDED' },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ['paymentMethod'],
        where: { type: 'CHARGE', status: 'SUCCEEDED' },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        analytics: {
          totalTransactions,
          successfulTransactions,
          successRate: totalTransactions > 0 
            ? (successfulTransactions / totalTransactions * 100).toFixed(2)
            : 0,
          totalRevenue: totalRevenue._sum.amount || 0,
          refundedAmount: refundedAmount._sum.amount || 0,
          transactionsByMethod,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Helper: Get or create Stripe customer
async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  // This would typically store/retrieve the Stripe customer ID from the user record
  // For now, create a new customer each time
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    metadata: { userId },
  });

  return customer.id;
}

export default router;


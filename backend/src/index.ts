import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';

// Import mock routes (no database needed)
import mockProductsRouter from './routes/mock-products';
import mockCategoriesRouter from './routes/mock-categories';
import mockCartRouter from './routes/mock-cart';
import mockAuthRouter from './routes/mock-auth';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('dev'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: 'demo',
    timestamp: new Date().toISOString(),
  });
});

// API Routes (using mock data - no database required)
app.use('/api/auth', mockAuthRouter);
app.use('/api/products', mockProductsRouter);
app.use('/api/categories', mockCategoriesRouter);
app.use('/api/cart', mockCartRouter);

// Mock routes for other endpoints
app.get('/api/orders', (_req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/financing/platforms', (_req, res) => {
  res.json({
    success: true,
    data: {
      platforms: [
        {
          id: '1',
          name: 'LendPro',
          description: 'Pay over time with flexible financing options',
          type: 'waterfall',
          enabled: true,
          minAmount: 200,
          maxAmount: 15000,
          features: ['0% APR available', 'No hard credit check', 'Instant decisions'],
        },
      ],
    },
  });
});

app.get('/api/warranty/plans', (_req, res) => {
  res.json({
    success: true,
    data: {
      plans: [
        {
          id: '1',
          name: '2-Year Extended Protection',
          description: 'Covers defects and accidental damage',
          durationMonths: 24,
          price: 149.99,
          provider: { name: 'LendPro Shield', logoUrl: null },
        },
        {
          id: '2',
          name: '3-Year Premium Protection',
          description: 'Comprehensive coverage with priority service',
          durationMonths: 36,
          price: 249.99,
          provider: { name: 'LendPro Shield', logoUrl: null },
        },
      ],
    },
  });
});

app.get('/api/warranty/product/:productId/plans', (_req, res) => {
  res.json({
    success: true,
    data: {
      plans: [
        {
          id: '1',
          name: '2-Year Extended Protection',
          description: 'Covers defects and accidental damage',
          durationMonths: 24,
          price: 149.99,
          provider: { name: 'LendPro Shield', logoUrl: null },
        },
        {
          id: '2',
          name: '3-Year Premium Protection',
          description: 'Comprehensive coverage with priority service',
          durationMonths: 36,
          price: 249.99,
          provider: { name: 'LendPro Shield', logoUrl: null },
        },
      ],
    },
  });
});

app.get('/api/upsell/recommendations', (_req, res) => {
  res.json({ success: true, data: { groups: [] } });
});

app.get('/api/upsell/product/:productId', (_req, res) => {
  res.json({ success: true, data: { groups: [] } });
});

app.get('/api/upsell/cart/:cartId', (_req, res) => {
  res.json({ success: true, data: { recommendations: [] } });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🛒 LendPro Cart Backend Server                          ║
║                                                           ║
║   Mode: DEMO (Mock Data - No Database Required)           ║
║   Port: ${PORT}                                              ║
║   API:  http://localhost:${PORT}/api                         ║
║                                                           ║
║   Demo Accounts:                                          ║
║   - demo@example.com / password                           ║
║   - admin@example.com / password                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;

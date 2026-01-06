import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';

const router = Router();

router.get('/', async (_req, res) => {
  const startTime = Date.now();
  
  const services: Record<string, { status: string; latency?: number; message?: string }> = {
    database: { status: 'down' },
    redis: { status: 'down' },
  };

  // Check database
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    services.database = { status: 'up', latency: Date.now() - dbStart };
  } catch (error) {
    services.database = { 
      status: 'down', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    await redis.ping();
    services.redis = { status: 'up', latency: Date.now() - redisStart };
  } catch (error) {
    services.redis = { 
      status: 'down', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }

  const allServicesUp = Object.values(services).every(s => s.status === 'up');
  const someServicesDown = Object.values(services).some(s => s.status === 'down');

  const status = allServicesUp ? 'healthy' : someServicesDown ? 'unhealthy' : 'degraded';
  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

  res.status(statusCode).json({
    status,
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    services,
  });
});

router.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.status(200).json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

router.get('/live', (_req, res) => {
  res.status(200).json({ alive: true });
});

export default router;


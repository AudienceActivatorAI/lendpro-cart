import { Router } from 'express';
import { mlRecommender } from '../services/ml/recommender.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// All ML routes require admin access
router.use(authenticate, requireAdmin);

// Train association rules
router.post('/train/associations', async (req, res, next) => {
  try {
    const daysBack = Number(req.query.days) || 90;
    
    // Run training asynchronously
    mlRecommender.trainAssociationRules(daysBack)
      .then(() => logger.info('Association rules training completed'))
      .catch(err => logger.error('Association rules training failed:', err));

    res.json({
      success: true,
      data: {
        message: 'Training started',
        daysBack,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get model metrics
router.get('/metrics', async (req, res, next) => {
  try {
    const metrics = await mlRecommender.getModelMetrics();

    res.json({
      success: true,
      data: { metrics },
    });
  } catch (error) {
    next(error);
  }
});

// Get recommendations for a product (for testing)
router.get('/recommendations/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const limit = Number(req.query.limit) || 8;

    const recommendations = await mlRecommender.getRecommendations(productId, limit);

    res.json({
      success: true,
      data: { recommendations },
    });
  } catch (error) {
    next(error);
  }
});

export default router;


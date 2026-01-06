import { prisma } from '../../lib/prisma.js';
import { cache } from '../../lib/redis.js';
import { logger } from '../../utils/logger.js';

interface ProductEmbedding {
  productId: string;
  embedding: number[];
}

interface RecommendationResult {
  productId: string;
  score: number;
  reason: string;
}

/**
 * ML-based product recommendation engine
 * Uses collaborative filtering and association rules for recommendations
 */
export class MLRecommender {
  private modelVersion: string = '1.0.0';
  private embeddingDimension: number = 32;

  /**
   * Get ML-based recommendations for a product
   */
  async getRecommendations(
    productId: string,
    limit: number = 8
  ): Promise<RecommendationResult[]> {
    try {
      // Try cache first
      const cacheKey = `ml:recommendations:${productId}`;
      const cached = await cache.get<RecommendationResult[]>(cacheKey);
      if (cached) return cached;

      // Get association-based recommendations
      const associations = await prisma.productAssociation.findMany({
        where: { productAId: productId },
        orderBy: { confidence: 'desc' },
        take: limit * 2, // Get more than needed for filtering
        include: {
          productB: {
            select: { id: true, name: true, isActive: true, stock: true },
          },
        },
      });

      // Filter to active, in-stock products
      const results: RecommendationResult[] = associations
        .filter(a => a.productB.isActive && a.productB.stock > 0)
        .slice(0, limit)
        .map(a => ({
          productId: a.productBId,
          score: a.confidence,
          reason: `Frequently bought together (${Math.round(a.confidence * 100)}% confidence)`,
        }));

      // If we don't have enough associations, supplement with category-based
      if (results.length < limit) {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          select: { categoryId: true },
        });

        if (product) {
          const categoryProducts = await prisma.product.findMany({
            where: {
              categoryId: product.categoryId,
              id: { notIn: [productId, ...results.map(r => r.productId)] },
              isActive: true,
              stock: { gt: 0 },
            },
            orderBy: { isFeatured: 'desc' },
            take: limit - results.length,
            select: { id: true },
          });

          results.push(
            ...categoryProducts.map(p => ({
              productId: p.id,
              score: 0.5,
              reason: 'Similar products in category',
            }))
          );
        }
      }

      // Cache for 1 hour
      await cache.set(cacheKey, results, 3600);

      return results;
    } catch (error) {
      logger.error('Error getting ML recommendations:', error);
      return [];
    }
  }

  /**
   * Update product associations based on order data
   * Called after each order to update co-occurrence data
   */
  async updateAssociationsFromOrder(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order || order.items.length < 2) return;

      const productIds = order.items.map(item => item.productId);

      // Create/update associations for all product pairs
      for (let i = 0; i < productIds.length; i++) {
        for (let j = 0; j < productIds.length; j++) {
          if (i !== j) {
            await this.updateAssociation(productIds[i], productIds[j]);
          }
        }
      }

      // Store training data
      await prisma.mLTrainingData.create({
        data: {
          orderId,
          productCombinations: productIds,
          userId: order.userId,
        },
      });

      // Invalidate cache for affected products
      for (const productId of productIds) {
        await cache.del(`ml:recommendations:${productId}`);
      }

      logger.info(`Updated associations from order ${orderId}`);
    } catch (error) {
      logger.error('Error updating associations:', error);
    }
  }

  /**
   * Update or create association between two products
   */
  private async updateAssociation(
    productAId: string,
    productBId: string
  ): Promise<void> {
    const existing = await prisma.productAssociation.findFirst({
      where: { productAId, productBId },
    });

    if (existing) {
      // Update existing association
      const newCoOccurrences = existing.coOccurrences + 1;
      const newConfidence = Math.min(0.99, existing.confidence + 0.02);

      await prisma.productAssociation.update({
        where: { id: existing.id },
        data: {
          coOccurrences: newCoOccurrences,
          confidence: newConfidence,
          lastUpdated: new Date(),
        },
      });
    } else {
      // Create new association
      await prisma.productAssociation.create({
        data: {
          productAId,
          productBId,
          confidence: 0.3, // Start with base confidence
          support: 0.01,
          lift: 1,
          coOccurrences: 1,
        },
      });
    }
  }

  /**
   * Train association rules from historical order data
   * Should be run periodically (e.g., nightly)
   */
  async trainAssociationRules(daysBack: number = 90): Promise<void> {
    try {
      logger.info(`Training association rules from last ${daysBack} days`);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get orders with multiple items
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
          paymentStatus: 'PAID',
        },
        include: {
          items: {
            select: { productId: true },
          },
        },
      });

      // Filter orders with 2+ items
      const multiItemOrders = orders.filter(o => o.items.length >= 2);

      // Build item frequency map
      const itemFrequency: Map<string, number> = new Map();
      const pairFrequency: Map<string, number> = new Map();
      const totalTransactions = multiItemOrders.length;

      for (const order of multiItemOrders) {
        const productIds = [...new Set(order.items.map(i => i.productId))];

        // Count individual items
        for (const id of productIds) {
          itemFrequency.set(id, (itemFrequency.get(id) || 0) + 1);
        }

        // Count pairs
        for (let i = 0; i < productIds.length; i++) {
          for (let j = i + 1; j < productIds.length; j++) {
            const pairKey = [productIds[i], productIds[j]].sort().join('|');
            pairFrequency.set(pairKey, (pairFrequency.get(pairKey) || 0) + 1);
          }
        }
      }

      // Calculate and store association rules
      const minSupport = 0.01; // Minimum 1% of orders
      const minConfidence = 0.1; // Minimum 10% confidence

      for (const [pairKey, pairCount] of pairFrequency) {
        const [idA, idB] = pairKey.split('|');
        const support = pairCount / totalTransactions;

        if (support < minSupport) continue;

        const countA = itemFrequency.get(idA) || 0;
        const countB = itemFrequency.get(idB) || 0;

        // A -> B
        const confidenceAB = pairCount / countA;
        if (confidenceAB >= minConfidence) {
          const supportA = countA / totalTransactions;
          const supportB = countB / totalTransactions;
          const lift = confidenceAB / supportB;

          await prisma.productAssociation.upsert({
            where: {
              productAId_productBId: { productAId: idA, productBId: idB },
            },
            update: {
              confidence: confidenceAB,
              support,
              lift,
              coOccurrences: pairCount,
              lastUpdated: new Date(),
            },
            create: {
              productAId: idA,
              productBId: idB,
              confidence: confidenceAB,
              support,
              lift,
              coOccurrences: pairCount,
            },
          });
        }

        // B -> A
        const confidenceBA = pairCount / countB;
        if (confidenceBA >= minConfidence) {
          const supportA = countA / totalTransactions;
          const lift = confidenceBA / supportA;

          await prisma.productAssociation.upsert({
            where: {
              productAId_productBId: { productAId: idB, productBId: idA },
            },
            update: {
              confidence: confidenceBA,
              support,
              lift,
              coOccurrences: pairCount,
              lastUpdated: new Date(),
            },
            create: {
              productAId: idB,
              productBId: idA,
              confidence: confidenceBA,
              support,
              lift,
              coOccurrences: pairCount,
            },
          });
        }
      }

      // Update ML model record
      await prisma.mLModel.upsert({
        where: { id: 'association-rules' },
        update: {
          trainedAt: new Date(),
          trainingData: totalTransactions,
          isActive: true,
        },
        create: {
          id: 'association-rules',
          modelType: 'association_rules',
          version: this.modelVersion,
          trainingData: totalTransactions,
          isActive: true,
        },
      });

      // Clear recommendation cache
      await cache.delPattern('ml:recommendations:*');

      logger.info(`Trained association rules: ${pairFrequency.size} pairs from ${totalTransactions} orders`);
    } catch (error) {
      logger.error('Error training association rules:', error);
      throw error;
    }
  }

  /**
   * Get model metrics
   */
  async getModelMetrics(): Promise<{
    modelType: string;
    version: string;
    lastTrainedAt: Date | null;
    trainingDataSize: number;
    totalAssociations: number;
    averageConfidence: number;
  }> {
    const model = await prisma.mLModel.findFirst({
      where: { modelType: 'association_rules', isActive: true },
    });

    const associationStats = await prisma.productAssociation.aggregate({
      _count: true,
      _avg: { confidence: true },
    });

    return {
      modelType: 'association_rules',
      version: this.modelVersion,
      lastTrainedAt: model?.trainedAt || null,
      trainingDataSize: model?.trainingData || 0,
      totalAssociations: associationStats._count,
      averageConfidence: associationStats._avg.confidence || 0,
    };
  }
}

export const mlRecommender = new MLRecommender();
export default mlRecommender;


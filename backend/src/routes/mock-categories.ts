import { Router, Request, Response } from 'express';
import { mockCategories, mockProducts } from '../mock/data';

const router = Router();

// Get all categories
router.get('/', (_req: Request, res: Response) => {
  // Add product counts
  const categoriesWithCount = mockCategories.map(cat => ({
    ...cat,
    _count: {
      products: mockProducts.filter(p => p.categoryId === cat.id).length,
    },
  }));
  
  res.json({
    success: true,
    data: {
      categories: categoriesWithCount,
    },
  });
});

// Get category by ID or slug
router.get('/:idOrSlug', (req: Request, res: Response) => {
  const { idOrSlug } = req.params;
  const category = mockCategories.find(c => c.id === idOrSlug || c.slug === idOrSlug);
  
  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found',
    });
  }
  
  res.json({
    success: true,
    data: category,
  });
});

// Get products by category
router.get('/:idOrSlug/products', (req: Request, res: Response) => {
  const { idOrSlug } = req.params;
  const category = mockCategories.find(c => c.id === idOrSlug || c.slug === idOrSlug);
  
  if (!category) {
    return res.status(404).json({
      success: false,
      error: 'Category not found',
    });
  }
  
  const products = mockProducts.filter(p => p.categoryId === category.id);
  
  res.json({
    success: true,
    data: products,
  });
});

export default router;


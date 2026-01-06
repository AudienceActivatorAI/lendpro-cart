import { Router, Request, Response } from 'express';
import { mockProducts, mockCategories } from '../mock/data';

const router = Router();

// Helper to add category to product
const enrichProduct = (product: typeof mockProducts[0]) => {
  const category = mockCategories.find(c => c.id === product.categoryId);
  return {
    ...product,
    category: category ? { id: category.id, name: category.name, slug: category.slug } : undefined,
  };
};

// Get all products with filtering
router.get('/', (req: Request, res: Response) => {
  let products = [...mockProducts];
  
  const { category, categorySlug, featured, search, minPrice, maxPrice, sortBy, sortOrder, page = '1', pageSize = '12', limit } = req.query;
  
  // Handle category filtering
  const categoryFilter = categorySlug || category;
  if (categoryFilter) {
    const cat = mockCategories.find(c => c.slug === categoryFilter || c.id === categoryFilter);
    if (cat) {
      products = products.filter(p => p.categoryId === cat.id);
    }
  }
  
  if (featured === 'true') {
    products = products.filter(p => p.isFeatured);
  }
  
  if (search) {
    const searchLower = (search as string).toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower)
    );
  }
  
  if (minPrice) {
    products = products.filter(p => p.price >= Number(minPrice));
  }
  
  if (maxPrice) {
    products = products.filter(p => p.price <= Number(maxPrice));
  }
  
  // Sort
  const sortField = sortBy as string || 'createdAt';
  const sortDir = sortOrder as string || 'desc';
  
  if (sortField === 'price') {
    products.sort((a, b) => sortDir === 'asc' ? a.price - b.price : b.price - a.price);
  } else if (sortField === 'name') {
    products.sort((a, b) => sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  } else {
    // Default: by createdAt
    products.sort((a, b) => sortDir === 'asc' 
      ? a.createdAt.getTime() - b.createdAt.getTime() 
      : b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
  
  const total = products.length;
  
  // Pagination
  const pageNum = Number(page);
  const limitNum = Number(pageSize || limit || 12);
  const start = (pageNum - 1) * limitNum;
  const paginatedProducts = products.slice(start, start + limitNum).map(enrichProduct);
  
  res.json({
    success: true,
    data: {
      products: paginatedProducts,
      total,
      page: pageNum,
      pageSize: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// Get featured products
router.get('/featured', (_req: Request, res: Response) => {
  const featured = mockProducts.filter(p => p.isFeatured);
  res.json({
    success: true,
    data: {
      products: featured,
    },
  });
});

// Get product by ID or slug
router.get('/:idOrSlug', (req: Request, res: Response) => {
  const { idOrSlug } = req.params;
  const product = mockProducts.find(p => p.id === idOrSlug || p.slug === idOrSlug);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found',
    });
  }
  
  // Add category info
  const category = mockCategories.find(c => c.id === product.categoryId);
  
  res.json({
    success: true,
    data: {
      product: {
        ...product,
        category: category ? { id: category.id, name: category.name, slug: category.slug } : undefined,
      },
    },
  });
});

// Get related products
router.get('/:id/related', (req: Request, res: Response) => {
  const { id } = req.params;
  const product = mockProducts.find(p => p.id === id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found',
    });
  }
  
  const related = mockProducts
    .filter(p => p.id !== id && p.categoryId === product.categoryId)
    .slice(0, 4);
  
  res.json({
    success: true,
    data: related,
  });
});

export default router;


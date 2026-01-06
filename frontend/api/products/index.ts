import type { VercelRequest, VercelResponse } from '@vercel/node';

const mockCategories = [
  { id: '1', name: 'Mattresses', slug: 'mattresses' },
  { id: '2', name: 'Bedding', slug: 'bedding' },
  { id: '3', name: 'Electronics', slug: 'electronics' },
  { id: '4', name: 'Furniture', slug: 'furniture' },
];

const mockProducts = [
  {
    id: '1',
    name: 'CloudRest Memory Foam Mattress',
    slug: 'cloudrest-memory-foam-mattress',
    description: 'Experience the ultimate in comfort with our CloudRest Memory Foam Mattress.',
    shortDescription: 'Premium memory foam with cooling gel technology',
    sku: 'MATT-001',
    price: 899.99,
    compareAtPrice: 1199.99,
    images: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800'],
    categoryId: '1',
    category: { id: '1', name: 'Mattresses', slug: 'mattresses' },
    stock: 25,
    isActive: true,
    isFeatured: true,
    rating: 4.8,
    reviewCount: 324,
  },
  {
    id: '2',
    name: 'DreamLux Hybrid Mattress',
    slug: 'dreamlux-hybrid-mattress',
    description: 'The DreamLux Hybrid combines the best of innerspring support with memory foam comfort.',
    shortDescription: 'Hybrid design with innerspring and memory foam',
    sku: 'MATT-002',
    price: 1299.99,
    compareAtPrice: 1599.99,
    images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'],
    categoryId: '1',
    category: { id: '1', name: 'Mattresses', slug: 'mattresses' },
    stock: 18,
    isActive: true,
    isFeatured: true,
    rating: 4.9,
    reviewCount: 256,
  },
  {
    id: '3',
    name: 'EcoSleep Organic Latex Mattress',
    slug: 'ecosleep-organic-latex-mattress',
    description: 'Made with 100% organic latex and natural materials.',
    shortDescription: '100% organic latex, naturally hypoallergenic',
    sku: 'MATT-003',
    price: 1599.99,
    compareAtPrice: 1999.99,
    images: ['https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800'],
    categoryId: '1',
    category: { id: '1', name: 'Mattresses', slug: 'mattresses' },
    stock: 12,
    isActive: true,
    isFeatured: false,
    rating: 4.7,
    reviewCount: 189,
  },
  {
    id: '4',
    name: 'Egyptian Cotton Sheet Set',
    slug: 'egyptian-cotton-sheet-set',
    description: 'Luxurious 1000 thread count Egyptian cotton sheets.',
    shortDescription: '1000 thread count Egyptian cotton',
    sku: 'BED-001',
    price: 249.99,
    compareAtPrice: 349.99,
    images: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'],
    categoryId: '2',
    category: { id: '2', name: 'Bedding', slug: 'bedding' },
    stock: 50,
    isActive: true,
    isFeatured: true,
    rating: 4.6,
    reviewCount: 412,
  },
  {
    id: '5',
    name: 'Memory Foam Pillow Set',
    slug: 'memory-foam-pillow-set',
    description: 'Set of 2 premium shredded memory foam pillows with cooling bamboo covers.',
    shortDescription: 'Adjustable shredded memory foam, set of 2',
    sku: 'BED-002',
    price: 89.99,
    compareAtPrice: 129.99,
    images: ['https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800'],
    categoryId: '2',
    category: { id: '2', name: 'Bedding', slug: 'bedding' },
    stock: 75,
    isActive: true,
    isFeatured: false,
    rating: 4.5,
    reviewCount: 567,
  },
  {
    id: '6',
    name: 'Down Alternative Comforter',
    slug: 'down-alternative-comforter',
    description: 'Plush, hypoallergenic down alternative comforter.',
    shortDescription: 'Hypoallergenic, all-season comfort',
    sku: 'BED-003',
    price: 149.99,
    compareAtPrice: 199.99,
    images: ['https://images.unsplash.com/photo-1616627561839-074385245ff6?w=800'],
    categoryId: '2',
    category: { id: '2', name: 'Bedding', slug: 'bedding' },
    stock: 40,
    isActive: true,
    isFeatured: false,
    rating: 4.4,
    reviewCount: 234,
  },
  {
    id: '7',
    name: 'Premium 4K Smart TV 65"',
    slug: 'premium-4k-smart-tv-65',
    description: 'Stunning 65-inch 4K UHD Smart TV with HDR10+, Dolby Vision.',
    shortDescription: '65" 4K UHD with HDR10+ and Dolby Vision',
    sku: 'ELEC-001',
    price: 1299.99,
    compareAtPrice: 1599.99,
    images: ['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800'],
    categoryId: '3',
    category: { id: '3', name: 'Electronics', slug: 'electronics' },
    stock: 15,
    isActive: true,
    isFeatured: true,
    rating: 4.7,
    reviewCount: 892,
  },
  {
    id: '8',
    name: 'Smart Home Speaker System',
    slug: 'smart-home-speaker-system',
    description: 'Premium wireless speaker system with voice assistant.',
    shortDescription: 'Voice-controlled multi-room audio',
    sku: 'ELEC-002',
    price: 349.99,
    compareAtPrice: 449.99,
    images: ['https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800'],
    categoryId: '3',
    category: { id: '3', name: 'Electronics', slug: 'electronics' },
    stock: 30,
    isActive: true,
    isFeatured: false,
    rating: 4.5,
    reviewCount: 456,
  },
  {
    id: '9',
    name: 'Gaming Console Pro',
    slug: 'gaming-console-pro',
    description: 'Next-gen gaming console with 4K gaming at 120fps.',
    shortDescription: '4K gaming at 120fps with ray tracing',
    sku: 'ELEC-003',
    price: 499.99,
    compareAtPrice: null,
    images: ['https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800'],
    categoryId: '3',
    category: { id: '3', name: 'Electronics', slug: 'electronics' },
    stock: 8,
    isActive: true,
    isFeatured: true,
    rating: 4.9,
    reviewCount: 1234,
  },
  {
    id: '10',
    name: 'Wireless Noise-Canceling Headphones',
    slug: 'wireless-noise-canceling-headphones',
    description: 'Premium over-ear headphones with active noise cancellation.',
    shortDescription: 'ANC headphones with 30hr battery',
    sku: 'ELEC-004',
    price: 279.99,
    compareAtPrice: 349.99,
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
    categoryId: '3',
    category: { id: '3', name: 'Electronics', slug: 'electronics' },
    stock: 45,
    isActive: true,
    isFeatured: false,
    rating: 4.6,
    reviewCount: 678,
  },
  {
    id: '11',
    name: 'Modern Platform Bed Frame',
    slug: 'modern-platform-bed-frame',
    description: 'Sleek, minimalist platform bed frame with built-in USB charging ports.',
    shortDescription: 'Platform bed with USB charging ports',
    sku: 'FURN-001',
    price: 599.99,
    compareAtPrice: 799.99,
    images: ['https://images.unsplash.com/photo-1505693314120-0d443867891c?w=800'],
    categoryId: '4',
    category: { id: '4', name: 'Furniture', slug: 'furniture' },
    stock: 10,
    isActive: true,
    isFeatured: true,
    rating: 4.7,
    reviewCount: 189,
  },
  {
    id: '12',
    name: 'Upholstered Headboard',
    slug: 'upholstered-headboard',
    description: 'Luxurious tufted upholstered headboard with premium fabric.',
    shortDescription: 'Tufted design with premium fabric',
    sku: 'FURN-002',
    price: 349.99,
    compareAtPrice: 449.99,
    images: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'],
    categoryId: '4',
    category: { id: '4', name: 'Furniture', slug: 'furniture' },
    stock: 15,
    isActive: true,
    isFeatured: false,
    rating: 4.5,
    reviewCount: 145,
  },
  {
    id: '13',
    name: 'Nightstand with Wireless Charging',
    slug: 'nightstand-wireless-charging',
    description: 'Modern nightstand with built-in wireless charging pad.',
    shortDescription: 'Built-in wireless charging pad',
    sku: 'FURN-003',
    price: 249.99,
    compareAtPrice: 299.99,
    images: ['https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800'],
    categoryId: '4',
    category: { id: '4', name: 'Furniture', slug: 'furniture' },
    stock: 20,
    isActive: true,
    isFeatured: false,
    rating: 4.4,
    reviewCount: 98,
  },
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { category, search, sortBy, page = '1', pageSize = '12', featured } = req.query;

    let products = [...mockProducts];

    if (category && typeof category === 'string') {
      const cat = mockCategories.find(c => c.slug === category || c.id === category);
      if (cat) {
        products = products.filter(p => p.categoryId === cat.id);
      }
    }

    if (featured === 'true') {
      products = products.filter(p => p.isFeatured);
    }

    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    if (sortBy === 'price_asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      products.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'name') {
      products.sort((a, b) => a.name.localeCompare(b.name));
    }

    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const total = products.length;
    const totalPages = Math.ceil(total / pageSizeNum);
    const startIndex = (pageNum - 1) * pageSizeNum;
    const endIndex = startIndex + pageSizeNum;
    const paginatedProducts = products.slice(startIndex, endIndex);

    return res.status(200).json({
      success: true,
      data: {
        products: paginatedProducts,
        total,
        totalPages,
        page: pageNum,
        pageSize: pageSizeNum,
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

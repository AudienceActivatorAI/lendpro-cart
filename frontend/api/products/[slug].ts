import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mockProducts } from '../mockData';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
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
    const { slug } = req.query;

    const product = mockProducts.find(
      p => p.slug === slug || p.id === slug
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Enrich product with related products
    const relatedProducts = mockProducts
      .filter(p => p.categoryId === product.categoryId && p.id !== product.id)
      .slice(0, 4);

    return res.status(200).json({
      success: true,
      data: {
        product: {
          ...product,
          relatedProducts,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}


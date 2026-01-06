import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCart, updateCart, calculateCartTotals, mockProducts } from '../mockData';

function getSessionId(req: VercelRequest): string {
  let sessionId = req.headers['x-session-id'] as string;
  if (!sessionId) {
    sessionId = req.cookies?.sessionId || 'default-session';
  }
  return sessionId;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sessionId = getSessionId(req);

  if (req.method === 'POST') {
    try {
      const { productId, quantity = 1 } = req.body;

      if (!productId) {
        return res.status(400).json({ success: false, message: 'Product ID is required' });
      }

      const product = mockProducts.find(p => p.id === productId || p.slug === productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const cart = getCart(sessionId);

      // Check if item already exists
      const existingItemIndex = cart.items.findIndex((item: any) => item.productId === product.id);

      if (existingItemIndex >= 0) {
        // Update quantity
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].totalPrice = cart.items[existingItemIndex].quantity * cart.items[existingItemIndex].unitPrice;
      } else {
        // Add new item
        cart.items.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          productId: product.id,
          product: product,
          quantity,
          unitPrice: product.price,
          totalPrice: product.price * quantity,
          warrantyPrice: null,
        });
      }

      const updatedCart = calculateCartTotals(cart);
      updateCart(sessionId, updatedCart);

      return res.status(200).json({
        success: true,
        data: { cart: updatedCart },
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}


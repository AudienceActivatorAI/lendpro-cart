import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCart, updateCart, calculateCartTotals } from '../../mockData';

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
  const { itemId } = req.query;

  if (req.method === 'PUT') {
    try {
      const { quantity } = req.body;
      const cart = getCart(sessionId);

      const itemIndex = cart.items.findIndex((item: any) => item.id === itemId);
      if (itemIndex < 0) {
        return res.status(404).json({ success: false, message: 'Cart item not found' });
      }

      if (quantity !== undefined) {
        if (quantity <= 0) {
          // Remove item
          cart.items.splice(itemIndex, 1);
        } else {
          cart.items[itemIndex].quantity = quantity;
          cart.items[itemIndex].totalPrice = cart.items[itemIndex].unitPrice * quantity;
        }
      }

      const updatedCart = calculateCartTotals(cart);
      updateCart(sessionId, updatedCart);

      return res.status(200).json({
        success: true,
        data: { cart: updatedCart },
      });
    } catch (error) {
      console.error('Error updating cart item:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const cart = getCart(sessionId);

      const itemIndex = cart.items.findIndex((item: any) => item.id === itemId);
      if (itemIndex < 0) {
        return res.status(404).json({ success: false, message: 'Cart item not found' });
      }

      cart.items.splice(itemIndex, 1);

      const updatedCart = calculateCartTotals(cart);
      updateCart(sessionId, updatedCart);

      return res.status(200).json({
        success: true,
        data: { cart: updatedCart },
      });
    } catch (error) {
      console.error('Error removing cart item:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}


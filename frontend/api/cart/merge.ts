import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCart, calculateCartTotals } from '../_mockData';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const sessionId = getSessionId(req);
  const cart = getCart(sessionId);

  return res.status(200).json({
    success: true,
    data: { cart: calculateCartTotals(cart) },
  });
}


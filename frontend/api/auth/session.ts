import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST' || req.method === 'GET') {
    let sessionId = req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      sessionId = req.cookies?.sessionId;
    }
    
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
      },
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}


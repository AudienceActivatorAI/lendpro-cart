import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  return res.status(200).json({
    success: true,
    data: {
      platforms: [
        {
          id: '1',
          name: 'LendPro Finance',
          slug: 'lendpro',
          type: 'waterfall',
          enabled: true,
          minAmount: 200,
          maxAmount: 10000,
          supportedFinancingTypes: ['bnpl', 'installment'],
          description: 'Fast and easy financing approval with no credit check required',
          logo: '/images/lendpro-logo.svg',
        },
      ],
    },
  });
}


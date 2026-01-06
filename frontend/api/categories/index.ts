import type { VercelRequest, VercelResponse } from '@vercel/node';

const mockCategories = [
  {
    id: '1',
    name: 'Mattresses',
    slug: 'mattresses',
    description: 'Premium mattresses for every sleep style',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800',
    productCount: 3,
  },
  {
    id: '2',
    name: 'Bedding',
    slug: 'bedding',
    description: 'Luxury sheets, pillows, and comforters',
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
    productCount: 3,
  },
  {
    id: '3',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Smart home devices and electronics',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800',
    productCount: 4,
  },
  {
    id: '4',
    name: 'Furniture',
    slug: 'furniture',
    description: 'Bedroom and living room furniture',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
    productCount: 3,
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

  return res.status(200).json({
    success: true,
    data: {
      categories: mockCategories,
    },
  });
}

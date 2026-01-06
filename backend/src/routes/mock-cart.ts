import { Router, Request, Response } from 'express';
import { mockProducts, mockCarts } from '../mock/data';

const router = Router();

// Helper to get cart key (from session or user)
const getCartKey = (req: Request): string => {
  const userId = (req as any).user?.id;
  if (userId) return `user:${userId}`;
  
  // Use a session ID from header or generate one
  const sessionId = req.headers['x-session-id'] || 'anonymous';
  return `session:${sessionId}`;
};

// Get cart
router.get('/', (req: Request, res: Response) => {
  const cartKey = getCartKey(req);
  let cart = mockCarts.get(cartKey);
  
  if (!cart) {
    cart = {
      id: cartKey,
      sessionId: cartKey,
      items: [],
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      shippingTotal: 0,
      total: 0,
      itemCount: 0,
    };
    mockCarts.set(cartKey, cart);
  }
  
  res.json({
    success: true,
    data: { cart },
  });
});

// Add item to cart
router.post('/items', (req: Request, res: Response) => {
  const cartKey = getCartKey(req);
  let cart = mockCarts.get(cartKey);
  
  if (!cart) {
    cart = {
      id: cartKey,
      sessionId: cartKey,
      items: [],
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      shippingTotal: 0,
      total: 0,
      itemCount: 0,
    };
  }
  
  const { productId, quantity = 1 } = req.body;
  const product = mockProducts.find(p => p.id === productId);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found',
    });
  }
  
  // Check if item already in cart
  const existingItem = cart.items.find((item: any) => item.productId === productId);
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;
  } else {
    cart.items.push({
      id: `item-${Date.now()}`,
      cartId: cartKey,
      productId: product.id,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        images: product.images,
        stock: product.stock,
        isActive: product.isActive,
      },
      quantity,
      unitPrice: product.price,
      totalPrice: product.price * quantity,
      isUpsell: false,
    });
  }
  
  // Recalculate totals
  cart.subtotal = cart.items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
  cart.taxTotal = cart.subtotal * 0.08; // 8% tax
  cart.shippingTotal = cart.subtotal > 100 ? 0 : 9.99;
  cart.total = cart.subtotal + cart.taxTotal + cart.shippingTotal - cart.discountTotal;
  cart.itemCount = cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  
  mockCarts.set(cartKey, cart);
  
  res.json({
    success: true,
    data: { cart },
  });
});

// Update cart item quantity
router.put('/items/:itemId', (req: Request, res: Response) => {
  const cartKey = getCartKey(req);
  const cart = mockCarts.get(cartKey);
  
  if (!cart) {
    return res.status(404).json({
      success: false,
      error: 'Cart not found',
    });
  }
  
  const { itemId } = req.params;
  const { quantity } = req.body;
  
  const item = cart.items.find((i: any) => i.id === itemId);
  
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Item not found in cart',
    });
  }
  
  if (quantity <= 0) {
    cart.items = cart.items.filter((i: any) => i.id !== itemId);
  } else {
    item.quantity = quantity;
    item.totalPrice = item.unitPrice * quantity;
  }
  
  // Recalculate totals
  cart.subtotal = cart.items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
  cart.taxTotal = cart.subtotal * 0.08;
  cart.shippingTotal = cart.subtotal > 100 ? 0 : 9.99;
  cart.total = cart.subtotal + cart.taxTotal + cart.shippingTotal - cart.discountTotal;
  cart.itemCount = cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  
  mockCarts.set(cartKey, cart);
  
  res.json({
    success: true,
    data: { cart },
  });
});

// Remove item from cart
router.delete('/items/:itemId', (req: Request, res: Response) => {
  const cartKey = getCartKey(req);
  const cart = mockCarts.get(cartKey);
  
  if (!cart) {
    return res.status(404).json({
      success: false,
      error: 'Cart not found',
    });
  }
  
  const { itemId } = req.params;
  cart.items = cart.items.filter((i: any) => i.id !== itemId);
  
  // Recalculate totals
  cart.subtotal = cart.items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
  cart.taxTotal = cart.subtotal * 0.08;
  cart.shippingTotal = cart.subtotal > 100 ? 0 : 9.99;
  cart.total = cart.subtotal + cart.taxTotal + cart.shippingTotal - (cart.discountTotal || 0);
  cart.itemCount = cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  
  mockCarts.set(cartKey, cart);
  
  res.json({
    success: true,
    data: { cart },
  });
});

// Clear cart
router.delete('/', (req: Request, res: Response) => {
  const cartKey = getCartKey(req);
  const cart = {
    id: cartKey,
    sessionId: cartKey,
    items: [],
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    shippingTotal: 0,
    total: 0,
    itemCount: 0,
  };
  mockCarts.set(cartKey, cart);
  
  res.json({
    success: true,
    data: { cart },
  });
});

export default router;


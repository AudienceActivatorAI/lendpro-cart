import type { Product } from './product.js';
import type { WarrantyPlan } from './warranty.js';

export interface Cart {
  id: string;
  userId?: string;
  sessionId: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  itemCount: number;
  couponCode?: string;
  shippingAddress?: ShippingAddress;
  billingAddress?: BillingAddress;
  shippingMethodId?: string;
  financingEligible: boolean;
  notes?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warrantyId?: string;
  warranty?: WarrantyPlan;
  warrantyPrice?: number;
  isUpsell: boolean;
  upsellSource?: 'manual' | 'category' | 'ml';
  attributes?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface BillingAddress extends ShippingAddress {
  email: string;
}

export interface AddToCartInput {
  productId: string;
  quantity: number;
  warrantyId?: string;
  attributes?: Record<string, string>;
  isUpsell?: boolean;
  upsellSource?: 'manual' | 'category' | 'ml';
}

export interface UpdateCartItemInput {
  itemId: string;
  quantity?: number;
  warrantyId?: string | null;
}

export interface ApplyCouponInput {
  code: string;
}

export interface SetShippingAddressInput {
  address: ShippingAddress;
}

export interface SetBillingAddressInput {
  address: BillingAddress;
}

export interface SetShippingMethodInput {
  methodId: string;
}

export interface CartSummary {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  itemCount: number;
  financingAvailable: boolean;
  financingMinimum: number;
}

export interface MergeCartsInput {
  guestCartId: string;
  userCartId: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  carrier: string;
  price: number;
  estimatedDays: number;
  isDefault: boolean;
}

export interface ShippingRate {
  methodId: string;
  method: ShippingMethod;
  price: number;
  estimatedDelivery: string;
}


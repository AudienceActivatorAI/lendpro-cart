import type { ShippingAddress, BillingAddress, CartItem } from './cart.js';
import type { FinancingApproval } from './financing.js';
import type { WarrantyContract } from './warranty.js';

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  email: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  currency: string;
  paymentMethod: PaymentMethod;
  financingPlatformId?: string;
  financingApproval?: FinancingApproval;
  shippingAddress: ShippingAddress;
  billingAddress: BillingAddress;
  shippingMethod: string;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  internalNotes?: string;
  metadata?: Record<string, unknown>;
  cancelledAt?: Date;
  cancelReason?: string;
  refundedAt?: Date;
  refundAmount?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'partially_refunded'
  | 'refunded'
  | 'failed'
  | 'cancelled';

export type FulfillmentStatus = 
  | 'unfulfilled'
  | 'partial'
  | 'fulfilled'
  | 'returned';

export type PaymentMethod = 
  | 'credit_card'
  | 'debit_card'
  | 'apple_pay'
  | 'google_pay'
  | 'ach'
  | 'financing';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productSku: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warrantyId?: string;
  warrantyContract?: WarrantyContract;
  warrantyPrice?: number;
  isUpsell: boolean;
  attributes?: Record<string, string>;
  createdAt: Date;
}

export interface CreateOrderInput {
  cartId: string;
  paymentMethod: PaymentMethod;
  paymentIntentId?: string;
  financingApprovalId?: string;
  notes?: string;
}

export interface UpdateOrderStatusInput {
  orderId: string;
  status: OrderStatus;
  notes?: string;
}

export interface UpdateFulfillmentInput {
  orderId: string;
  status: FulfillmentStatus;
  trackingNumber?: string;
  trackingUrl?: string;
}

export interface CancelOrderInput {
  orderId: string;
  reason: string;
}

export interface RefundOrderInput {
  orderId: string;
  amount?: number;
  reason: string;
  items?: { itemId: string; quantity: number }[];
}

export interface OrderFilter {
  userId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  paymentMethod?: PaymentMethod;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  minTotal?: number;
  maxTotal?: number;
}

export interface OrderSort {
  field: 'createdAt' | 'total' | 'orderNumber';
  order: 'asc' | 'desc';
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OrderSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<OrderStatus, number>;
  ordersByPaymentMethod: Record<PaymentMethod, number>;
}


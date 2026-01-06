export interface PaymentIntent {
  id: string;
  orderId?: string;
  cartId?: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  paymentMethod?: string;
  stripePaymentIntentId?: string;
  clientSecret?: string;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentIntentStatus = 
  | 'created'
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'cancelled'
  | 'failed';

export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  stripePaymentMethodId?: string;
  card?: CardDetails;
  bankAccount?: BankAccountDetails;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentMethodType = 
  | 'card'
  | 'bank_account'
  | 'apple_pay'
  | 'google_pay';

export interface CardDetails {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
  country?: string;
}

export interface BankAccountDetails {
  bankName: string;
  last4: string;
  accountType: 'checking' | 'savings';
  routingNumber?: string;
}

export interface Transaction {
  id: string;
  orderId: string;
  paymentIntentId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  stripeChargeId?: string;
  stripeRefundId?: string;
  paymentMethod?: string;
  cardBrand?: string;
  cardLast4?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionType = 
  | 'charge'
  | 'refund'
  | 'partial_refund'
  | 'chargeback'
  | 'payout';

export type TransactionStatus = 
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'disputed';

export interface Refund {
  id: string;
  orderId: string;
  transactionId: string;
  amount: number;
  reason: RefundReason;
  notes?: string;
  status: RefundStatus;
  stripeRefundId?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type RefundReason = 
  | 'customer_request'
  | 'duplicate'
  | 'fraudulent'
  | 'product_not_received'
  | 'product_unacceptable'
  | 'other';

export type RefundStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export interface CreatePaymentIntentInput {
  cartId: string;
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
}

export interface ConfirmPaymentInput {
  paymentIntentId: string;
  paymentMethodId?: string;
}

export interface SavePaymentMethodInput {
  stripePaymentMethodId: string;
  isDefault?: boolean;
}

export interface ProcessRefundInput {
  orderId: string;
  amount?: number;
  reason: RefundReason;
  notes?: string;
}

export interface PaymentWebhookPayload {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
  livemode: boolean;
  id: string;
}

export interface PaymentAnalytics {
  totalTransactions: number;
  totalRevenue: number;
  averageTransactionValue: number;
  transactionsByMethod: Record<string, number>;
  refundRate: number;
  chargebackRate: number;
  failureRate: number;
  topFailureReasons: { reason: string; count: number }[];
}


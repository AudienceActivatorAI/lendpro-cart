import type { Cart } from './cart.js';

export interface FinancingPlatform {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  type: FinancingPlatformType;
  supportedFinancingTypes: FinancingType[];
  minAmount: number;
  maxAmount: number;
  config: FinancingPlatformConfig;
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export type FinancingPlatformType = 'waterfall' | 'direct';

export type FinancingType = 'bnpl' | 'lease_to_own' | 'installment' | 'revolving_credit';

export interface FinancingPlatformConfig {
  apiUrl: string;
  apiKey?: string;
  merchantId?: string;
  webhookSecret?: string;
  sandboxMode: boolean;
  customSettings?: Record<string, unknown>;
}

export interface FinancingOption {
  platformId: string;
  platform: FinancingPlatform;
  type: FinancingType;
  name: string;
  description: string;
  terms: FinancingTerms;
  prequalified?: boolean;
  estimatedApprovalOdds?: 'high' | 'medium' | 'low';
}

export interface FinancingTerms {
  apr: number;
  numPayments: number;
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly';
  paymentAmount: number;
  totalAmount: number;
  financingFee?: number;
  downPayment?: number;
  firstPaymentDate?: Date;
  promoApr?: number;
  promoEndDate?: Date;
}

export interface FinancingApplication {
  id: string;
  cartId: string;
  cart?: Cart;
  platformId: string;
  platform?: FinancingPlatform;
  userId?: string;
  status: FinancingApplicationStatus;
  applicantInfo: ApplicantInfo;
  cartValue: number;
  externalApplicationId?: string;
  decision?: FinancingDecision;
  approvalId?: string;
  attemptLog: FinancingAttempt[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type FinancingApplicationStatus = 
  | 'pending'
  | 'processing'
  | 'approved'
  | 'declined'
  | 'expired'
  | 'cancelled'
  | 'error';

export interface ApplicantInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  ssn?: string;
  ssnLast4?: string;
  annualIncome?: number;
  employmentStatus?: 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'student';
  employer?: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface FinancingDecision {
  status: 'approved' | 'declined' | 'pending_review';
  approvedAmount?: number;
  terms?: FinancingTerms;
  reason?: string;
  declineReasons?: string[];
  lenderName?: string;
  lenderId?: string;
  expiresAt?: Date;
}

export interface FinancingAttempt {
  platformId: string;
  platformName: string;
  timestamp: Date;
  status: 'approved' | 'declined' | 'error';
  responseTimeMs?: number;
  errorMessage?: string;
}

export interface FinancingApproval {
  id: string;
  applicationId: string;
  platformId: string;
  platform?: FinancingPlatform;
  approvedAmount: number;
  usedAmount?: number;
  terms: FinancingTerms;
  lenderName?: string;
  lenderId?: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  externalApprovalId?: string;
  paymentSchedule?: FinancingPayment[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinancingPayment {
  id: string;
  approvalId: string;
  paymentNumber: number;
  amount: number;
  principal: number;
  interest: number;
  fees?: number;
  dueDate: Date;
  paidAt?: Date;
  status: 'upcoming' | 'due' | 'paid' | 'late' | 'defaulted';
  transactionId?: string;
}

export interface SubmitFinancingApplicationInput {
  cartId: string;
  platformId: string;
  applicantInfo: ApplicantInfo;
}

export interface GetFinancingOptionsInput {
  cartId: string;
  prequalify?: boolean;
}

export interface FinancingWebhookPayload {
  type: string;
  platformId: string;
  applicationId?: string;
  approvalId?: string;
  data: Record<string, unknown>;
  timestamp: Date;
  signature?: string;
}

export interface FinancingAnalytics {
  totalApplications: number;
  approvalRate: number;
  averageApprovedAmount: number;
  applicationsByPlatform: Record<string, number>;
  approvalsByPlatform: Record<string, number>;
  averageProcessingTime: number;
  topDeclineReasons: { reason: string; count: number }[];
}


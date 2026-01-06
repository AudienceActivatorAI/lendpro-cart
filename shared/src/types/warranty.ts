import type { Product } from './product.js';

export interface WarrantyProvider {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  type: 'extend' | 'mulberry' | 'custom';
  config: WarrantyProviderConfig;
  enabled: boolean;
  priority: number;
  supportedCategories?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WarrantyProviderConfig {
  apiUrl: string;
  apiKey?: string;
  storeId?: string;
  webhookSecret?: string;
  sandboxMode: boolean;
  customSettings?: Record<string, unknown>;
}

export interface WarrantyPlan {
  id: string;
  providerId: string;
  provider?: WarrantyProvider;
  productId?: string;
  product?: Product;
  externalPlanId?: string;
  name: string;
  description?: string;
  type: WarrantyType;
  durationMonths: number;
  price: number;
  deductible?: number;
  coverage: WarrantyCoverage[];
  exclusions?: string[];
  terms?: string;
  termsUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type WarrantyType = 
  | 'extended_warranty'
  | 'accidental_damage'
  | 'theft_protection'
  | 'comprehensive';

export interface WarrantyCoverage {
  type: string;
  description: string;
  maxClaims?: number;
  maxClaimAmount?: number;
}

export interface WarrantyContract {
  id: string;
  planId: string;
  plan?: WarrantyPlan;
  providerId: string;
  provider?: WarrantyProvider;
  orderId: string;
  orderItemId: string;
  userId?: string;
  externalContractId?: string;
  productId: string;
  productName: string;
  productPrice: number;
  warrantyPrice: number;
  status: WarrantyContractStatus;
  startDate: Date;
  endDate: Date;
  claimsUsed: number;
  maxClaims?: number;
  cancellationReason?: string;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type WarrantyContractStatus = 
  | 'pending'
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'claimed';

export interface WarrantyClaim {
  id: string;
  contractId: string;
  contract?: WarrantyContract;
  externalClaimId?: string;
  type: string;
  description: string;
  status: WarrantyClaimStatus;
  approvedAmount?: number;
  resolution?: string;
  attachments?: ClaimAttachment[];
  submittedAt: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type WarrantyClaimStatus = 
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'denied'
  | 'completed';

export interface ClaimAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface GetWarrantyPlansInput {
  productId: string;
  productPrice?: number;
  productCategoryId?: string;
}

export interface CreateWarrantyContractInput {
  planId: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  productName: string;
  productPrice: number;
}

export interface FileWarrantyClaimInput {
  contractId: string;
  type: string;
  description: string;
  attachments?: File[];
}

export interface WarrantyWebhookPayload {
  type: string;
  providerId: string;
  contractId?: string;
  claimId?: string;
  data: Record<string, unknown>;
  timestamp: Date;
  signature?: string;
}

export interface WarrantyAnalytics {
  totalContracts: number;
  activeContracts: number;
  attachRate: number;
  totalRevenue: number;
  averagePrice: number;
  contractsByProvider: Record<string, number>;
  claimRate: number;
  topProducts: { productId: string; productName: string; contracts: number }[];
}


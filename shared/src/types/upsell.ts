import type { Product } from './product.js';
import type { WarrantyPlan } from './warranty.js';

export interface UpsellRule {
  id: string;
  name: string;
  description?: string;
  productId?: string;
  product?: Product;
  categoryId?: string;
  ruleType: UpsellRuleType;
  config: UpsellRuleConfig;
  suggestedProducts: UpsellSuggestion[];
  warranty?: UpsellWarrantyConfig;
  priority: number;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  conditions?: UpsellCondition[];
  createdAt: Date;
  updatedAt: Date;
}

export type UpsellRuleType = 
  | 'bundle'
  | 'accessory'
  | 'upgrade'
  | 'warranty'
  | 'cross_sell';

export interface UpsellRuleConfig {
  displayText?: string;
  displayLocation: UpsellDisplayLocation[];
  maxSuggestions: number;
  bundleDiscount?: number;
  bundleDiscountType?: 'percentage' | 'fixed';
  requireAll?: boolean;
  showPriceComparison?: boolean;
}

export type UpsellDisplayLocation = 
  | 'product_page'
  | 'cart_page'
  | 'cart_drawer'
  | 'checkout'
  | 'post_purchase';

export interface UpsellSuggestion {
  productId: string;
  product?: Product;
  sortOrder: number;
  customPrice?: number;
  customText?: string;
}

export interface UpsellWarrantyConfig {
  enabled: boolean;
  providers: string[];
  displayText?: string;
}

export interface UpsellCondition {
  type: 'min_cart_value' | 'min_quantity' | 'has_product' | 'has_category' | 'customer_tag';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number;
}

export interface CategoryUpsellMapping {
  id: string;
  sourceCategoryId: string;
  targetCategoryIds: string[];
  maxSuggestions: number;
  displayText?: string;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductAssociation {
  id: string;
  productAId: string;
  productBId: string;
  confidence: number;
  support: number;
  lift: number;
  coOccurrences: number;
  lastUpdated: Date;
}

export interface UpsellGroup {
  type: 'manual' | 'category' | 'ml';
  priority: number;
  displayText?: string;
  items: UpsellItem[];
}

export interface UpsellItem {
  product: Product;
  reason: string;
  score: number;
  customPrice?: number;
  bundleDiscount?: number;
  warranties?: WarrantyPlan[];
}

export interface UpsellRecommendation {
  productId: string;
  product: Product;
  source: 'manual' | 'category' | 'ml';
  reason: string;
  confidence: number;
  bundleDiscount?: number;
}

export interface GetUpsellsInput {
  productId?: string;
  cartId?: string;
  location: UpsellDisplayLocation;
  limit?: number;
  includeWarranties?: boolean;
}

export interface GetUpsellsResponse {
  groups: UpsellGroup[];
  warranties?: WarrantyPlan[];
  totalItems: number;
}

export interface TrackUpsellInteractionInput {
  productId: string;
  suggestedProductId: string;
  source: 'manual' | 'category' | 'ml';
  action: 'view' | 'click' | 'add_to_cart' | 'purchase';
  location: UpsellDisplayLocation;
  sessionId: string;
  userId?: string;
}

export interface CreateUpsellRuleInput {
  name: string;
  description?: string;
  productId?: string;
  categoryId?: string;
  ruleType: UpsellRuleType;
  config: UpsellRuleConfig;
  suggestedProducts: Omit<UpsellSuggestion, 'product'>[];
  warranty?: UpsellWarrantyConfig;
  priority?: number;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
  conditions?: UpsellCondition[];
}

export interface UpdateUpsellRuleInput extends Partial<CreateUpsellRuleInput> {
  id: string;
}

export interface UpsellAnalytics {
  totalImpressions: number;
  totalClicks: number;
  totalAddToCarts: number;
  totalPurchases: number;
  clickThroughRate: number;
  addToCartRate: number;
  conversionRate: number;
  revenueGenerated: number;
  averageOrderValueLift: number;
  performanceBySource: {
    source: 'manual' | 'category' | 'ml';
    impressions: number;
    conversions: number;
    revenue: number;
  }[];
  topPerformingProducts: {
    productId: string;
    productName: string;
    conversions: number;
    revenue: number;
  }[];
}

export interface MLModelMetrics {
  modelId: string;
  modelType: 'association_rules' | 'collaborative_filtering' | 'content_based';
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastTrainedAt: Date;
  trainingDataSize: number;
  nextScheduledTraining?: Date;
}


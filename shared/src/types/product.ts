export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  sku: string;
  barcode?: string;
  categoryId: string;
  category?: ProductCategory;
  brand?: string;
  attributes: ProductAttributes;
  images: ProductImage[];
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  weight?: number;
  dimensions?: ProductDimensions;
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  parent?: ProductCategory;
  children?: ProductCategory[];
  image?: string;
  attributesSchema: CategoryAttributeSchema[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductAttributes {
  [key: string]: string | number | boolean | string[];
}

export interface CategoryAttributeSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  required: boolean;
  options?: string[];
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'in' | 'cm';
}

export interface ProductFilter {
  categoryId?: string;
  categorySlug?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  search?: string;
  attributes?: Record<string, string | string[]>;
}

export interface ProductSort {
  field: 'name' | 'price' | 'createdAt' | 'stock';
  order: 'asc' | 'desc';
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateProductInput {
  name: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  sku: string;
  barcode?: string;
  categoryId: string;
  brand?: string;
  attributes?: ProductAttributes;
  images?: Omit<ProductImage, 'id'>[];
  stock?: number;
  lowStockThreshold?: number;
  trackInventory?: boolean;
  weight?: number;
  dimensions?: ProductDimensions;
  isActive?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
}


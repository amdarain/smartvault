export type ProductStatus = 'active' | 'archived';

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string;
  categoryId: string | null;
  brand: string | null;
  supplier: string | null;
  costPrice: number | null;
  sellingPrice: number | null;
  quantity: number;
  minStockThreshold: number;
  unit: string;
  location: string | null;
  tags: string[];
  status: ProductStatus;
  primaryPhotoId: string | null;
  photoIds: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductWithStatus extends Product {
  stockStatus: StockStatus;
  totalValue: number | null;
}

export type ProductSortField = 'name' | 'quantity' | 'sellingPrice' | 'updatedAt' | 'createdAt';

import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db';
import type { Product, Category, ProductWithStatus } from '../types/product';
import type { StockStatus } from '../types/product';

// ---- Product CRUD ----

export async function createProduct(
  data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Product> {
  // Check unique SKU
  if (data.sku) {
    const existing = await db.products.where('sku').equals(data.sku).first();
    if (existing && existing.status !== 'archived') {
      throw new Error(`A product with SKU "${data.sku}" already exists.`);
    }
  }

  const now = new Date();
  const product: Product = {
    ...data,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  await db.products.add(product);
  return product;
}

export async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, 'id' | 'createdAt'>>,
): Promise<void> {
  // Check unique SKU (exclude self)
  if (updates.sku) {
    const existing = await db.products.where('sku').equals(updates.sku).first();
    if (existing && existing.id !== id) {
      throw new Error(`A product with SKU "${updates.sku}" already exists.`);
    }
  }
  await db.products.update(id, { ...updates, updatedAt: new Date() });
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return db.products.get(id);
}

export async function getAllProducts(includeArchived = false): Promise<Product[]> {
  if (includeArchived) return db.products.toArray();
  return db.products.where('status').equals('active').toArray();
}

export async function getProductsWithStatus(): Promise<ProductWithStatus[]> {
  const products = await db.products.where('status').equals('active').toArray();
  return products.map((p) => ({
    ...p,
    stockStatus: getStockStatus(p),
    totalValue:
      p.costPrice !== null ? Math.round(p.costPrice * p.quantity * 100) / 100 : null,
  }));
}

export async function archiveProduct(id: string): Promise<void> {
  await db.products.update(id, { status: 'archived', updatedAt: new Date() });
}

export async function restoreProduct(id: string): Promise<void> {
  await db.products.update(id, { status: 'active', updatedAt: new Date() });
}

export async function deleteProduct(id: string): Promise<void> {
  await db.transaction('rw', [db.products, db.stockTransactions], async () => {
    await db.products.delete(id);
    // Keep stock transactions for audit trail but mark product as deleted
  });
}

export async function duplicateProduct(id: string): Promise<Product> {
  const original = await db.products.get(id);
  if (!original) throw new Error(`Product ${id} not found`);
  const now = new Date();
  const duplicate: Product = {
    ...original,
    id: uuidv4(),
    name: `${original.name} (Copy)`,
    sku: null, // Don't copy SKU — it must be unique
    quantity: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.products.add(duplicate);
  return duplicate;
}

export async function countProducts(): Promise<number> {
  return db.products.where('status').equals('active').count();
}

export async function getLowStockProducts(): Promise<Product[]> {
  const active = await db.products.where('status').equals('active').toArray();
  return active.filter((p) => p.quantity > 0 && p.quantity <= p.minStockThreshold);
}

export async function getOutOfStockProducts(): Promise<Product[]> {
  return db.products
    .where('status').equals('active')
    .and((p) => p.quantity <= 0)
    .toArray();
}

export async function getTotalInventoryValue(): Promise<number> {
  const active = await db.products.where('status').equals('active').toArray();
  return active.reduce((sum, p) => {
    if (p.costPrice !== null) return sum + p.costPrice * p.quantity;
    return sum;
  }, 0);
}

export async function attachPhotoToProduct(
  productId: string,
  photoId: string,
  setPrimary = false,
): Promise<void> {
  const product = await db.products.get(productId);
  if (!product) throw new Error(`Product ${productId} not found`);
  const photoIds = [...new Set([...product.photoIds, photoId])];
  const primaryPhotoId = setPrimary ? photoId : (product.primaryPhotoId ?? photoId);
  await db.products.update(productId, { photoIds, primaryPhotoId, updatedAt: new Date() });

  // Also update photo's productIds
  const photo = await db.photos.get(photoId);
  if (photo) {
    const newProductIds = [...new Set([...photo.productIds, productId])];
    await db.photos.update(photoId, { productIds: newProductIds, updatedAt: new Date() });
  }
}

export async function detachPhotoFromProduct(productId: string, photoId: string): Promise<void> {
  const product = await db.products.get(productId);
  if (!product) return;
  const photoIds = product.photoIds.filter((id) => id !== photoId);
  const primaryPhotoId =
    product.primaryPhotoId === photoId ? (photoIds[0] ?? null) : product.primaryPhotoId;
  await db.products.update(productId, { photoIds, primaryPhotoId, updatedAt: new Date() });
}

// ---- Categories ----

export async function createCategory(
  data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Category> {
  const now = new Date();
  const category: Category = { ...data, id: uuidv4(), createdAt: now, updatedAt: now };
  await db.categories.add(category);
  return category;
}

export async function updateCategory(
  id: string,
  updates: Partial<Omit<Category, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.categories.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteCategory(id: string): Promise<void> {
  // Unlink products from this category
  const affected = await db.products.where('categoryId').equals(id).toArray();
  await Promise.all(affected.map((p) => db.products.update(p.id, { categoryId: null })));
  // Unlink photos
  const affectedPhotos = await db.photos.where('categoryId').equals(id).toArray();
  await Promise.all(affectedPhotos.map((p) => db.photos.update(p.id, { categoryId: null })));
  await db.categories.delete(id);
}

export async function getAllCategories(): Promise<Category[]> {
  return db.categories.orderBy('name').toArray();
}

// ---- Internal helpers ----

function getStockStatus(product: Product): StockStatus {
  if (product.quantity <= 0) return 'out_of_stock';
  if (product.quantity <= product.minStockThreshold) return 'low_stock';
  return 'in_stock';
}

import Dexie, { type Table } from 'dexie';
import type { Photo, ImageBlob, Thumbnail, Embedding } from '../types/photo';
import type { Product, Category } from '../types/product';
import type { StockTransaction } from '../types/stock';
import type { SearchHistoryEntry, TagRecord } from '../types/search';

interface SettingsRecord {
  key: string;
  value: unknown;
  updatedAt: Date;
}

export class SmartVaultDB extends Dexie {
  photos!: Table<Photo, string>;
  imageBlobs!: Table<ImageBlob, string>;
  thumbnails!: Table<Thumbnail, string>;
  embeddings!: Table<Embedding, string>;
  categories!: Table<Category, string>;
  tags!: Table<TagRecord, string>;
  products!: Table<Product, string>;
  stockTransactions!: Table<StockTransaction, string>;
  searchHistory!: Table<SearchHistoryEntry, string>;
  settings!: Table<SettingsRecord, string>;

  constructor() {
    super('SmartVaultDB');

    this.version(1).stores({
      // Metadata tables — only indexed fields are listed; all other fields are stored automatically
      photos: 'id, createdAt, updatedAt, isFavorite, isDeleted, categoryId, *tags, embeddingStatus, fileHash',
      imageBlobs: 'id',
      thumbnails: 'id',
      embeddings: 'id, modelVersion, generatedAt',
      categories: 'id, name, parentId',
      tags: 'id, name, usageCount',
      products: 'id, name, sku, barcode, categoryId, status, quantity, updatedAt, createdAt',
      stockTransactions: 'id, productId, createdAt, type',
      searchHistory: 'id, createdAt, query',
      settings: 'key',
    });

    // Handle concurrent tab upgrades gracefully
    this.on('versionchange', () => {
      this.close();
      window.location.reload();
    });

    this.on('blocked', () => {
      console.warn('[DB] Database upgrade blocked by another tab.');
    });
  }
}

// Singleton instance
export const db = new SmartVaultDB();

export default db;

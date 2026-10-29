import type { SearchType } from './search';

export type Theme = 'light' | 'dark' | 'system';
export type GridDensity = 'compact' | 'comfortable' | 'spacious';
export type ThumbnailSize = 'small' | 'medium' | 'large';
export type SortPreference = 'createdAt_desc' | 'createdAt_asc' | 'title_asc' | 'updatedAt_desc';
export type NegativeStockPolicy = 'allow' | 'warn' | 'prevent';

export interface AppSettings {
  // Appearance
  theme: Theme;
  gridDensity: GridDensity;
  thumbnailSize: ThumbnailSize;
  defaultSortOrder: SortPreference;
  compactLayout: boolean;

  // Search
  searchType: SearchType;
  fuzzyTolerance: number; // 0.0 - 0.4
  searchResultsPerPage: number;
  saveSearchHistory: boolean;
  aiConfidenceThreshold: number; // 0.0 - 1.0
  aiModelId: string;
  aiModelStatus: 'not_downloaded' | 'downloading' | 'ready' | 'error';
  aiModelVersion: string | null;
  aiModelSizeBytes: number | null;
  aiModelDownloadedAt: Date | null;

  // Inventory
  currency: string; // e.g. 'USD'
  currencySymbol: string; // e.g. '$'
  defaultUnit: string;
  defaultMinStock: number;
  negativeStockPolicy: NegativeStockPolicy;
  requireUniqueSku: boolean;
  defaultCategoryId: string | null;

  // Storage
  storageWarningThresholdMb: number;

  // App
  appVersion: string;
  firstRunCompleted: boolean;
  installedAt: Date | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  gridDensity: 'comfortable',
  thumbnailSize: 'medium',
  defaultSortOrder: 'createdAt_desc',
  compactLayout: false,

  searchType: 'combined',
  fuzzyTolerance: 0.2,
  searchResultsPerPage: 20,
  saveSearchHistory: true,
  aiConfidenceThreshold: 0.2,
  aiModelId: 'Xenova/clip-vit-base-patch32',
  aiModelStatus: 'not_downloaded',
  aiModelVersion: null,
  aiModelSizeBytes: null,
  aiModelDownloadedAt: null,

  currency: 'USD',
  currencySymbol: '$',
  defaultUnit: 'pcs',
  defaultMinStock: 5,
  negativeStockPolicy: 'prevent',
  requireUniqueSku: true,
  defaultCategoryId: null,

  storageWarningThresholdMb: 500,

  appVersion: '1.0.0',
  firstRunCompleted: false,
  installedAt: null,
};

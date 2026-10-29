export type EmbeddingStatus = 'pending' | 'processing' | 'done' | 'error' | 'unsupported';

export interface Photo {
  id: string;
  title: string;
  caption: string;
  description: string;
  tags: string[];
  categoryId: string | null;
  productIds: string[];
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt: Date | null;
  fileHash: string;
  pHash: string | null;
  mimeType: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  embeddingModelVersion: string | null;
  embeddingStatus: EmbeddingStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImageBlob {
  id: string; // same as photoId
  blob: Blob;
}

export interface Thumbnail {
  id: string; // same as photoId
  blob: Blob;
}

export interface Embedding {
  id: string; // same as photoId
  vector: Float32Array;
  modelVersion: string;
  generatedAt: Date;
}

export interface PhotoWithThumbnail extends Photo {
  thumbnailUrl?: string;
}

export type SortField = 'createdAt' | 'updatedAt' | 'title' | 'fileSizeBytes';
export type SortOrder = 'asc' | 'desc';

export interface PhotoFilter {
  categoryId?: string | null;
  tags?: string[];
  isFavorite?: boolean;
  hasProduct?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  isDeleted?: boolean;
}

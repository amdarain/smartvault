import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db';
import type { Photo, PhotoFilter } from '../types/photo';
import { sha256, perceptualHash } from '../utils/hash';
import { generateThumbnail, getImageDimensions, isAcceptedImageType, MAX_UPLOAD_SIZE_BYTES } from '../utils/image';

export interface ImportResult {
  photo: Photo;
  isDuplicate: boolean;
  duplicateOf: string | null;
}

export interface ImportError {
  fileName: string;
  reason: string;
}

export interface BulkImportResult {
  imported: ImportResult[];
  errors: ImportError[];
  skipped: number;
}

/**
 * Imports a single image file into the database.
 * Generates thumbnail, computes hashes, checks for duplicates.
 * Does NOT save to DB — returns the Photo record for caller to handle.
 */
export async function preparePhotoImport(
  file: File,
  onProgress?: (step: string) => void,
): Promise<{ photo: Photo; blob: Blob; thumbnail: Blob; isDuplicate: boolean; duplicateOf: string | null }> {
  if (!isAcceptedImageType(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB (max 50 MB)`);
  }

  onProgress?.('Computing file hash...');
  const fileHash = await sha256(file);

  // Check for exact SHA-256 duplicate
  const existingByHash = await db.photos.where('fileHash').equals(fileHash).filter(p => !p.isDeleted).first();
  const isDuplicate = !!existingByHash;
  const duplicateOf = existingByHash?.id ?? null;

  onProgress?.('Reading image dimensions...');
  const { width, height } = await getImageDimensions(file);

  onProgress?.('Generating thumbnail...');
  const thumbnail = await generateThumbnail(file, 400);

  onProgress?.('Computing perceptual hash...');
  let pHash: string | null = null;
  try {
    pHash = await perceptualHash(file);
  } catch {
    // Non-fatal — perceptual hash is optional
  }

  const now = new Date();
  const photo: Photo = {
    id: uuidv4(),
    title: file.name.replace(/\.[^/.]+$/, ''),
    caption: '',
    description: '',
    tags: [],
    categoryId: null,
    productIds: [],
    isFavorite: false,
    isDeleted: false,
    deletedAt: null,
    fileHash,
    pHash,
    mimeType: file.type,
    width,
    height,
    fileSizeBytes: file.size,
    embeddingModelVersion: null,
    embeddingStatus: 'pending',
    notes: '',
    createdAt: now,
    updatedAt: now,
  };

  return { photo, blob: file, thumbnail, isDuplicate, duplicateOf };
}

/**
 * Saves a prepared photo (and its blobs) to the database atomically.
 */
export async function savePhoto(
  photo: Photo,
  blob: Blob,
  thumbnail: Blob,
): Promise<void> {
  await db.transaction('rw', [db.photos, db.imageBlobs, db.thumbnails], async () => {
    await db.photos.add(photo);
    await db.imageBlobs.add({ id: photo.id, blob });
    await db.thumbnails.add({ id: photo.id, blob: thumbnail });
  });

  // Update tag usage counts
  if (photo.tags.length > 0) {
    await updateTagUsage(photo.tags, 1);
  }
}

/**
 * Updates photo metadata (does NOT touch the original blob).
 */
export async function updatePhotoMetadata(
  id: string,
  updates: Partial<Pick<Photo, 'title' | 'caption' | 'description' | 'tags' | 'categoryId' | 'notes' | 'isFavorite'>>,
): Promise<void> {
  const existing = await db.photos.get(id);
  if (!existing) throw new Error(`Photo ${id} not found`);

  // Track tag changes
  const removedTags = existing.tags.filter((t) => !updates.tags?.includes(t));
  const addedTags = (updates.tags ?? []).filter((t) => !existing.tags.includes(t));

  await db.photos.update(id, { ...updates, updatedAt: new Date() });

  if (removedTags.length > 0) await updateTagUsage(removedTags, -1);
  if (addedTags.length > 0) await updateTagUsage(addedTags, 1);
}

/**
 * Soft-deletes a photo (moves to trash).
 */
export async function softDeletePhoto(id: string): Promise<void> {
  await db.photos.update(id, {
    isDeleted: true,
    deletedAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Soft-deletes multiple photos.
 */
export async function softDeletePhotos(ids: string[]): Promise<void> {
  const now = new Date();
  await db.photos.bulkUpdate(ids.map((id) => ({
    key: id,
    changes: { isDeleted: true, deletedAt: now, updatedAt: now },
  })));
}

/**
 * Restores a soft-deleted photo.
 */
export async function restorePhoto(id: string): Promise<void> {
  await db.photos.update(id, {
    isDeleted: false,
    deletedAt: null,
    updatedAt: new Date(),
  });
}

/**
 * Permanently deletes a photo and all associated blobs.
 */
export async function permanentlyDeletePhoto(id: string): Promise<void> {
  await db.transaction('rw', [db.photos, db.imageBlobs, db.thumbnails, db.embeddings], async () => {
    const photo = await db.photos.get(id);
    if (photo?.tags.length) await updateTagUsage(photo.tags, -1);
    await db.photos.delete(id);
    await db.imageBlobs.delete(id);
    await db.thumbnails.delete(id);
    await db.embeddings.delete(id);
  });
}

/**
 * Permanently deletes all photos in the trash older than cutoffDate.
 */
export async function emptyTrash(cutoffDate?: Date): Promise<number> {
  const trashed = await db.photos.where('isDeleted').equals(1).toArray();
  const toDelete = cutoffDate
    ? trashed.filter((p) => p.deletedAt && new Date(p.deletedAt) < cutoffDate)
    : trashed;

  await Promise.all(toDelete.map((p) => permanentlyDeletePhoto(p.id)));
  return toDelete.length;
}

/**
 * Toggles favorite status of a photo.
 */
export async function toggleFavorite(id: string): Promise<boolean> {
  const photo = await db.photos.get(id);
  if (!photo) throw new Error(`Photo ${id} not found`);
  const newValue = !photo.isFavorite;
  await db.photos.update(id, { isFavorite: newValue, updatedAt: new Date() });
  return newValue;
}

/**
 * Returns photos matching a filter, sorted by the given field.
 */
export async function getPhotos(
  filter: PhotoFilter = {},
  sortField: keyof Photo = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
  limit = 100,
  offset = 0,
): Promise<Photo[]> {
  let collection = db.photos.orderBy(sortField);

  if (sortOrder === 'desc') collection = collection.reverse();

  const results = await collection
    .filter((photo) => {
      if (filter.isDeleted !== undefined && photo.isDeleted !== filter.isDeleted) return false;
      else if (filter.isDeleted === undefined && photo.isDeleted) return false;

      if (filter.isFavorite !== undefined && photo.isFavorite !== filter.isFavorite) return false;
      if (filter.categoryId !== undefined && photo.categoryId !== filter.categoryId) return false;
      if (filter.tags?.length && !filter.tags.every((t) => photo.tags.includes(t))) return false;
      if (filter.hasProduct !== undefined) {
        const has = photo.productIds.length > 0;
        if (has !== filter.hasProduct) return false;
      }
      if (filter.dateFrom && new Date(photo.createdAt) < filter.dateFrom) return false;
      if (filter.dateTo && new Date(photo.createdAt) > filter.dateTo) return false;
      return true;
    })
    .offset(offset)
    .limit(limit)
    .toArray();

  return results;
}

/**
 * Counts all non-deleted photos.
 */
export async function countPhotos(): Promise<number> {
  return db.photos.where('isDeleted').equals(0).count();
}

/**
 * Gets the original image blob for a photo.
 */
export async function getPhotoBlob(id: string): Promise<Blob | null> {
  const record = await db.imageBlobs.get(id);
  return record?.blob ?? null;
}

/**
 * Gets the thumbnail blob for a photo.
 */
export async function getThumbnailBlob(id: string): Promise<Blob | null> {
  const record = await db.thumbnails.get(id);
  return record?.blob ?? null;
}

// ---- Internal helpers ----

async function updateTagUsage(tags: string[], delta: number): Promise<void> {
  for (const name of tags) {
    const existing = await db.tags.where('name').equals(name).first();
    if (existing) {
      const newCount = Math.max(0, existing.usageCount + delta);
      if (newCount === 0) {
        await db.tags.delete(existing.id);
      } else {
        await db.tags.update(existing.id, { usageCount: newCount });
      }
    } else if (delta > 0) {
      await db.tags.add({ id: uuidv4(), name, usageCount: delta });
    }
  }
}

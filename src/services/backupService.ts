import JSZip from 'jszip';
import { db } from '../db/db';
import { serializeCsv, productToRow } from '../utils/csv';

export interface BackupManifest {
  version: '1.0';
  schemaVersion: 1;
  createdAt: string;
  appVersion: string;
  counts: {
    photos: number;
    products: number;
    categories: number;
    stockTransactions: number;
    settings: number;
    searchHistory: number;
  };
  includesImages: boolean;
}

export interface RestorePreview {
  manifest: BackupManifest;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Creates a full backup ZIP containing all data and original image blobs.
 * Calls onProgress with 0-100 completion percentage.
 */
export async function createFullBackup(
  onProgress?: (pct: number, message: string) => void,
  includeSearchHistory = true,
): Promise<Blob> {
  const zip = new JSZip();

  onProgress?.(0, 'Reading database...');

  const [photos, imageBlobs, products, categories, transactions, settings, history] =
    await Promise.all([
      db.photos.toArray(),
      db.imageBlobs.toArray(),
      db.products.toArray(),
      db.categories.toArray(),
      db.stockTransactions.toArray(),
      db.settings.toArray(),
      includeSearchHistory ? db.searchHistory.toArray() : Promise.resolve([]),
    ]);

  onProgress?.(10, 'Building manifest...');

  const manifest: BackupManifest = {
    version: '1.0',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    appVersion: '1.0.0',
    counts: {
      photos: photos.length,
      products: products.length,
      categories: categories.length,
      stockTransactions: transactions.length,
      settings: settings.length,
      searchHistory: history.length,
    },
    includesImages: true,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  onProgress?.(15, 'Saving photo metadata...');
  zip.file('photos/metadata.json', JSON.stringify(photos, null, 2));

  onProgress?.(20, 'Saving image files...');
  const blobFolder = zip.folder('photos/blobs')!;

  for (let i = 0; i < imageBlobs.length; i++) {
    const { id, blob } = imageBlobs[i];
    const photo = photos.find((p) => p.id === id);
    const ext = photo ? photo.mimeType.split('/')[1] || 'jpg' : 'jpg';
    blobFolder.file(`${id}.${ext}`, blob);

    if (i % 10 === 0) {
      const pct = 20 + Math.floor((i / imageBlobs.length) * 50);
      onProgress?.(pct, `Saving image ${i + 1} of ${imageBlobs.length}...`);
    }
  }

  onProgress?.(70, 'Saving products...');
  zip.file('products.json', JSON.stringify(products, null, 2));

  onProgress?.(75, 'Saving categories...');
  zip.file('categories.json', JSON.stringify(categories, null, 2));

  onProgress?.(80, 'Saving stock transactions...');
  zip.file('stock_transactions.json', JSON.stringify(transactions, null, 2));

  onProgress?.(85, 'Saving settings...');
  zip.file('settings.json', JSON.stringify(settings, null, 2));

  if (includeSearchHistory && history.length > 0) {
    zip.file('search_history.json', JSON.stringify(history, null, 2));
  }

  onProgress?.(90, 'Compressing archive...');

  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } },
    (meta) => {
      onProgress?.(90 + Math.floor(meta.percent / 10), 'Compressing...');
    },
  );

  onProgress?.(100, 'Backup complete.');
  return blob;
}

/**
 * Validates and previews a backup ZIP file.
 */
export async function previewBackup(file: File): Promise<RestorePreview> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    return { manifest: {} as BackupManifest, valid: false, errors: ['Invalid ZIP file.'], warnings };
  }

  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    return { manifest: {} as BackupManifest, valid: false, errors: ['manifest.json missing.'], warnings };
  }

  let manifest: BackupManifest;
  try {
    const text = await manifestFile.async('text');
    manifest = JSON.parse(text);
  } catch {
    return { manifest: {} as BackupManifest, valid: false, errors: ['manifest.json is not valid JSON.'], warnings };
  }

  if (manifest.version !== '1.0') {
    errors.push(`Unsupported backup version: ${manifest.version}`);
  }
  if (manifest.schemaVersion > 1) {
    warnings.push(`Backup schema version ${manifest.schemaVersion} is newer than this app.`);
  }
  if (!zip.file('photos/metadata.json')) {
    warnings.push('Photo metadata file missing — photos will not be restored.');
  }
  if (!zip.file('products.json')) {
    warnings.push('Products file missing — products will not be restored.');
  }

  return { manifest, valid: errors.length === 0, errors, warnings };
}

/**
 * Restores from a backup ZIP.
 * mode 'merge': adds records, skips conflicting IDs.
 * mode 'replace': clears relevant tables first.
 */
export async function restoreFromBackup(
  file: File,
  mode: 'merge' | 'replace',
  onProgress?: (pct: number, message: string) => void,
): Promise<{ restored: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let restored = 0;
  let skipped = 0;

  onProgress?.(0, 'Loading archive...');
  const zip = await JSZip.loadAsync(file);

  if (mode === 'replace') {
    onProgress?.(5, 'Clearing existing data...');
    await db.transaction('rw', [
      db.photos, db.imageBlobs, db.thumbnails, db.embeddings,
      db.products, db.categories, db.stockTransactions, db.tags,
    ], async () => {
      await Promise.all([
        db.photos.clear(),
        db.imageBlobs.clear(),
        db.thumbnails.clear(),
        db.embeddings.clear(),
        db.products.clear(),
        db.categories.clear(),
        db.stockTransactions.clear(),
        db.tags.clear(),
      ]);
    });
  }

  // Restore categories
  const catFile = zip.file('categories.json');
  if (catFile) {
    onProgress?.(10, 'Restoring categories...');
    const categories = JSON.parse(await catFile.async('text'));
    for (const cat of categories) {
      try {
        await db.categories.put({
          ...cat,
          createdAt: new Date(cat.createdAt),
          updatedAt: new Date(cat.updatedAt),
        });
        restored++;
      } catch {
        skipped++;
      }
    }
  }

  // Restore products
  const prodFile = zip.file('products.json');
  if (prodFile) {
    onProgress?.(20, 'Restoring products...');
    const products = JSON.parse(await prodFile.async('text'));
    for (const p of products) {
      try {
        await db.products.put({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        });
        restored++;
      } catch {
        skipped++;
      }
    }
  }

  // Restore transactions
  const txFile = zip.file('stock_transactions.json');
  if (txFile) {
    onProgress?.(30, 'Restoring stock transactions...');
    const transactions = JSON.parse(await txFile.async('text'));
    for (const t of transactions) {
      try {
        await db.stockTransactions.put({
          ...t,
          createdAt: new Date(t.createdAt),
        });
        restored++;
      } catch {
        skipped++;
      }
    }
  }

  // Restore photos
  const metaFile = zip.file('photos/metadata.json');
  if (metaFile) {
    onProgress?.(40, 'Restoring photo metadata...');
    const photos = JSON.parse(await metaFile.async('text'));
    const blobFiles = zip.folder('photos/blobs');

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        await db.photos.put({
          ...photo,
          createdAt: new Date(photo.createdAt),
          updatedAt: new Date(photo.updatedAt),
          deletedAt: photo.deletedAt ? new Date(photo.deletedAt) : null,
        });

        // Restore image blob
        if (blobFiles) {
          const ext = photo.mimeType?.split('/')[1] || 'jpg';
          const blobFile = blobFiles.file(`${photo.id}.${ext}`);
          if (blobFile) {
            const blob = await blobFile.async('blob');
            await db.imageBlobs.put({ id: photo.id, blob });
          }
        }
        restored++;
      } catch (e) {
        errors.push(`Photo ${photo.id}: ${e}`);
        skipped++;
      }

      if (i % 5 === 0) {
        const pct = 40 + Math.floor((i / photos.length) * 50);
        onProgress?.(pct, `Restoring photo ${i + 1} of ${photos.length}...`);
      }
    }
  }

  onProgress?.(100, 'Restore complete.');
  return { restored, skipped, errors };
}

/**
 * Exports products as a CSV blob.
 */
export async function exportProductsCsv(): Promise<Blob> {
  const products = await db.products.toArray();
  const rows = products.map(productToRow);
  const csv = serializeCsv(rows);
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Exports stock transactions as a CSV blob.
 */
export async function exportTransactionsCsv(): Promise<Blob> {
  const transactions = await db.stockTransactions.orderBy('createdAt').reverse().toArray();
  const csv = serializeCsv(
    transactions.map((t) => ({
      id: t.id,
      product_id: t.productId,
      type: t.type,
      quantity_change: t.quantityChange,
      previous_quantity: t.previousQuantity,
      resulting_quantity: t.resultingQuantity,
      reason: t.reason ?? '',
      note: t.note ?? '',
      created_at: t.createdAt,
    })),
  );
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Triggers a browser file download.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

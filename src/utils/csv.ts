import Papa from 'papaparse';
import type { Product } from '../types/product';

export interface CsvRow {
  [key: string]: string;
}

/**
 * Parses a CSV string or File into an array of row objects.
 */
export function parseCsv(input: string | File): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(input as any, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (result: any) => {
        if (result.errors && result.errors.length > 0) {
          const critical = result.errors.filter((e: any) => e.type === 'Delimiter');
          if (critical.length > 0) {
            reject(new Error(`CSV parse error: ${critical[0].message}`));
            return;
          }
        }
        resolve(result.data as CsvRow[]);
      },
      error: (err: any) => reject(err),
    } as any);
  });
}

/**
 * Serializes an array of objects to a CSV string.
 */
export function serializeCsv(data: Record<string, unknown>[]): string {
  return Papa.unparse(data);
}

/** Expected CSV headers for product import */
export const PRODUCT_CSV_HEADERS = [
  'name',
  'sku',
  'barcode',
  'description',
  'brand',
  'supplier',
  'cost_price',
  'selling_price',
  'quantity',
  'min_stock_threshold',
  'unit',
  'location',
  'tags',
  'category',
  'status',
];

/**
 * Converts a Product to a CSV-compatible flat record.
 */
export function productToRow(p: Product): Record<string, string> {
  return {
    name: p.name,
    sku: p.sku ?? '',
    barcode: p.barcode ?? '',
    description: p.description,
    brand: p.brand ?? '',
    supplier: p.supplier ?? '',
    cost_price: p.costPrice !== null ? String(p.costPrice) : '',
    selling_price: p.sellingPrice !== null ? String(p.sellingPrice) : '',
    quantity: String(p.quantity),
    min_stock_threshold: String(p.minStockThreshold),
    unit: p.unit,
    location: p.location ?? '',
    tags: p.tags.join(', '),
    status: p.status,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

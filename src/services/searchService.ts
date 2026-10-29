import MiniSearch, { type SearchResult as MiniSearchResult } from 'minisearch';
import Fuse from 'fuse.js';
import { db } from '../db/db';
import type { Photo } from '../types/photo';
import type { Product } from '../types/product';
import type { SearchResult, SearchHistoryEntry } from '../types/search';
import { v4 as uuidv4 } from 'uuid';

interface SearchDocument {
  id: string;
  type: 'photo' | 'product';
  title: string;
  caption: string;
  description: string;
  tags: string;
  notes: string;
  sku: string;
  category: string;
}

let miniSearchIndex: MiniSearch<SearchDocument> | null = null;
let indexedCount = 0;

function createIndex(): MiniSearch<SearchDocument> {
  return new MiniSearch<SearchDocument>({
    fields: ['title', 'caption', 'description', 'tags', 'notes', 'sku', 'category'],
    storeFields: ['type', 'title', 'caption'],
    searchOptions: {
      boost: { title: 10, caption: 8, tags: 6, sku: 9, description: 4, notes: 2, category: 3 },
      fuzzy: 0.2,
      prefix: true,
    },
    tokenize: (text) =>
      text
        .toLowerCase()
        .split(/[\s,;|/\\()\[\]{}<>\"'`~!@#$%^&*=+]+/)
        .filter((t) => t.length > 0),
  });
}

/**
 * Builds or rebuilds the in-memory MiniSearch index from the database.
 */
export async function buildSearchIndex(): Promise<void> {
  const [photos, products, categories] = await Promise.all([
    db.photos.where('isDeleted').equals(0).toArray(),
    db.products.where('status').equals('active').toArray(),
    db.categories.toArray(),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const docs: SearchDocument[] = [];

  for (const photo of photos) {
    docs.push({
      id: photo.id,
      type: 'photo',
      title: photo.title,
      caption: photo.caption,
      description: photo.description,
      tags: photo.tags.join(' '),
      notes: photo.notes,
      sku: '',
      category: photo.categoryId ? (categoryMap.get(photo.categoryId) ?? '') : '',
    });
  }

  for (const product of products) {
    docs.push({
      id: product.id,
      type: 'product',
      title: product.name,
      caption: product.description,
      description: product.brand ?? '',
      tags: product.tags.join(' '),
      notes: product.notes,
      sku: [product.sku, product.barcode].filter(Boolean).join(' '),
      category: product.categoryId ? (categoryMap.get(product.categoryId) ?? '') : '',
    });
  }

  const index = createIndex();
  index.addAll(docs);
  miniSearchIndex = index;
  indexedCount = docs.length;
}

/**
 * Gets the current index stats.
 */
export function getIndexStats(): { indexed: number; ready: boolean } {
  return { indexed: indexedCount, ready: miniSearchIndex !== null };
}

/**
 * Performs a text search. Rebuilds index if not ready.
 * Returns SearchResult array sorted by relevance.
 */
export async function textSearch(
  query: string,
  limit = 50,
  fuzzyTolerance = 0.2,
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  if (!miniSearchIndex) await buildSearchIndex();
  if (!miniSearchIndex) return [];

  const miniResults: MiniSearchResult[] = miniSearchIndex.search(query, {
    fuzzy: fuzzyTolerance,
    prefix: true,
    boost: { title: 10, caption: 8, tags: 6, sku: 9, description: 4, notes: 2, category: 3 },
  });

  // Normalize scores to 0-1
  const maxScore = miniResults[0]?.score ?? 1;

  return miniResults.slice(0, limit).map((r) => ({
    id: r.id,
    type: r.type as 'photo' | 'product',
    score: r.score / maxScore,
    textScore: r.score / maxScore,
    visualScore: 0,
    matchedFields: r.match ? Object.keys(r.match) : [],
    highlights: {},
  }));
}

/**
 * Fuzzy search using Fuse.js as a fallback for very short queries or high typo tolerance.
 * Used for search suggestions.
 */
export async function getSuggestions(partial: string, limit = 8): Promise<string[]> {
  if (!partial.trim() || partial.length < 2) return [];

  const tags = await db.tags.orderBy('usageCount').reverse().limit(200).toArray();
  const fuse = new Fuse(tags.map((t) => t.name), {
    threshold: 0.4,
    distance: 100,
  });

  return fuse
    .search(partial)
    .slice(0, limit)
    .map((r) => r.item);
}

/**
 * Combines text and visual search results.
 * textResults and visualResults are arrays of {id, score} sorted by score desc.
 */
export function combineResults(
  textResults: SearchResult[],
  visualResults: Array<{ id: string; score: number }>,
  textWeight = 0.6,
  visualWeight = 0.4,
): SearchResult[] {
  const combined = new Map<string, SearchResult>();

  for (const r of textResults) {
    combined.set(r.id, { ...r, score: r.textScore * textWeight });
  }

  for (const v of visualResults) {
    const existing = combined.get(v.id);
    const visualScore = v.score;
    if (existing) {
      combined.set(v.id, {
        ...existing,
        visualScore,
        score: existing.textScore * textWeight + visualScore * visualWeight,
      });
    } else {
      combined.set(v.id, {
        id: v.id,
        type: 'photo',
        score: visualScore * visualWeight,
        textScore: 0,
        visualScore,
        matchedFields: ['visual'],
        highlights: {},
      });
    }
  }

  return Array.from(combined.values()).sort((a, b) => b.score - a.score);
}

// ---- Search history ----

export async function addSearchHistory(
  query: string,
  searchType: 'text' | 'visual' | 'combined',
  resultCount: number,
): Promise<void> {
  if (!query.trim()) return;

  // Remove duplicate query entry if exists
  const existing = await db.searchHistory.where('query').equals(query).first();
  if (existing) await db.searchHistory.delete(existing.id);

  await db.searchHistory.add({
    id: uuidv4(),
    query: query.trim(),
    searchType,
    resultCount,
    createdAt: new Date(),
  });

  // Keep only 100 most recent entries
  const all = await db.searchHistory.orderBy('createdAt').reverse().toArray();
  if (all.length > 100) {
    const toDelete = all.slice(100).map((h) => h.id);
    await db.searchHistory.bulkDelete(toDelete);
  }
}

export async function getSearchHistory(limit = 20): Promise<SearchHistoryEntry[]> {
  return db.searchHistory.orderBy('createdAt').reverse().limit(limit).toArray();
}

export async function clearSearchHistory(): Promise<void> {
  await db.searchHistory.clear();
}

export async function deleteSearchHistoryEntry(id: string): Promise<void> {
  await db.searchHistory.delete(id);
}

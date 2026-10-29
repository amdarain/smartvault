import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  Image as ImageIcon,
  Package,
  History,
  X,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import {
  textSearch,
  addSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  deleteSearchHistoryEntry,
  combineResults,
} from '../services/searchService';
import { aiService } from '../services/aiService';
import { db } from '../db/db';
import { topKSimilar } from '../utils/cosine';
import { highlightMatches, formatCurrency } from '../utils/format';
import { useSettingsStore } from '../store/settingsStore';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner, EmptyState } from '../components/ui/Spinner';
import type { SearchResult, SearchHistoryEntry, SearchType } from '../types/search';
import type { Photo } from '../types/photo';
import type { Product } from '../types/product';
import PhotoViewer from '../components/photos/PhotoViewer';

export const SmartSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings } = useSettingsStore();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState<SearchType>(
    (searchParams.get('type') as SearchType) || settings.searchType || 'combined'
  );
  const [filterType, setFilterType] = useState<'all' | 'photo' | 'product'>('all');

  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Entities lookup cache
  const [photoCache, setPhotoCache] = useState<Map<string, Photo>>(new Map());
  const [productCache, setProductCache] = useState<Map<string, Product>>(new Map());

  // Modal
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load search history
  const refreshHistory = useCallback(async () => {
    const list = await getSearchHistory(8);
    setHistory(list);
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  // Execute search
  const performSearch = useCallback(
    async (searchQuery: string, currentType: SearchType) => {
      const q = searchQuery.trim();
      if (!q) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        let textRes: SearchResult[] = [];
        let visualRes: { id: string; score: number }[] = [];

        // 1. Run Text Search
        if (currentType === 'text' || currentType === 'combined') {
          textRes = await textSearch(q, 60, settings.fuzzyTolerance);
        }

        // 2. Run Visual Search (if AI ready and selected)
        if (
          (currentType === 'visual' || currentType === 'combined') &&
          aiService.isReady
        ) {
          try {
            const queryVector = await aiService.embedText('query', q);
            const allEmbeddings = await db.embeddings.toArray();
            if (allEmbeddings.length > 0) {
              visualRes = topKSimilar(
                queryVector,
                allEmbeddings,
                50,
                settings.aiConfidenceThreshold
              );
            }
          } catch (aiErr) {
            console.warn('[SmartSearch] AI visual query error:', aiErr);
          }
        }

        // 3. Combine or pick
        let finalResults: SearchResult[] = [];
        if (currentType === 'combined') {
          finalResults = combineResults(textRes, visualRes, 0.6, 0.4);
        } else if (currentType === 'visual') {
          finalResults = visualRes.map((v) => ({
            id: v.id,
            type: 'photo',
            score: v.score,
            textScore: 0,
            visualScore: v.score,
            matchedFields: ['visual_similarity'],
            highlights: {},
          }));
        } else {
          finalResults = textRes;
        }

        setResults(finalResults);

        // Fetch missing photo/product entities
        const photoIds = finalResults.filter((r) => r.type === 'photo').map((r) => r.id);
        const productIds = finalResults.filter((r) => r.type === 'product').map((r) => r.id);

        if (photoIds.length > 0) {
          const loadedPhotos = await db.photos.where('id').anyOf(photoIds).toArray();
          setPhotoCache((prev) => {
            const next = new Map(prev);
            loadedPhotos.forEach((p: Photo) => next.set(p.id, p));
            return next;
          });
        }

        if (productIds.length > 0) {
          const loadedProducts = await db.products.where('id').anyOf(productIds).toArray();
          setProductCache((prev) => {
            const next = new Map(prev);
            loadedProducts.forEach((p: Product) => next.set(p.id, p));
            return next;
          });
        }

        // Record search in history if settings allow
        if (settings.saveSearchHistory && q.length >= 2) {
          await addSearchHistory(q, currentType, finalResults.length);
          refreshHistory();
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [
      settings.fuzzyTolerance,
      settings.aiConfidenceThreshold,
      settings.saveSearchHistory,
      refreshHistory,
    ]
  );

  // Debounced input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(val, searchType);
      const params = new URLSearchParams();
      if (val) params.set('q', val);
      params.set('type', searchType);
      setSearchParams(params, { replace: true });
    }, 250);
  };

  const handleTypeChange = (type: SearchType) => {
    setSearchType(type);
    performSearch(query, type);
    const params = new URLSearchParams(searchParams);
    params.set('type', type);
    setSearchParams(params, { replace: true });
  };

  const handleSelectHistory = (h: SearchHistoryEntry) => {
    setQuery(h.query);
    setSearchType(h.searchType);
    performSearch(h.query, h.searchType);
  };

  const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteSearchHistoryEntry(id);
    refreshHistory();
  };

  const filteredResults = results.filter((r) => {
    if (filterType === 'all') return true;
    return r.type === filterType;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Smart Search
          <Sparkles className="w-5 h-5 text-emerald-500" />
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Deep offline search across photos, captions, SKU, notes, and visual embeddings.
        </p>
      </div>

      {/* Main Search Bar Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder='Search "charger", "laptop", "red bottle", SKU, tags...'
            autoFocus
            className="w-full pl-12 pr-10 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-base outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 3-Pill Toggle & Filter Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700">
            {(['text', 'visual', 'combined'] as SearchType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  searchType === t
                    ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {t === 'visual' ? (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Visual AI
                  </span>
                ) : (
                  t
                )}
              </button>
            ))}
          </div>

          {/* AI Status / Warning */}
          {searchType !== 'text' && (
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  aiService.isReady ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
              <span className="text-gray-500 dark:text-gray-400">
                {aiService.isReady
                  ? 'On-device CLIP AI active'
                  : 'AI model not downloaded. Text search active.'}
              </span>
              {!aiService.isReady && (
                <button
                  onClick={() => navigate('/settings')}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  Configure
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recent Search Chips (if query is empty) */}
        {!query && history.length > 0 && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <History className="w-3.5 h-3.5" /> Recent Searches
              </span>
              <button
                onClick={async () => {
                  await clearSearchHistory();
                  refreshHistory();
                }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleSelectHistory(h)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 border border-transparent transition-all"
                >
                  <span>{h.query}</span>
                  <span
                    onClick={(e) => handleDeleteHistory(e, h.id)}
                    className="hover:text-red-500 ml-0.5 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Header and Type Filter */}
      {query && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {filteredResults.length} {filteredResults.length === 1 ? 'match' : 'matches'} for "{query}"
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {(['all', 'photo', 'product'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterType(filter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                  filterType === filter
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter === 'all' ? 'All Results' : `${filter}s`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      {isSearching ? (
        <div className="py-16 text-center">
          <Spinner size="lg" className="text-emerald-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Searching your offline vault...</p>
        </div>
      ) : query && filteredResults.length === 0 ? (
        <EmptyState
          icon={<Search className="w-12 h-12" />}
          title={`No results found for "${query}"`}
          description="Check for typos, try broader terms, or download the AI model for semantic visual understanding."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredResults.map((r) => {
            if (r.type === 'photo') {
              const photo = photoCache.get(r.id);
              if (!photo) return null;
              return (
                <div
                  key={r.id}
                  onClick={() => setViewingPhoto(photo)}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col"
                >
                  <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                    <SearchPhotoThumb photoId={photo.id} />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-black/60 backdrop-blur-sm text-white">
                        Photo
                      </span>
                    </div>
                    {r.visualScore > 0 && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-600 text-white flex items-center gap-1 shadow">
                          <Sparkles className="w-3 h-3" />
                          {Math.round(r.score * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 line-clamp-1">
                        {photo.title || 'Untitled'}
                      </p>
                      {photo.caption && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {photo.caption}
                        </p>
                      )}
                    </div>
                    {photo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {photo.tags.slice(0, 3).map((t: string) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-600 dark:text-gray-400"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            } else {
              // Product
              const product = productCache.get(r.id);
              if (!product) return null;
              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`/products?view=${product.id}`)}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                        Product
                      </span>
                      {product.sku && (
                        <span className="font-mono text-xs text-gray-400">
                          {product.sku}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                        {product.name}
                      </h4>
                      {product.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Stock: {product.quantity} {product.unit}
                    </span>
                    {product.sellingPrice !== null && (
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(
                          product.sellingPrice,
                          settings.currency,
                          settings.currencySymbol
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <PhotoViewer
          photo={viewingPhoto}
          photos={[viewingPhoto]}
          onClose={() => setViewingPhoto(null)}
          onUpdate={() => performSearch(query, searchType)}
          onFindSimilar={(_photoId) => {
            setViewingPhoto(null);
            // Switch to visual search for this photo
            setSearchType('visual');
          }}
        />
      )}
    </div>
  );
};

const SearchPhotoThumb: React.FC<{ photoId: string }> = ({ photoId }) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    db.thumbnails.get(photoId).then((rec: any) => {
      if (active && rec?.blob) setSrc(URL.createObjectURL(rec.blob));
    });
    return () => {
      active = false;
      if (src) URL.revokeObjectURL(src);
    };
  }, [photoId]);

  if (!src) return <div className="w-full h-full bg-gray-200 dark:bg-gray-800" />;
  return <img src={src} alt="thumb" className="w-full h-full object-cover" />;
};

export default SmartSearch;

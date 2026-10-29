import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Image as ImageIcon,
  Grid,
  List,
  Plus,
  Heart,
  Trash2,
  Filter,
  CheckSquare,
  Square,
  Search,
} from 'lucide-react';
import { PhotoCard } from '../components/photos/PhotoCard';
import { PhotoUploader } from '../components/photos/PhotoUploader';
import { PhotoViewer } from '../components/photos/PhotoViewer';
import { Button } from '../components/ui/Button';
import { EmptyState, Spinner } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast';
import {
  getPhotos,
  countPhotos,
  softDeletePhotos,
  toggleFavorite,
} from '../services/photoService';
import { getAllCategories } from '../services/productService';
import type { Photo, PhotoFilter, SortField, SortOrder } from '../types/photo';
import type { Category } from '../types/product';
import { formatBytes, formatDate } from '../utils/format';

export const Photos: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // View & Filter states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || ''
  );
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(
    searchParams.get('favorites') === 'true'
  );
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Multi-selection state
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [showUploader, setShowUploader] = useState<boolean>(false);
  const [viewingPhotoId, setViewingPhotoId] = useState<string | null>(
    searchParams.get('view')
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filter: PhotoFilter = {
        isDeleted: false,
        categoryId: selectedCategory || undefined,
        isFavorite: onlyFavorites ? true : undefined,
      };

      const [items, total, cats] = await Promise.all([
        getPhotos(filter, sortField, sortOrder, 150),
        countPhotos(),
        getAllCategories(),
      ]);

      setPhotos(items);
      setTotalCount(total);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load photos:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, onlyFavorites, sortField, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Synchronize URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (onlyFavorites) params.set('favorites', 'true');
    if (viewingPhotoId) params.set('view', viewingPhotoId);
    setSearchParams(params, { replace: true });
  }, [selectedCategory, onlyFavorites, viewingPhotoId, setSearchParams]);

  const handleFavorite = async (id: string) => {
    try {
      const updated = await toggleFavorite(id);
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isFavorite: updated } : p))
      );
      if (onlyFavorites && !updated) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      toast.error('Failed to toggle favorite');
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map((p) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const ids = Array.from(selectedIds);
      await softDeletePhotos(ids);
      toast.success(`Moved ${ids.length} photo(s) to trash`);
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowDeleteConfirm(false);
      loadData();
    } catch {
      toast.error('Bulk deletion failed');
    }
  };

  const viewingPhoto = viewingPhotoId
    ? photos.find((p) => p.id === viewingPhotoId) || null
    : null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Photos</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {photos.length} {photos.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Organize, inspect metadata, and attach images to products.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={selectionMode ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectionMode(!selectionMode);
              setSelectedIds(new Set());
            }}
          >
            {selectionMode ? 'Exit Selection' : 'Select'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowUploader(true)}
          >
            Add Photos
          </Button>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Favorites toggle */}
          <button
            type="button"
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              onlyFavorites
                ? 'border-red-300 bg-red-50 text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400'
                : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-red-500' : ''}`} />
            Favorites
          </button>

          {/* Sort selection */}
          <select
            value={`${sortField}_${sortOrder}`}
            onChange={(e) => {
              const [f, o] = e.target.value.split('_');
              setSortField(f as SortField);
              setSortOrder(o as SortOrder);
            }}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="createdAt_desc">Newest First</option>
            <option value="createdAt_asc">Oldest First</option>
            <option value="title_asc">Title (A-Z)</option>
            <option value="fileSizeBytes_desc">Largest File</option>
          </select>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 border-t md:border-t-0 pt-2 md:pt-0 border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label="Grid View"
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-gray-100 dark:bg-gray-800 text-emerald-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label="List View"
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-gray-100 dark:bg-gray-800 text-emerald-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk selection bar */}
      {selectionMode && (
        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 font-medium text-emerald-800 dark:text-emerald-200 hover:underline"
            >
              {selectedIds.size === photos.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedIds.size === photos.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
              {selectedIds.size} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="xs"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              disabled={selectedIds.size === 0}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="w-12 h-12" />}
          title="No photos found"
          description={
            onlyFavorites || selectedCategory
              ? 'Try adjusting your filters.'
              : 'Your vault photo library is empty. Import your first photo or capture with your camera!'
          }
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowUploader(true)}
            >
              Import Photos
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onClick={() => setViewingPhotoId(photo.id)}
              onFavorite={handleFavorite}
              selectionMode={selectionMode}
              selected={selectedIds.has(photo.id)}
              onSelect={handleToggleSelect}
            />
          ))}
        </div>
      ) : (
        /* List view */
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
              <tr>
                {selectionMode && <th className="p-3 w-8" />}
                <th className="p-3">Photo</th>
                <th className="p-3">Title</th>
                <th className="p-3 hidden sm:table-cell">Caption</th>
                <th className="p-3 hidden md:table-cell">Size</th>
                <th className="p-3 hidden lg:table-cell">Added</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {photos.map((photo) => (
                <tr
                  key={photo.id}
                  onClick={() => (selectionMode ? handleToggleSelect(photo.id) : setViewingPhotoId(photo.id))}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors"
                >
                  {selectionMode && (
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(photo.id)}
                        onChange={() => handleToggleSelect(photo.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="p-3 w-14">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <PhotoCardThumb photoId={photo.id} />
                    </div>
                  </td>
                  <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">
                    {photo.title || 'Untitled'}
                  </td>
                  <td className="p-3 text-gray-500 dark:text-gray-400 max-w-xs truncate hidden sm:table-cell">
                    {photo.caption || '—'}
                  </td>
                  <td className="p-3 text-gray-400 text-xs font-mono hidden md:table-cell">
                    {formatBytes(photo.fileSizeBytes)}
                  </td>
                  <td className="p-3 text-gray-400 text-xs hidden lg:table-cell">
                    {formatDate(photo.createdAt)}
                  </td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleFavorite(photo.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${photo.isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Photo Uploader Modal */}
      {showUploader && (
        <PhotoUploader
          onClose={() => setShowUploader(false)}
          onImportComplete={() => {
            setShowUploader(false);
            loadData();
          }}
        />
      )}

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <PhotoViewer
          photo={viewingPhoto}
          photos={photos}
          onClose={() => setViewingPhotoId(null)}
          onUpdate={loadData}
        />
      )}

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Photos"
        message={`Are you sure you want to move ${selectedIds.size} photos to the trash?`}
        confirmLabel="Move to Trash"
      />
    </div>
  );
};

const PhotoCardThumb: React.FC<{ photoId: string }> = ({ photoId }) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    import('../services/photoService').then(({ getThumbnailBlob }) => {
      getThumbnailBlob(photoId).then((blob) => {
        if (active && blob) setSrc(URL.createObjectURL(blob));
      });
    });
    return () => {
      active = false;
      if (src) URL.revokeObjectURL(src);
    };
  }, [photoId]);

  if (!src) return <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />;
  return <img src={src} alt="thumb" className="w-full h-full object-cover" />;
};

export default Photos;

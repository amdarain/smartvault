import React, { useEffect, useState } from 'react';
import {
  X,
  Heart,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Tag as TagIcon,
  Sparkles,
  Check,
} from 'lucide-react';
import type { Photo } from '../../types/photo';
import { db } from '../../db/db';
import {
  updatePhotoMetadata,
  softDeletePhoto,
  toggleFavorite,
  getPhotoBlob,
} from '../../services/photoService';
import { ConfirmDialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { formatBytes, formatDateTime } from '../../utils/format';
import { useToast } from '../ui/Toast';

interface PhotoViewerProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onUpdate: () => void;
  onFindSimilar?: (photoId: string) => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photo: initialPhoto,
  photos,
  onClose,
  onUpdate,
  onFindSimilar,
}) => {
  const [photo, setPhoto] = useState<Photo>(initialPhoto);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState(photo.title);
  const [editCaption, setEditCaption] = useState(photo.caption);
  const [editDescription, setEditDescription] = useState(photo.description);
  const [editTags, setEditTags] = useState(photo.tags.join(', '));
  const [editNotes, setEditNotes] = useState(photo.notes || '');

  const toast = useToast();

  const currentIndex = photos.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  // Load photo blob
  useEffect(() => {
    let active = true;
    let url: string | null = null;
    setLoading(true);

    getPhotoBlob(photo.id).then((blob) => {
      if (active) {
        if (blob) {
          url = URL.createObjectURL(blob);
          setImageSrc(url);
        }
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo.id]);

  // Sync edit state if photo changes
  useEffect(() => {
    setEditTitle(photo.title);
    setEditCaption(photo.caption);
    setEditDescription(photo.description);
    setEditTags(photo.tags.join(', '));
    setEditNotes(photo.notes || '');
  }, [photo]);

  // Key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) {
        setPhoto(photos[currentIndex - 1]);
      }
      if (e.key === 'ArrowRight' && hasNext) {
        setPhoto(photos[currentIndex + 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, onClose, hasPrev, hasNext, photos, currentIndex]);

  const handleFavorite = async () => {
    try {
      const nextFav = await toggleFavorite(photo.id);
      setPhoto((prev) => ({ ...prev, isFavorite: nextFav }));
      onUpdate();
      toast.success(nextFav ? 'Added to favorites' : 'Removed from favorites');
    } catch {
      toast.error('Failed to update favorite status');
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await getPhotoBlob(photo.id);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = photo.mimeType.split('/')[1] || 'jpg';
      a.download = `${photo.title || 'photo'}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async () => {
    try {
      await softDeletePhoto(photo.id);
      toast.success('Moved photo to trash');
      setShowDeleteConfirm(false);
      onUpdate();
      onClose();
    } catch {
      toast.error('Failed to delete photo');
    }
  };

  const handleSaveMetadata = async () => {
    try {
      const tagsArray = editTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await updatePhotoMetadata(photo.id, {
        title: editTitle,
        caption: editCaption,
        description: editDescription,
        tags: tagsArray,
        notes: editNotes,
      });

      setPhoto((prev) => ({
        ...prev,
        title: editTitle,
        caption: editCaption,
        description: editDescription,
        tags: tagsArray,
        notes: editNotes,
      }));

      setIsEditing(false);
      onUpdate();
      toast.success('Metadata updated');
    } catch {
      toast.error('Failed to save metadata');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col md:flex-row overflow-hidden">
      {/* Main Image Area */}
      <div className="relative flex-1 flex items-center justify-center p-4 min-h-0 select-none">
        {/* Navigation Arrows */}
        {hasPrev && (
          <button
            onClick={() => setPhoto(photos[currentIndex - 1])}
            aria-label="Previous photo"
            className="absolute left-4 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={() => setPhoto(photos[currentIndex + 1])}
            aria-label="Next photo"
            className="absolute right-4 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {loading ? (
          <Spinner size="lg" className="text-white" />
        ) : imageSrc ? (
          <img
            src={imageSrc}
            alt={photo.title}
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-all"
          />
        ) : (
          <p className="text-gray-400">Failed to load original image</p>
        )}

        {/* Floating Top Controls for mobile / quick access */}
        <div className="absolute top-4 left-4 flex items-center gap-2 md:hidden">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Details Side Panel */}
      <div className="w-full md:w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col h-full max-h-[50vh] md:max-h-full">
        {/* Panel Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 truncate pr-2">
            Photo Details
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handleFavorite}
              aria-label="Favorite"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <Heart
                className={`w-5 h-5 ${photo.isFavorite ? 'fill-red-500 text-red-500' : ''}`}
              />
            </button>
            <button
              onClick={handleDownload}
              aria-label="Download"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Delete"
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hidden md:block"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              <Input
                label="Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <Input
                label="Caption"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
              />
              <Textarea
                label="Description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
              <Input
                label="Tags (comma-separated)"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
              />
              <Textarea
                label="Notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Check className="w-4 h-4" />}
                  onClick={handleSaveMetadata}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {photo.title || 'Untitled'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                </div>
                {photo.caption && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">
                    "{photo.caption}"
                  </p>
                )}
                {photo.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {photo.description}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <TagIcon className="w-3.5 h-3.5" /> Tags
                </h4>
                {photo.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {photo.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No tags added.</p>
                )}
              </div>

              {/* Find Similar Action */}
              {onFindSimilar && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={<Sparkles className="w-4 h-4 text-emerald-600" />}
                    onClick={() => onFindSimilar(photo.id)}
                  >
                    Find Visually Similar Photos
                  </Button>
                </div>
              )}

              {/* File Info */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Dimensions</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {photo.width} × {photo.height}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Size</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {formatBytes(photo.fileSizeBytes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Format</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300 uppercase">
                    {photo.mimeType.replace('image/', '')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Added</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatDateTime(photo.createdAt)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {photo.notes && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Notes
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg">
                    {photo.notes}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Move to Trash"
        message="Are you sure you want to move this photo to the trash? It can be restored later."
        confirmLabel="Move to Trash"
      />
    </div>
  );
};
export default PhotoViewer;

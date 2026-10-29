import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Dialog';
import { EmptyState, Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import {
  getPhotos,
  restorePhoto,
  emptyTrash,
  permanentlyDeletePhoto,
} from '../services/photoService';
import { formatBytes, formatDate } from '../utils/format';
import { db } from '../db/db';
import type { Photo } from '../types/photo';

export const Trash: React.FC = () => {
  const [trashedPhotos, setTrashedPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toast = useToast();

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getPhotos({ isDeleted: true }, 'deletedAt', 'desc', 100);
      setTrashedPhotos(items);
    } catch (err) {
      console.error('Failed to load trash:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const handleRestore = async (id: string) => {
    try {
      await restorePhoto(id);
      toast.success('Photo restored to library.');
      loadTrash();
    } catch {
      toast.error('Failed to restore photo');
    }
  };

  const handleRestoreAll = async () => {
    try {
      for (const p of trashedPhotos) {
        await restorePhoto(p.id);
      }
      toast.success(`Restored all ${trashedPhotos.length} photos.`);
      loadTrash();
    } catch {
      toast.error('Failed to restore all photos');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await permanentlyDeletePhoto(id);
      toast.success('Permanently deleted.');
      setDeletingId(null);
      loadTrash();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const count = await emptyTrash();
      toast.success(`Permanently deleted ${count} items.`);
      setShowEmptyConfirm(false);
      loadTrash();
    } catch {
      toast.error('Failed to empty trash');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Trash & Recently Deleted
            <Trash2 className="w-5 h-5 text-red-500" />
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Safely recover deleted photos or permanently clean up device storage.
          </p>
        </div>

        {trashedPhotos.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={handleRestoreAll}
            >
              Restore All
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setShowEmptyConfirm(true)}
            >
              Empty Trash
            </Button>
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="p-4 bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span>
          Items here do not appear in searches or product lists. They will remain in local storage until permanently emptied.
        </span>
      </div>

      {loading ? (
        <div className="p-12 text-center"><Spinner size="lg" /></div>
      ) : trashedPhotos.length === 0 ? (
        <EmptyState
          icon={<Trash2 className="w-12 h-12" />}
          title="Trash is empty"
          description="Deleted photos will be safely held here before permanent removal."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {trashedPhotos.map((photo) => (
            <div
              key={photo.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between"
            >
              <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
                <TrashThumb photoId={photo.id} />
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-600 text-white">
                    Deleted
                  </span>
                </div>
              </div>

              <div className="p-3">
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">
                  {photo.title || 'Untitled'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatBytes(photo.fileSizeBytes)} • Deleted {formatDate(photo.deletedAt || photo.updatedAt)}
                </p>
              </div>

              <div className="p-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="xs"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={() => handleRestore(photo.id)}
                >
                  Restore
                </Button>

                <Button
                  variant="ghost"
                  size="xs"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => setDeletingId(photo.id)}
                >
                  Delete Forever
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty Trash Confirm */}
      <ConfirmDialog
        open={showEmptyConfirm}
        onClose={() => setShowEmptyConfirm(false)}
        onConfirm={handleEmptyTrash}
        title="Empty Trash"
        message={`Are you sure you want to permanently delete all ${trashedPhotos.length} items? This action cannot be undone.`}
        confirmLabel="Empty Trash Permanently"
      />

      {/* Single Item Permanent Delete Confirm */}
      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handlePermanentDelete(deletingId)}
        title="Permanently Delete"
        message="Are you sure you want to permanently delete this photo? It will be removed from your device storage immediately."
        confirmLabel="Delete Forever"
      />
    </div>
  );
};

const TrashThumb: React.FC<{ photoId: string }> = ({ photoId }) => {
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

  if (!src) return <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400"><ImageIcon className="w-8 h-8" /></div>;
  return <img src={src} alt="deleted item" className="w-full h-full object-cover opacity-80" />;
};

export default Trash;

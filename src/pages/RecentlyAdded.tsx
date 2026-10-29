import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Image as ImageIcon } from 'lucide-react';
import { PhotoCard } from '../components/photos/PhotoCard';
import { PhotoViewer } from '../components/photos/PhotoViewer';
import { EmptyState, Spinner } from '../components/ui/Spinner';
import { getPhotos, toggleFavorite } from '../services/photoService';
import type { Photo } from '../types/photo';

export const RecentlyAdded: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getPhotos({ isDeleted: false }, 'createdAt', 'desc', 100);
      setPhotos(items);
    } catch (err) {
      console.error('Failed to load recent photos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleFavorite = async (id: string) => {
    await toggleFavorite(id);
    loadPhotos();
  };

  // Group photos by time relative to now
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayAgo = startOfToday - 86400000;
  const oneWeekAgo = startOfToday - 7 * 86400000;

  const todayPhotos: Photo[] = [];
  const yesterdayPhotos: Photo[] = [];
  const thisWeekPhotos: Photo[] = [];
  const earlierPhotos: Photo[] = [];

  photos.forEach((p) => {
    const t = new Date(p.createdAt).getTime();
    if (t >= startOfToday) todayPhotos.push(p);
    else if (t >= oneDayAgo) yesterdayPhotos.push(p);
    else if (t >= oneWeekAgo) thisWeekPhotos.push(p);
    else earlierPhotos.push(p);
  });

  const groups = [
    { label: 'Today', items: todayPhotos },
    { label: 'Yesterday', items: yesterdayPhotos },
    { label: 'This Week', items: thisWeekPhotos },
    { label: 'Earlier', items: earlierPhotos },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Recently Added
          <Clock className="w-5 h-5 text-emerald-600" />
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Chronological timeline of all images imported into your vault.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center"><Spinner size="lg" /></div>
      ) : photos.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="w-12 h-12" />}
          title="No photos added yet"
          description="Your vault timeline will appear here once you import images."
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {group.label}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
                  {group.items.length}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {group.items.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    onClick={() => setViewingPhoto(photo)}
                    onFavorite={handleFavorite}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingPhoto && (
        <PhotoViewer
          photo={viewingPhoto}
          photos={photos}
          onClose={() => setViewingPhoto(null)}
          onUpdate={loadPhotos}
        />
      )}
    </div>
  );
};
export default RecentlyAdded;

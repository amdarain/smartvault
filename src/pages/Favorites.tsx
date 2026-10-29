import React, { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { PhotoCard } from '../components/photos/PhotoCard';
import { PhotoViewer } from '../components/photos/PhotoViewer';
import { EmptyState, Spinner } from '../components/ui/Spinner';
import { getPhotos, toggleFavorite } from '../services/photoService';
import type { Photo } from '../types/photo';

export const Favorites: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const favs = await getPhotos({ isFavorite: true, isDeleted: false }, 'createdAt', 'desc', 100);
      setPhotos(favs);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleFavorite = async (id: string) => {
    try {
      await toggleFavorite(id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to unfavorite:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Favorites
          <Heart className="w-5 h-5 fill-red-500 text-red-500" />
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Starred photos for fast reference and product attachment.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-12 h-12 text-gray-300" />}
          title="No favorites yet"
          description="Click the heart icon on any photo in your vault to save it here for fast access."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onClick={() => setViewingPhoto(photo)}
              onFavorite={handleFavorite}
            />
          ))}
        </div>
      )}

      {viewingPhoto && (
        <PhotoViewer
          photo={viewingPhoto}
          photos={photos}
          onClose={() => setViewingPhoto(null)}
          onUpdate={loadFavorites}
        />
      )}
    </div>
  );
};
export default Favorites;

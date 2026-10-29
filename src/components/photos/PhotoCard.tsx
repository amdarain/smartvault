import React, { useEffect, useState } from 'react';
import { Heart, Check, Image as ImageIcon } from 'lucide-react';
import type { Photo } from '../../types/photo';
import { db } from '../../db/db';
import { clsx } from 'clsx';

interface PhotoCardProps {
  photo: Photo;
  onClick: () => void;
  onFavorite: (id: string) => void;
  selected?: boolean;
  selectionMode?: boolean;
  onSelect?: (id: string) => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  onClick,
  onFavorite,
  selected = false,
  selectionMode = false,
  onSelect,
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    db.thumbnails.get(photo.id).then((rec) => {
      if (active) {
        if (rec?.blob) {
          url = URL.createObjectURL(rec.blob);
          setThumbnailUrl(url);
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

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite(photo.id);
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) onSelect(photo.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={photo.title || 'Photo item'}
      onClick={selectionMode && onSelect ? () => onSelect(photo.id) : onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={clsx(
        'group relative aspect-square rounded-xl overflow-hidden cursor-pointer select-none border transition-all duration-200',
        'bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500',
        selected
          ? 'border-emerald-600 ring-2 ring-emerald-500'
          : 'border-gray-200 dark:border-gray-700 hover:shadow-md'
      )}
    >
      {loading ? (
        <div className="w-full h-full flex items-center justify-center animate-pulse bg-gray-200 dark:bg-gray-700">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
      ) : thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={photo.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
          <ImageIcon className="w-8 h-8 mb-1" />
          <span className="text-xs">No preview</span>
        </div>
      )}

      {/* Hover & Active Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5">
        <div className="flex items-center justify-between">
          {(selectionMode || onSelect) ? (
            <button
              type="button"
              onClick={handleSelectClick}
              className={clsx(
                'w-6 h-6 rounded-md flex items-center justify-center transition-colors',
                selected
                  ? 'bg-emerald-600 text-white'
                  : 'bg-black/40 text-transparent hover:bg-black/60 border border-white/50'
              )}
            >
              <Check className="w-4 h-4 stroke-[3]" />
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label={photo.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-transform active:scale-90"
          >
            <Heart
              className={clsx(
                'w-4 h-4 transition-colors',
                photo.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'
              )}
            />
          </button>
        </div>

        <div className="text-white">
          <p className="text-sm font-semibold truncate drop-shadow">{photo.title || 'Untitled'}</p>
          {photo.caption && (
            <p className="text-xs text-gray-200 truncate drop-shadow">{photo.caption}</p>
          )}
        </div>
      </div>

      {/* Persistent Badge if Favorite */}
      {photo.isFavorite && (
        <div className="absolute top-2 right-2 group-hover:hidden">
          <span className="p-1 rounded-full bg-black/50 backdrop-blur-sm text-red-500 flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 fill-red-500" />
          </span>
        </div>
      )}

      {/* Persistent Checkbox if Selected */}
      {selected && (
        <div className="absolute top-2 left-2 group-hover:hidden">
          <div className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center shadow">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </div>
      )}
    </div>
  );
};
export default PhotoCard;

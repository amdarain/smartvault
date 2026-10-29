import React, { useState, useRef } from 'react';
import { Upload, Camera, AlertCircle, CheckCircle, Clock, X, FileImage } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/Spinner';
import { preparePhotoImport, savePhoto } from '../../services/photoService';
import { useToast } from '../ui/Toast';
import { formatBytes } from '../../utils/format';
import type { Photo } from '../../types/photo';

interface QueueItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'duplicate' | 'done' | 'error';
  progressMsg?: string;
  error?: string;
  prepared?: {
    photo: Photo;
    blob: Blob;
    thumbnail: Blob;
    isDuplicate: boolean;
    duplicateOf: string | null;
  };
}

interface PhotoUploaderProps {
  onClose: () => void;
  onImportComplete?: () => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onClose, onImportComplete }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: QueueItem[] = Array.from(files).map((f) => ({
      id: Math.random().toString(36).substring(2),
      file: f,
      status: 'pending',
    }));
    setQueue((prev) => [...prev, ...newItems]);
  };

  const processQueue = async () => {
    setIsProcessing(true);
    let importedCount = 0;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'done') continue;

      setQueue((prev) =>
        prev.map((q, idx) => (idx === i ? { ...q, status: 'processing', progressMsg: 'Inspecting...' } : q))
      );

      try {
        const prepared = await preparePhotoImport(item.file, (msg) => {
          setQueue((prev) =>
            prev.map((q, idx) => (idx === i ? { ...q, progressMsg: msg } : q))
          );
        });

        if (prepared.isDuplicate && item.status !== 'duplicate') {
          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === i
                ? {
                    ...q,
                    status: 'duplicate',
                    prepared,
                    progressMsg: 'Duplicate detected',
                  }
                : q
            )
          );
          // Wait for user intervention on duplicate or let them hit 'Import Anyway'
          continue;
        }

        // Save to DB
        await savePhoto(prepared.photo, prepared.blob, prepared.thumbnail);
        importedCount++;

        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: 'done', progressMsg: 'Saved to vault' } : q
          )
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Import failed';
        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: 'error', error: errorMsg, progressMsg: 'Error' } : q
          )
        );
      }
    }

    setIsProcessing(false);
    if (importedCount > 0) {
      toast.success(`Successfully imported ${importedCount} photo(s).`);
      if (onImportComplete) onImportComplete();
    }
  };

  const handleForceSaveDuplicate = async (index: number) => {
    const item = queue[index];
    if (!item.prepared) return;
    try {
      await savePhoto(item.prepared.photo, item.prepared.blob, item.prepared.thumbnail);
      setQueue((prev) =>
        prev.map((q, idx) =>
          idx === index ? { ...q, status: 'done', progressMsg: 'Imported' } : q
        )
      );
      toast.success('Duplicate saved.');
      if (onImportComplete) onImportComplete();
    } catch (e: unknown) {
      toast.error('Failed to save duplicate');
    }
  };

  const handleRemoveQueueItem = (index: number) => {
    setQueue((prev) => prev.filter((_, idx) => idx !== index));
  };

  const completedCount = queue.filter((q) => q.status === 'done').length;
  const progressPercent = queue.length > 0 ? Math.round((completedCount / queue.length) * 100) : 0;

  return (
    <Dialog open={true} onClose={isProcessing ? () => {} : onClose} title="Import Photos" size="lg">
      <div className="space-y-4">
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFilesAdded(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFilesAdded(e.target.files);
            e.target.value = '';
          }}
        />

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFilesAdded(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 bg-gray-50 dark:bg-gray-800/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-full">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                Click or drag & drop photos here
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Supports JPG, PNG, WEBP, AVIF, HEIC, GIF up to 50MB
              </p>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Camera className="w-4 h-4" />}
            onClick={() => cameraInputRef.current?.click()}
          >
            Take Photo
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<FileImage className="w-4 h-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Browse Files
          </Button>
        </div>

        {/* Queue Items */}
        {queue.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Import Queue ({queue.length})</span>
              <span>{completedCount} completed</span>
            </div>

            {queue.length > 0 && (
              <ProgressBar value={progressPercent} color="emerald" size="sm" />
            )}

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-100 dark:divide-gray-800">
              {queue.map((item, idx) => (
                <div key={item.id} className="pt-2 flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {item.status === 'done' && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                    {item.status === 'processing' && <Clock className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
                    {item.status === 'duplicate' && <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                    {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    {item.status === 'pending' && <FileImage className="w-4 h-4 text-gray-400 flex-shrink-0" />}

                    <div className="truncate">
                      <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{item.file.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatBytes(item.file.size)} • {item.progressMsg || 'Waiting'}
                        {item.error && <span className="text-red-500 ml-1">({item.error})</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.status === 'duplicate' && (
                      <Button
                        type="button"
                        size="xs"
                        variant="secondary"
                        onClick={() => handleForceSaveDuplicate(idx)}
                      >
                        Keep Anyway
                      </Button>
                    )}
                    {item.status !== 'processing' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQueueItem(idx)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer controls */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            {completedCount > 0 ? 'Close' : 'Cancel'}
          </Button>

          {queue.length > 0 && completedCount < queue.length && (
            <Button
              variant="primary"
              loading={isProcessing}
              onClick={processQueue}
              disabled={queue.every((q) => q.status === 'done')}
            >
              Start Import
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};
export default PhotoUploader;

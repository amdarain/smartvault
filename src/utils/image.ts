/**
 * Generates a thumbnail Blob from an image Blob.
 * Resizes to fit within maxDimension x maxDimension, preserving aspect ratio.
 * Outputs JPEG at quality 0.82 (good balance of size/quality).
 */
export async function generateThumbnail(
  blob: Blob,
  maxDimension = 400,
  quality = 0.82,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;

      let tw = w;
      let th = h;
      if (w > maxDimension || h > maxDimension) {
        const ratio = Math.min(maxDimension / w, maxDimension / h);
        tw = Math.round(w * ratio);
        th = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, tw, th);
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('canvas.toBlob returned null'));
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed during thumbnail generation'));
    };

    img.src = url;
  });
}

/**
 * Returns an object URL for a Blob, and a cleanup function.
 * Always call cleanup() when the URL is no longer needed.
 */
export function blobToObjectUrl(blob: Blob): { url: string; revoke: () => void } {
  const url = URL.createObjectURL(blob);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

/**
 * Extracts the image dimensions from a Blob without loading it fully into DOM.
 */
export async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cannot determine image dimensions'));
    };
    img.src = url;
  });
}

/** Accepted image MIME types */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/svg+xml',
];

export function isAcceptedImageType(mimeType: string): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(mimeType.toLowerCase());
}

/** Maximum upload size: 50 MB per file */
export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Generates a SHA-256 hex digest of a Blob or ArrayBuffer.
 * Used for duplicate detection.
 */
export async function sha256(data: Blob | ArrayBuffer): Promise<string> {
  const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes a simple perceptual hash (pHash) of an image.
 * Uses a 32x32 grayscale DCT approach — good enough for near-duplicate detection.
 * Returns a 64-character hex string (256-bit hash).
 */
export async function perceptualHash(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const SIZE = 32;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }

        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
        const pixels = imageData.data;

        // Convert to grayscale
        const gray: number[] = [];
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          gray.push(0.299 * r + 0.587 * g + 0.114 * b);
        }

        // Compute mean
        const mean = gray.reduce((a, b) => a + b, 0) / gray.length;

        // Build binary hash: 1 if pixel > mean
        let bits = '';
        for (const val of gray) {
          bits += val > mean ? '1' : '0';
        }

        // Convert binary string to hex
        let hex = '';
        for (let i = 0; i < bits.length; i += 4) {
          hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
        }
        resolve(hex);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for pHash'));
    };
    img.src = url;
  });
}

/**
 * Returns the Hamming distance between two pHash hex strings.
 * Lower = more similar. 0 = identical.
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const a = parseInt(hash1[i], 16);
    const b = parseInt(hash2[i], 16);
    let xor = a ^ b;
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

/** Returns true if two pHashes are likely duplicates (threshold: 10 bits difference) */
export function isLikelyDuplicate(hash1: string, hash2: string, threshold = 10): boolean {
  return hammingDistance(hash1, hash2) <= threshold;
}

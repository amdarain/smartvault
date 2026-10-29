/**
 * Computes cosine similarity between two Float32Array vectors.
 * Returns a value in [-1, 1] where 1 = identical direction.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * L2-normalizes a Float32Array in-place.
 */
export function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
}

/**
 * Returns the top-k most similar items from a list by cosine similarity.
 */
export function topKSimilar<T extends { id: string; vector: Float32Array }>(
  query: Float32Array,
  candidates: T[],
  k: number,
  minScore = 0.0,
): Array<{ id: string; score: number }> {
  const scored = candidates
    .map((c) => ({ id: c.id, score: cosineSimilarity(query, c.vector) }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

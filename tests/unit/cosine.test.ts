import { describe, it, expect } from 'vitest';
import { cosineSimilarity, l2Normalize, topKSimilar } from '../../src/utils/cosine';

describe('Cosine Similarity & Vector Utilities', () => {
  it('calculates identical vectors as similarity 1', () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it('calculates orthogonal vectors as similarity 0', () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([0, 1]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('normalizes vector to unit length', () => {
    const v = new Float32Array([3, 4]);
    l2Normalize(v);
    expect(v[0]).toBeCloseTo(0.6, 5);
    expect(v[1]).toBeCloseTo(0.8, 5);
  });

  it('ranks top K candidates correctly', () => {
    const query = new Float32Array([1, 0, 0]);
    const candidates = [
      { id: '1', vector: new Float32Array([0, 1, 0]) }, // similarity 0
      { id: '2', vector: new Float32Array([0.9, 0.1, 0]) }, // high
      { id: '3', vector: new Float32Array([0.5, 0.5, 0]) }, // medium
    ];

    const results = topKSimilar(query, candidates, 2);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe('2');
    expect(results[1].id).toBe('3');
  });
});

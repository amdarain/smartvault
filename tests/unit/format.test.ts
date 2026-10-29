import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  formatCurrency,
  highlightMatches,
  truncate,
  plural,
} from '../../src/utils/format';

describe('Format Utilities', () => {
  it('formats byte values accurately', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 * 5.5)).toBe('5.5 MB');
  });

  it('formats currency correctly', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(19.99, 'USD', '$')).toContain('19.99');
  });

  it('truncates strings properly', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
    expect(truncate('Short', 10)).toBe('Short');
  });

  it('highlights substring matches', () => {
    const parts = highlightMatches('Wireless Charger Pad', 'Charger');
    expect(parts.length).toBe(3);
    expect(parts[1].text).toBe('Charger');
    expect(parts[1].highlight).toBe(true);
  });

  it('handles pluralization', () => {
    expect(plural(1, 'item')).toBe('item');
    expect(plural(5, 'item')).toBe('items');
    expect(plural(2, 'category', 'categories')).toBe('categories');
  });
});

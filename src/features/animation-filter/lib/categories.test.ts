import { describe, expect, it } from 'vitest';
import { CATEGORY_LABELS, CATEGORY_ORDER, catRank, categoryLabel } from './categories';

describe('CATEGORY_LABELS', () => {
  it('has an entry for every ordered category', () => {
    for (const key of CATEGORY_ORDER) {
      expect(CATEGORY_LABELS[key]).toBeTruthy();
    }
  });

  it('includes the general fallback', () => {
    expect(CATEGORY_LABELS.general).toBeTruthy();
  });
});

describe('CATEGORY_ORDER', () => {
  it('is non-empty and contains unique entries', () => {
    expect(CATEGORY_ORDER.length).toBeGreaterThan(0);
    expect(new Set(CATEGORY_ORDER).size).toBe(CATEGORY_ORDER.length);
  });
});

describe('catRank', () => {
  it('returns the index for known categories', () => {
    expect(catRank(CATEGORY_ORDER[0])).toBe(0);
    expect(catRank(CATEGORY_ORDER[CATEGORY_ORDER.length - 1])).toBe(CATEGORY_ORDER.length - 1);
  });

  it('returns the sentinel value for unknown categories', () => {
    expect(catRank('completely-unknown')).toBe(CATEGORY_ORDER.length);
  });
});

describe('categoryLabel', () => {
  it('returns the registered label for known categories', () => {
    expect(categoryLabel('python' in CATEGORY_LABELS ? 'python' : 'algorithm')).toBe(
      CATEGORY_LABELS.algorithm ?? CATEGORY_LABELS.python,
    );
  });

  it('falls back to the "general" label when input is undefined', () => {
    expect(categoryLabel(undefined)).toBe(CATEGORY_LABELS.general);
  });

  it('emits a fallback label for unregistered categories', () => {
    expect(categoryLabel('brand-new-category')).toBe('🎬 brand-new-category');
  });
});

import { describe, expect, it } from 'vitest';
import { getWikiCategoryMeta } from './wiki-category-meta';

describe('getWikiCategoryMeta', () => {
  it('returns the registered meta for known slugs', () => {
    expect(getWikiCategoryMeta('python')).toEqual({ icon: '🐍', color: '#3776ab' });
    expect(getWikiCategoryMeta('java')).toEqual({ icon: '☕', color: '#ed8b00' });
    expect(getWikiCategoryMeta('sql')).toEqual({ icon: '🗄️', color: '#64748b' });
  });

  it('returns the default meta for unknown slugs', () => {
    expect(getWikiCategoryMeta('unknown-slug')).toEqual({ icon: '📁', color: '#94a3b8' });
    expect(getWikiCategoryMeta('')).toEqual({ icon: '📁', color: '#94a3b8' });
  });
});

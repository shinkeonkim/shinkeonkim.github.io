import { describe, expect, it } from 'vitest';
import { getWikiCategoryMeta } from './wiki-category-meta';

describe('getWikiCategoryMeta', () => {
  it('returns SVG icons and colors for known slugs', () => {
    const python = getWikiCategoryMeta('python');
    expect(python.color).toBe('#3776ab');
    expect(python.icon).toContain('<svg');

    const java = getWikiCategoryMeta('java');
    expect(java.color).toBe('#ed8b00');
    expect(java.icon).toContain('<svg');

    const sql = getWikiCategoryMeta('sql');
    expect(sql.color).toBe('#00758f');
    expect(sql.icon).toContain('<svg');
  });

  it('generic concept categories use currentColor stroke SVGs', () => {
    const algo = getWikiCategoryMeta('algorithm');
    expect(algo.icon).toContain('stroke="currentColor"');

    const ai = getWikiCategoryMeta('ai');
    expect(ai.icon).toContain('stroke="currentColor"');
  });

  it('language and framework categories have brand-colored letter marks', () => {
    for (const slug of ['python', 'typescript', 'fastapi', 'flask', 'kubernetes']) {
      const meta = getWikiCategoryMeta(slug);
      expect(meta.icon).toContain('<svg');
      expect(meta.icon).toContain('<text');
    }
  });

  it('returns the default meta for unknown slugs', () => {
    const unknown = getWikiCategoryMeta('unknown-slug');
    expect(unknown.color).toBe('#94a3b8');
    expect(unknown.icon).toContain('<svg');

    const empty = getWikiCategoryMeta('');
    expect(empty.color).toBe('#94a3b8');
    expect(empty.icon).toContain('<svg');
  });

  it('has entries for all major wiki categories', () => {
    const slugs = [
      'algorithm',
      'ai',
      'cloud',
      'devops',
      'kubernetes',
      'ml',
      'network',
      'python',
      'typescript',
      'virtualization',
      'voice',
    ];
    for (const slug of slugs) {
      const meta = getWikiCategoryMeta(slug);
      expect(meta.icon).toContain('<svg');
      expect(meta.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

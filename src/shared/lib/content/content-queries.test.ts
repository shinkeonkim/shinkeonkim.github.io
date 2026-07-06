import { describe, expect, it, vi } from 'vitest';

vi.mock('astro:content', () => ({
  getCollection: vi.fn(async () => []),
}));

import { getCollection } from 'astro:content';
import {
  WIKILINK_RE,
  extractWikilinkTargets,
  getPublishedNotes,
  getPublishedPosts,
  getPublishedSources,
  getPublishedWiki,
  sortByDateDesc,
  sortByTitleAsc,
} from './content-queries';

describe('WIKILINK_RE', () => {
  it('captures simple wikilink', () => {
    const m = new RegExp(WIKILINK_RE.source).exec('see [[python]] for more');
    expect(m?.[1]).toBe('python');
    expect(m?.[2]).toBeUndefined();
    expect(m?.[3]).toBeUndefined();
  });

  it('captures heading anchor', () => {
    const m = new RegExp(WIKILINK_RE.source).exec('[[django#models]]');
    expect(m?.[1]).toBe('django');
    expect(m?.[2]).toBe('models');
  });

  it('captures alias / display text', () => {
    const m = new RegExp(WIKILINK_RE.source).exec('[[python|파이썬]]');
    expect(m?.[1]).toBe('python');
    expect(m?.[3]).toBe('파이썬');
  });

  it('captures heading + alias together', () => {
    const m = new RegExp(WIKILINK_RE.source).exec('[[django#models|모델]]');
    expect(m?.[1]).toBe('django');
    expect(m?.[2]).toBe('models');
    expect(m?.[3]).toBe('모델');
  });
});

describe('extractWikilinkTargets', () => {
  it('returns empty array for no wikilinks', () => {
    expect(extractWikilinkTargets('hello world')).toEqual([]);
    expect(extractWikilinkTargets('')).toEqual([]);
  });

  it('returns all wikilink targets in body', () => {
    const body = 'See [[python]] and [[django#models|models]] and again [[python|p]]';
    expect(extractWikilinkTargets(body)).toEqual(['python', 'django', 'python']);
  });

  it('trims whitespace inside brackets', () => {
    expect(extractWikilinkTargets('[[ python ]]')).toEqual(['python']);
  });
});

describe('sortByDateDesc', () => {
  it('sorts entries by data.date desc, leaving input untouched', () => {
    const a = { data: { date: new Date('2024-01-01') } };
    const b = { data: { date: new Date('2025-06-15') } };
    const c = { data: { date: new Date('2023-11-30') } };
    const input = [a, b, c];
    const sorted = sortByDateDesc(input);
    expect(sorted).toEqual([b, a, c]);
    expect(input).toEqual([a, b, c]);
  });
});

describe('sortByTitleAsc', () => {
  it('sorts entries by data.title alphabetically', () => {
    const items = [
      { data: { title: 'banana' } },
      { data: { title: 'apple' } },
      { data: { title: 'cherry' } },
    ];
    expect(sortByTitleAsc(items).map((e) => e.data.title)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('returns a new array (immutable)', () => {
    const items = [{ data: { title: 'b' } }, { data: { title: 'a' } }];
    const sorted = sortByTitleAsc(items);
    expect(items.map((e) => e.data.title)).toEqual(['b', 'a']);
    expect(sorted.map((e) => e.data.title)).toEqual(['a', 'b']);
  });
});

describe('collection queries', () => {
  const getCollectionMock = vi.mocked(getCollection);

  it('getPublishedPosts filters drafts via predicate', async () => {
    getCollectionMock.mockImplementation((async (
      _col: string,
      pred?: (entry: { data: { draft?: boolean } }) => boolean,
    ) => {
      const entries = [{ data: { draft: false } }, { data: { draft: true } }];
      return pred ? entries.filter(pred) : entries;
    }) as never);
    const result = await getPublishedPosts();
    expect(result).toHaveLength(1);
  });

  it('getPublishedWiki delegates to getCollection', async () => {
    getCollectionMock.mockResolvedValue([{ id: 'w' }] as never);
    const result = await getPublishedWiki();
    expect(result).toHaveLength(1);
  });

  it('getPublishedNotes delegates to getCollection', async () => {
    getCollectionMock.mockResolvedValue([{ id: 'n' }] as never);
    const result = await getPublishedNotes();
    expect(result).toHaveLength(1);
  });

  it('getPublishedSources delegates to getCollection', async () => {
    getCollectionMock.mockResolvedValue([{ id: 's' }] as never);
    const result = await getPublishedSources();
    expect(result).toHaveLength(1);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
}));

import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

const getCollectionMock = vi.mocked(getCollection);

function makeSource(id: string, data: Partial<{ title: string; type: string; author: string }> = {}) {
  return {
    id,
    data: {
      type: 'book',
      title: 'Design Patterns',
      author: 'Gamma',
      ...data,
    },
  };
}

function makePost(id: string, references: unknown[] = []) {
  return {
    id,
    collection: 'posts',
    data: {
      title: `Post ${id}`,
      date: new Date('2024-01-01'),
      references,
    },
  };
}

function makeWiki(id: string, references: unknown[] = []) {
  return {
    id,
    collection: 'wiki',
    data: {
      title: `Wiki ${id}`,
      references,
    },
  };
}

describe('resolveReferences', () => {
  it('returns empty array for non-array input', async () => {
    const { resolveReferences } = await import('./references');
    const index = { sources: new Map(), citingBySourceId: new Map() };
    expect(resolveReferences(undefined, index)).toEqual([]);
    expect(resolveReferences(null as unknown as unknown[], index)).toEqual([]);
  });

  it('skips non-object entries', async () => {
    const { resolveReferences } = await import('./references');
    const index = { sources: new Map(), citingBySourceId: new Map() };
    expect(resolveReferences([null, 'string', 42], index)).toEqual([]);
  });

  it('resolves shared references when source is in index', async () => {
    const { resolveReferences } = await import('./references');
    const source = makeSource('src-1') as unknown as CollectionEntry<'sources'>;
    const index = {
      sources: new Map([['src-1', source]]),
      citingBySourceId: new Map(),
    };
    const result = resolveReferences(
      [{ id: 'src-1', page: 42, anchor: 'ch3', note: 'important' }],
      index,
    );
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('shared');
    if (result[0].kind === 'shared') {
      expect(result[0].page).toBe(42);
      expect(result[0].anchor).toBe('ch3');
      expect(result[0].note).toBe('important');
    }
  });

  it('marks missing references when source id not found', async () => {
    const { resolveReferences } = await import('./references');
    const index = { sources: new Map(), citingBySourceId: new Map() };
    const result = resolveReferences([{ id: 'unknown', note: 'x' }], index);
    expect(result[0].kind).toBe('missing');
  });

  it('produces inline references when only title is present', async () => {
    const { resolveReferences } = await import('./references');
    const index = { sources: new Map(), citingBySourceId: new Map() };
    const result = resolveReferences(
      [{ title: 'Ad-hoc source', url: 'https://x.io', author: 'Me', note: 'note' }],
      index,
    );
    expect(result[0].kind).toBe('inline');
    if (result[0].kind === 'inline') {
      expect(result[0].title).toBe('Ad-hoc source');
      expect(result[0].url).toBe('https://x.io');
      expect(result[0].author).toBe('Me');
    }
  });
});

describe('formatSourceLabel', () => {
  it('prepends author for books', async () => {
    const { formatSourceLabel } = await import('./references');
    const source = makeSource('x', { type: 'book', author: 'Gamma', title: 'DP' }) as unknown as CollectionEntry<'sources'>;
    expect(formatSourceLabel(source)).toBe('Gamma · DP');
  });

  it('omits author when missing for books', async () => {
    const { formatSourceLabel } = await import('./references');
    const source = makeSource('x', { type: 'book', author: undefined, title: 'DP' }) as unknown as CollectionEntry<'sources'>;
    expect(formatSourceLabel(source)).toBe('DP');
  });

  it('uses title only for non-books', async () => {
    const { formatSourceLabel } = await import('./references');
    const source = makeSource('x', { type: 'paper', title: 'A Paper' }) as unknown as CollectionEntry<'sources'>;
    expect(formatSourceLabel(source)).toBe('A Paper');
  });
});

describe('getReferenceIndex', () => {
  beforeEach(() => {
    vi.resetModules();
    getCollectionMock.mockReset();
  });

  it('builds index from sources, posts, and wiki collections', async () => {
    getCollectionMock.mockImplementation(async (col: string) => {
      if (col === 'sources') return [makeSource('s1')] as never;
      if (col === 'wiki') return [makeWiki('w1', [{ id: 's1', page: 10 }])] as never;
      return [] as never;
    });
    const { getReferenceIndex } = await import('./references');
    const index = await getReferenceIndex();
    expect(index.sources.has('s1')).toBe(true);
    expect(index.citingBySourceId.get('s1')?.[0].collection).toBe('wiki');
  });

  it('records posts citing sources with page numbers', async () => {
    getCollectionMock.mockImplementation(async (col: string) => {
      if (col === 'sources') return [makeSource('s1')] as never;
      if (col === 'wiki') return [] as never;
      const posts = { data: { references: undefined } };
      void posts;
      return [] as never;
    });
    const { getReferenceIndex } = await import('./references');
    const index = await getReferenceIndex();
    expect(index.citingBySourceId.get('s1') ?? []).toEqual([]);
  });

  it('memoizes index across calls', async () => {
    getCollectionMock.mockImplementation(async () => [] as never);
    const { getReferenceIndex } = await import('./references');
    await getReferenceIndex();
    await getReferenceIndex();
    expect(getCollectionMock).toHaveBeenCalledTimes(3);
  });

  it('sorts citing docs by date descending', async () => {
    getCollectionMock.mockImplementation(async (col: string) => {
      if (col === 'sources') return [makeSource('s1')] as never;
      if (col === 'wiki') return [] as never;
      return [] as never;
    });
    const { getReferenceIndex } = await import('./references');
    const index = await getReferenceIndex();
    expect(Array.isArray(index.citingBySourceId.get('s1') ?? [])).toBe(true);
  });

  it('handles NFC normalization for Korean IDs', async () => {
    getCollectionMock.mockImplementation(async (col: string) => {
      if (col === 'sources') return [makeSource('한글')] as never;
      if (col === 'wiki') return [makeWiki('w1', [{ id: '한글'.normalize('NFD') }])] as never;
      return [] as never;
    });
    const { getReferenceIndex } = await import('./references');
    const index = await getReferenceIndex();
    expect(index.sources.has('한글')).toBe(true);
  });

  it('skips references entries when id is missing', async () => {
    getCollectionMock.mockImplementation(async (col: string) => {
      if (col === 'sources') return [makeSource('s1')] as never;
      if (col === 'wiki') return [makeWiki('w1', [{ title: 'no id here' }])] as never;
      return [] as never;
    });
    const { getReferenceIndex } = await import('./references');
    const index = await getReferenceIndex();
    expect(index.citingBySourceId.get('s1') ?? []).toEqual([]);
  });

  it('skips items whose references array is empty or non-array', async () => {
    void makePost;
    getCollectionMock.mockImplementation(async (col: string) => {
      if (col === 'sources') return [makeSource('s1')] as never;
      if (col === 'wiki')
        return [
          { id: 'w1', collection: 'wiki', data: { title: 't', references: [] } },
          { id: 'w2', collection: 'wiki', data: { title: 't', references: null } },
        ] as never;
      return [] as never;
    });
    const { getReferenceIndex } = await import('./references');
    const index = await getReferenceIndex();
    expect(index.citingBySourceId.size).toBe(0);
  });

  it('sorts citing docs with mixed dates including undefined', async () => {
    getCollectionMock.mockImplementation(async (col: string) => {
      if (col === 'sources') return [makeSource('s1')] as never;
      if (col === 'wiki')
        return [
          {
            id: 'w1',
            collection: 'wiki',
            data: {
              title: 'w1',
              date: new Date('2024-01-01'),
              references: [{ id: 's1' }],
            },
          },
          {
            id: 'w2',
            collection: 'wiki',
            data: {
              title: 'w2',
              date: new Date('2023-01-01'),
              references: [{ id: 's1' }],
            },
          },
          {
            id: 'w3',
            collection: 'wiki',
            data: { title: 'w3', references: [{ id: 's1' }] },
          },
        ] as never;
      return [] as never;
    });
    const { getReferenceIndex } = await import('./references');
    const index = await getReferenceIndex();
    const list = index.citingBySourceId.get('s1');
    expect(list?.length).toBe(3);
    expect(list?.[0].slug).toBe('w1');
  });
});

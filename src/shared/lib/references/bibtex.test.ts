import { describe, expect, it } from 'vitest';
import type { CollectionEntry } from 'astro:content';
import { toBibtex, toRIS } from './bibtex';

type SourceEntry = CollectionEntry<'sources'>;

function makeSource(overrides: Partial<SourceEntry['data']> = {}, id = 'my-source'): SourceEntry {
  return {
    id,
    data: {
      type: 'book',
      title: 'Design Patterns',
      author: 'Gamma et al.',
      publisher: 'Addison-Wesley',
      year: 1994,
      ...overrides,
    },
  } as unknown as SourceEntry;
}

describe('toBibtex', () => {
  it('emits @book for type=book', () => {
    const out = toBibtex(makeSource({ type: 'book' }));
    expect(out.startsWith('@book{my-source,')).toBe(true);
    expect(out).toContain('title = {Design Patterns}');
    expect(out).toContain('author = {Gamma et al.}');
    expect(out).toContain('year = {1994}');
  });

  it('emits @article for paper and article types', () => {
    expect(toBibtex(makeSource({ type: 'paper' })).startsWith('@article{')).toBe(true);
    expect(toBibtex(makeSource({ type: 'article' })).startsWith('@article{')).toBe(true);
  });

  it('emits @misc for website/video/talk/other', () => {
    for (const t of ['website', 'video', 'talk', 'other']) {
      expect(toBibtex(makeSource({ type: t as 'website' })).startsWith('@misc{')).toBe(true);
    }
  });

  it('falls back to @misc for unknown type', () => {
    const out = toBibtex(makeSource({ type: 'nonsense' as unknown as 'book' }));
    expect(out.startsWith('@misc{')).toBe(true);
  });

  it('escapes braces and backslashes in field values', () => {
    const out = toBibtex(makeSource({ title: 'foo {bar} \\baz' }));
    expect(out).toContain('title = {foo \\{bar\\} \\\\baz}');
  });

  it('omits missing optional fields', () => {
    const out = toBibtex(makeSource({ author: undefined, year: undefined }));
    expect(out).not.toContain('author = {');
    expect(out).not.toContain('year = {');
  });

  it('includes optional url, doi, isbn when present', () => {
    const out = toBibtex(
      makeSource({ url: 'https://example.com', doi: '10.1/x', isbn: '978-0-1' }),
    );
    expect(out).toContain('url = {https://example.com}');
    expect(out).toContain('doi = {10.1/x}');
    expect(out).toContain('isbn = {978-0-1}');
  });

  it('ends with a closing brace', () => {
    expect(toBibtex(makeSource()).trimEnd().endsWith('}')).toBe(true);
  });
});

describe('toRIS', () => {
  it('emits TY - BOOK for type=book', () => {
    expect(toRIS(makeSource({ type: 'book' })).startsWith('TY  - BOOK')).toBe(true);
  });

  it('emits TY - JOUR for paper and article', () => {
    expect(toRIS(makeSource({ type: 'paper' }))).toContain('TY  - JOUR');
    expect(toRIS(makeSource({ type: 'article' }))).toContain('TY  - JOUR');
  });

  it('emits proper types for website/video/talk', () => {
    expect(toRIS(makeSource({ type: 'website' }))).toContain('TY  - ELEC');
    expect(toRIS(makeSource({ type: 'video' }))).toContain('TY  - VIDEO');
    expect(toRIS(makeSource({ type: 'talk' }))).toContain('TY  - CONF');
  });

  it('falls back to GEN for unknown type', () => {
    expect(toRIS(makeSource({ type: 'other' }))).toContain('TY  - GEN');
    expect(toRIS(makeSource({ type: 'unknown' as unknown as 'book' }))).toContain('TY  - GEN');
  });

  it('includes optional fields when present', () => {
    const out = toRIS(makeSource({ url: 'https://x', doi: '10.1/x', isbn: '978' }));
    expect(out).toContain('UR  - https://x');
    expect(out).toContain('DO  - 10.1/x');
    expect(out).toContain('SN  - 978');
  });

  it('omits absent optional fields', () => {
    const out = toRIS(makeSource({ author: undefined, year: undefined }));
    expect(out).not.toContain('AU  -');
    expect(out).not.toContain('PY  -');
  });

  it('ends with ER  - terminator', () => {
    expect(toRIS(makeSource()).endsWith('ER  - ')).toBe(true);
  });
});

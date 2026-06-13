import { describe, expect, it } from 'vitest';
import {
  slugify,
  tagSlug,
  parseDate,
  pickDate,
  maxDate,
  parseTagsArray,
  resolveLastmod,
} from './sitemap-lastmod.mjs';

describe('slugify', () => {
  it('lowercases and dash-replaces', () => {
    expect(slugify('Problem Solving')).toBe('problem-solving');
  });
  it('lowercases bare ASCII (e.g. TIL → til)', () => {
    expect(slugify('TIL')).toBe('til');
  });
  it('preserves Korean syllables as NFC (matches the actual URLs)', () => {
    const out = slugify('BOJ 풀이');
    expect(out).toBe('boj-풀이');
    expect(out).toBe(out.normalize('NFC'));
  });
  it('strips trailing dashes', () => {
    expect(slugify('  weird-name  ')).toBe('weird-name');
  });
  it('handles mixed scripts', () => {
    expect(slugify('Atcoder Beginner Contest 후기')).toBe(
      'atcoder-beginner-contest-후기'.normalize('NFC'),
    );
  });
});

describe('tagSlug', () => {
  it('lowercases without slugifying spaces', () => {
    // Tag pages use raw lowercase; URL encoding happens on emit.
    expect(tagSlug('Binary Search')).toBe('binary search');
  });
  it('preserves Korean', () => {
    expect(tagSlug('문제풀이')).toBe('문제풀이');
  });
});

describe('parseDate', () => {
  it('parses ISO date-only', () => {
    expect(parseDate('2021-09-21')?.toISOString()).toBe('2021-09-21T00:00:00.000Z');
  });
  it('parses ISO with timezone', () => {
    expect(parseDate('2026-05-23T20:18:00+09:00')?.toISOString()).toBe(
      '2026-05-23T11:18:00.000Z',
    );
  });
  it('parses unquoted space-separated datetime with offset', () => {
    expect(parseDate('2021-10-01 23:10:49 +0900')?.toISOString()).toBe(
      '2021-10-01T14:10:49.000Z',
    );
  });
  it('returns null for empty / undefined', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate(undefined as unknown as string)).toBeNull();
  });
  it('returns null for unparseable strings', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });
});

describe('pickDate', () => {
  it('uses first non-empty parseable field in order', () => {
    const yaml = 'updated: 2026-01-01\ndate: 2020-01-01\n';
    expect(pickDate(yaml, ['updated', 'date'])?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
  it('falls back to second field when first absent', () => {
    const yaml = 'date: 2020-01-01\n';
    expect(pickDate(yaml, ['updated', 'date'])?.toISOString()).toBe('2020-01-01T00:00:00.000Z');
  });
  it('returns null when no fields parse', () => {
    expect(pickDate('title: foo\n', ['updated', 'date'])).toBeNull();
  });
});

describe('maxDate', () => {
  it('returns later of two dates', () => {
    const a = new Date('2020-01-01');
    const b = new Date('2024-01-01');
    expect(maxDate(a, b)).toBe(b);
    expect(maxDate(b, a)).toBe(b);
  });
  it('returns the non-null side when one is null', () => {
    const a = new Date('2020-01-01');
    expect(maxDate(null, a)).toBe(a);
    expect(maxDate(a, null)).toBe(a);
  });
  it('returns null when both null', () => {
    expect(maxDate(null, null)).toBeNull();
  });
});

describe('parseTagsArray', () => {
  it('parses inline array without quotes', () => {
    expect(parseTagsArray('tags: [postgresql, mysql, benchmark]\n')).toEqual([
      'postgresql',
      'mysql',
      'benchmark',
    ]);
  });
  it('parses inline array with quotes', () => {
    expect(parseTagsArray("tags: ['a', \"b\", c]\n")).toEqual(['a', 'b', 'c']);
  });
  it('parses block array with hyphen items', () => {
    const yaml = 'date: 2021-09-21\ntags:\n  - Python\n  - 숏코딩\n  - TIL\n';
    expect(parseTagsArray(yaml)).toEqual(['Python', '숏코딩', 'TIL']);
  });
  it('parses block array with zero-indent hyphen items', () => {
    const yaml = 'date: 2021-09-21\ntags:\n- Python\n- TIL\nseries: foo\n';
    expect(parseTagsArray(yaml)).toEqual(['Python', 'TIL']);
  });
  it('parses block array with indented items', () => {
    const yaml = 'tags:\n    - atcoder\n    - 문제풀이\ndate: 2025-02-23\n';
    expect(parseTagsArray(yaml)).toEqual(['atcoder', '문제풀이']);
  });
  it('parses block array with quoted items', () => {
    const yaml = 'tags:\n  - "a tag with spaces"\n  - \'single quoted\'\n';
    expect(parseTagsArray(yaml)).toEqual(['a tag with spaces', 'single quoted']);
  });
  it('returns empty array when no tags field', () => {
    expect(parseTagsArray('title: foo\n')).toEqual([]);
  });
  it('returns empty array for empty inline form', () => {
    expect(parseTagsArray('tags: []\n')).toEqual([]);
  });
  it('does not consume the next field as a tag', () => {
    const yaml = 'tags:\n  - a\n  - b\nseries: foo\n';
    expect(parseTagsArray(yaml)).toEqual(['a', 'b']);
  });
});

describe('resolveLastmod', () => {
  const site = 'https://example.com';
  const map = new Map([
    [`${site}/posts/`, '2026-06-01T00:00:00.000Z'],
    [`${site}/posts/foo/`, '2024-01-15T00:00:00.000Z'],
    [`${site}/posts/category/atcoder/`, '2025-03-30T00:00:00.000Z'],
    [`${site}/tags/python/`, '2024-12-01T00:00:00.000Z'],
  ]);

  it('returns direct match when URL is in the map', () => {
    expect(resolveLastmod(map, `${site}/posts/foo/`)).toBe('2024-01-15T00:00:00.000Z');
  });
  it('falls back to parent list for pagination URLs', () => {
    expect(resolveLastmod(map, `${site}/posts/3/`)).toBe('2026-06-01T00:00:00.000Z');
  });
  it('falls back for nested pagination (category)', () => {
    expect(resolveLastmod(map, `${site}/posts/category/atcoder/2/`)).toBe(
      '2025-03-30T00:00:00.000Z',
    );
  });
  it('returns undefined when no signal at all', () => {
    expect(resolveLastmod(map, `${site}/unknown/`)).toBeUndefined();
  });
  it('strips trailing pagination segment and falls back to the parent', () => {
    expect(resolveLastmod(map, `${site}/posts/foo/3/`)).toBe('2024-01-15T00:00:00.000Z');
  });
  it('does not match numeric slugs that lack a trailing pagination segment', () => {
    expect(resolveLastmod(map, `${site}/posts/css-battle-01/`)).toBeUndefined();
  });
});

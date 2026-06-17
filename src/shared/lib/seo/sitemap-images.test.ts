import { describe, expect, it } from 'vitest';
import { parseField, extractFrontmatter, isDraft, entryToImage } from './sitemap-images.mjs';

describe('parseField', () => {
  it('parses unquoted value', () => {
    expect(parseField('cover: /img/a.png\n', 'cover')).toBe('/img/a.png');
  });
  it('parses double-quoted value', () => {
    expect(parseField('cover: "https://example.com/a.png"\n', 'cover')).toBe(
      'https://example.com/a.png',
    );
  });
  it('parses single-quoted value', () => {
    expect(parseField("title: 'hello world'\n", 'title')).toBe('hello world');
  });
  it('strips inline comments on unquoted values', () => {
    expect(parseField('cover: /img/a.png # the cover\n', 'cover')).toBe('/img/a.png');
  });
  it('returns undefined for missing field', () => {
    expect(parseField('title: foo\n', 'cover')).toBeUndefined();
  });
  it('returns undefined for empty / null sentinel', () => {
    expect(parseField('cover:\n', 'cover')).toBeUndefined();
    expect(parseField('cover: ~\n', 'cover')).toBeUndefined();
    expect(parseField('cover: null\n', 'cover')).toBeUndefined();
  });
  it('matches only at line start (no partial-key match)', () => {
    expect(parseField('coverAlt: alt only\n', 'cover')).toBeUndefined();
  });
});

describe('extractFrontmatter', () => {
  it('extracts YAML block between --- delimiters', () => {
    const text = '---\ntitle: foo\n---\nbody';
    expect(extractFrontmatter(text)).toBe('title: foo');
  });
  it('returns null when no frontmatter', () => {
    expect(extractFrontmatter('just body\n')).toBeNull();
  });
  it('handles CRLF', () => {
    expect(extractFrontmatter('---\r\ntitle: foo\r\n---\r\nbody')).toBe('title: foo');
  });
});

describe('isDraft', () => {
  it('returns true for explicit draft', () => {
    expect(isDraft('draft: true\n')).toBe(true);
  });
  it('returns false for draft: false', () => {
    expect(isDraft('draft: false\n')).toBe(false);
  });
  it('returns false when draft absent', () => {
    expect(isDraft('title: foo\n')).toBe(false);
  });
});

describe('entryToImage', () => {
  const site = 'https://shinkeonkim.com/';

  it('returns null when no cover/thumbnail', () => {
    expect(entryToImage('title: foo\n', site)).toBeNull();
  });
  it('returns null when draft', () => {
    expect(entryToImage('cover: /a.png\ndraft: true\n', site)).toBeNull();
  });
  it('uses cover preferentially', () => {
    const r = entryToImage('cover: /c.png\nthumbnail: /t.png\n', site);
    expect(r?.url).toBe('https://shinkeonkim.com/c.png');
  });
  it('falls back to thumbnail', () => {
    const r = entryToImage('thumbnail: /t.png\n', site);
    expect(r?.url).toBe('https://shinkeonkim.com/t.png');
  });
  it('resolves relative cover to site URL', () => {
    const r = entryToImage('cover: /img/a.png\n', site);
    expect(r?.url).toBe('https://shinkeonkim.com/img/a.png');
  });
  it('keeps absolute http(s) URLs', () => {
    const r = entryToImage('cover: https://cdn.example.com/a.png\n', site);
    expect(r?.url).toBe('https://cdn.example.com/a.png');
  });
  it('attaches title when present', () => {
    const r = entryToImage('cover: /a.png\ntitle: My Post\n', site);
    expect(r?.title).toBe('My Post');
  });
  it('attaches caption from description', () => {
    const r = entryToImage('cover: /a.png\ndescription: A post about X\n', site);
    expect(r?.caption).toBe('A post about X');
  });
  it('uses description for caption when both description and coverAlt present (description has priority)', () => {
    const r = entryToImage(
      'cover: /a.png\ndescription: long desc\ncoverAlt: short alt\n',
      site,
    );
    expect(r?.caption).toBe('long desc');
  });
});

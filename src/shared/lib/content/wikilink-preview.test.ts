import { describe, expect, it } from 'vitest';
import { normKey, previewOf, stripMarkdown } from './wikilink-preview';

describe('stripMarkdown', () => {
  it('removes frontmatter blocks', () => {
    const body = '---\ntitle: x\n---\ncontent here';
    expect(stripMarkdown(body)).toBe('content here');
  });

  it('removes fenced code blocks', () => {
    expect(stripMarkdown('prefix ```ts\nlots of code\n``` suffix')).toBe('prefix suffix');
  });

  it('removes inline code spans', () => {
    expect(stripMarkdown('use `x + y` in the loop')).toBe('use in the loop');
  });

  it('resolves wikilinks with alias to alias text', () => {
    expect(stripMarkdown('see [[python|파이썬]] docs')).toBe('see 파이썬 docs');
  });

  it('drops wikilinks without alias (no capture group)', () => {
    expect(stripMarkdown('see [[python]] docs')).toBe('see docs');
  });

  it('removes image markdown but keeps text', () => {
    expect(stripMarkdown('start ![alt](/img.png) end')).toBe('start end');
  });

  it('preserves link text while stripping URL', () => {
    expect(stripMarkdown('read [our post](/posts/x) here')).toBe('read our post here');
  });

  it('removes heading hashes', () => {
    expect(stripMarkdown('# Title\ncontent')).toBe('Title content');
  });

  it('removes blockquote markers', () => {
    expect(stripMarkdown('> quoted line\n> another')).toBe('quoted line another');
  });

  it('removes emphasis markers', () => {
    expect(stripMarkdown('__bold__ *italic* ~strike~')).toBe('bold italic strike');
  });

  it('collapses whitespace runs and trims', () => {
    expect(stripMarkdown('  a    b\n\n\nc  ')).toBe('a b c');
  });
});

describe('previewOf', () => {
  it('returns full stripped body when shorter than max', () => {
    expect(previewOf('short body', 100)).toBe('short body');
  });

  it('truncates with ellipsis when longer than max', () => {
    const long = 'x'.repeat(200);
    const preview = previewOf(long, 50);
    expect(preview).toHaveLength(50);
    expect(preview.endsWith('…')).toBe(true);
  });
});

describe('normKey', () => {
  it('NFC-normalizes and lowercases input', () => {
    expect(normKey('Python')).toBe('python');
    expect(normKey('ABC')).toBe('abc');
  });

  it('produces same key for NFC/NFD forms of Korean', () => {
    const nfc = '가나다';
    const nfd = nfc.normalize('NFD');
    expect(normKey(nfd)).toBe(normKey(nfc));
  });
});

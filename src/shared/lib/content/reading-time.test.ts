import { describe, expect, it } from 'vitest';
import { estimateReadingTime } from './reading-time';

describe('estimateReadingTime', () => {
  it('returns at least 1 minute for empty body', () => {
    const r = estimateReadingTime('');
    expect(r.cjkChars).toBe(0);
    expect(r.asciiWords).toBe(0);
    expect(r.minutes).toBeGreaterThanOrEqual(1);
  });

  it('counts ASCII words ignoring punctuation', () => {
    const r = estimateReadingTime('hello, world! this is a test.');
    expect(r.asciiWords).toBe(6);
  });

  it('counts CJK characters', () => {
    const text = '안녕하세요 김신건입니다';
    const r = estimateReadingTime(text);
    expect(r.cjkChars).toBeGreaterThanOrEqual(10);
  });

  it('ignores fenced code blocks', () => {
    const withCode = 'short text ```ts\nlots of code that should not count\nwords words words\n```';
    const withoutCode = 'short text';
    const r1 = estimateReadingTime(withCode);
    const r2 = estimateReadingTime(withoutCode);
    expect(r1.asciiWords).toBe(r2.asciiWords);
  });

  it('ignores HTML tags', () => {
    const html = '<div class="foo">hello</div> world';
    const plain = 'hello world';
    expect(estimateReadingTime(html).asciiWords).toBe(estimateReadingTime(plain).asciiWords);
  });

  it('scales minutes with content length', () => {
    const short = 'word '.repeat(100);
    const long = 'word '.repeat(2000);
    expect(estimateReadingTime(long).minutes).toBeGreaterThan(estimateReadingTime(short).minutes);
  });
});

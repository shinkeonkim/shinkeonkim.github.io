import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheKeyFor, hostnameFor, loadUrlPreviews } from './url-preview';

describe('cacheKeyFor', () => {
  it('strips URL hash', () => {
    expect(cacheKeyFor('https://example.com/path#anchor')).toBe('https://example.com/path');
  });

  it('preserves query string', () => {
    expect(cacheKeyFor('https://example.com/path?q=1')).toBe('https://example.com/path?q=1');
  });

  it('returns raw value for invalid URL', () => {
    expect(cacheKeyFor('not-a-url')).toBe('not-a-url');
  });
});

describe('hostnameFor', () => {
  it('extracts hostname from URL', () => {
    expect(hostnameFor('https://example.com/path')).toBe('example.com');
    expect(hostnameFor('https://sub.example.co.kr/x')).toBe('sub.example.co.kr');
  });

  it('returns raw value for invalid URL', () => {
    expect(hostnameFor('not-a-url')).toBe('not-a-url');
  });
});

describe('loadUrlPreviews', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns a preview cache object', async () => {
    const mod = await import('./url-preview');
    const cache = await mod.loadUrlPreviews();
    expect(typeof cache).toBe('object');
    expect(cache).not.toBeNull();
  });

  it('memoizes the result across calls', async () => {
    const first = await loadUrlPreviews();
    const second = await loadUrlPreviews();
    expect(first).toBe(second);
  });
});

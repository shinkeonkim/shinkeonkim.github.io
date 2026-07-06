import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => {
  const readFile = vi.fn();
  return {
    readFile,
    default: { readFile },
  };
});

import { readFile } from 'node:fs/promises';

const readFileMock = vi.mocked(readFile);

describe('giscus-counts module', () => {
  beforeEach(() => {
    vi.resetModules();
    readFileMock.mockReset();
  });

  it('getCommentCount returns count for a known slug', async () => {
    readFileMock.mockResolvedValue(
      JSON.stringify({
        generatedAt: '2024',
        counts: { 'posts/hello': { comments: 5, reactions: 3 } },
      }) as unknown as string,
    );
    const mod = await import('./giscus-counts');
    expect(await mod.getCommentCount('posts/hello')).toBe(5);
  });

  it('getCommentCount returns 0 for unknown slug', async () => {
    readFileMock.mockResolvedValue(
      JSON.stringify({ generatedAt: '', counts: {} }) as unknown as string,
    );
    const mod = await import('./giscus-counts');
    expect(await mod.getCommentCount('missing')).toBe(0);
  });

  it('getCounts returns full record for a slug', async () => {
    readFileMock.mockResolvedValue(
      JSON.stringify({
        generatedAt: '',
        counts: { x: { comments: 2, reactions: 8 } },
      }) as unknown as string,
    );
    const mod = await import('./giscus-counts');
    expect(await mod.getCounts('x')).toEqual({ comments: 2, reactions: 8 });
  });

  it('getCounts returns zeros for missing slug', async () => {
    readFileMock.mockResolvedValue(
      JSON.stringify({ generatedAt: '', counts: {} }) as unknown as string,
    );
    const mod = await import('./giscus-counts');
    expect(await mod.getCounts('missing')).toEqual({ comments: 0, reactions: 0 });
  });

  it('returns defaults when cache file cannot be read', async () => {
    readFileMock.mockRejectedValue(new Error('ENOENT'));
    const mod = await import('./giscus-counts');
    expect(await mod.getCommentCount('any')).toBe(0);
  });

  it('memoizes load across multiple calls', async () => {
    readFileMock.mockResolvedValue(
      JSON.stringify({ generatedAt: '', counts: {} }) as unknown as string,
    );
    const mod = await import('./giscus-counts');
    await mod.getCommentCount('a');
    await mod.getCounts('b');
    expect(readFileMock).toHaveBeenCalledTimes(1);
  });
});

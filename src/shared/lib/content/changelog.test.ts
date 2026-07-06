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

const sample = {
  'posts:hello': [
    {
      sha: 'aaa',
      shortSha: 'aaa',
      date: '2024-01-01',
      subject: 'Initial commit',
      insertions: 10,
      deletions: 0,
      major: false,
      url: 'https://github.com/x/y/commit/aaa',
    },
  ],
};

describe('changelog module', () => {
  beforeEach(() => {
    vi.resetModules();
    readFileMock.mockReset();
  });

  it('loadChangelog returns parsed changelog map', async () => {
    readFileMock.mockResolvedValue(JSON.stringify(sample) as unknown as string);
    const mod = await import('./changelog');
    const result = await mod.loadChangelog();
    expect(result['posts:hello']).toHaveLength(1);
  });

  it('loadChangelog returns empty map on read failure', async () => {
    readFileMock.mockRejectedValue(new Error('ENOENT'));
    const mod = await import('./changelog');
    expect(await mod.loadChangelog()).toEqual({});
  });

  it('loadChangelog returns empty map on parse failure', async () => {
    readFileMock.mockResolvedValue('not json' as unknown as string);
    const mod = await import('./changelog');
    expect(await mod.loadChangelog()).toEqual({});
  });

  it('loadChangelog caches after first successful read', async () => {
    readFileMock.mockResolvedValue(JSON.stringify(sample) as unknown as string);
    const mod = await import('./changelog');
    await mod.loadChangelog();
    await mod.loadChangelog();
    expect(readFileMock).toHaveBeenCalledTimes(1);
  });

  it('getChangelogFor returns entries for a specific slug', async () => {
    readFileMock.mockResolvedValue(JSON.stringify(sample) as unknown as string);
    const mod = await import('./changelog');
    const entries = await mod.getChangelogFor('posts', 'hello');
    expect(entries).toHaveLength(1);
    expect(entries[0].sha).toBe('aaa');
  });

  it('getChangelogFor returns empty array for missing slug', async () => {
    readFileMock.mockResolvedValue(JSON.stringify(sample) as unknown as string);
    const mod = await import('./changelog');
    expect(await mod.getChangelogFor('posts', 'nonexistent')).toEqual([]);
    expect(await mod.getChangelogFor('wiki', 'nothing')).toEqual([]);
    expect(await mod.getChangelogFor('notes', 'nothing')).toEqual([]);
  });
});

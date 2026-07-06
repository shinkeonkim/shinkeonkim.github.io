import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => {
  const readdir = vi.fn();
  const readFile = vi.fn();
  return {
    readdir,
    readFile,
    default: { readdir, readFile },
  };
});

import { readdir, readFile } from 'node:fs/promises';
import { listAnimationFiles, loadAllAnimations, loadAnimation } from './loader';

const readdirMock = vi.mocked(readdir);
const readFileMock = vi.mocked(readFile);

const validAnim = {
  id: 'sample-anim',
  title: 'Sample',
  elements: [],
  chapters: [],
  effects: [],
};

describe('listAnimationFiles', () => {
  beforeEach(() => {
    readdirMock.mockReset();
  });

  it('returns only .json files', async () => {
    readdirMock.mockResolvedValue(['a.json', 'b.png', 'c.json'] as unknown as never);
    expect(await listAnimationFiles()).toEqual(['a.json', 'c.json']);
  });

  it('returns empty array when readdir throws', async () => {
    readdirMock.mockRejectedValue(new Error('ENOENT'));
    expect(await listAnimationFiles()).toEqual([]);
  });
});

describe('loadAnimation', () => {
  beforeEach(() => {
    readFileMock.mockReset();
  });

  it('rejects IDs that fail the regex', async () => {
    expect(await loadAnimation('UPPER')).toBeNull();
    expect(await loadAnimation('-starts-with-dash')).toBeNull();
    expect(await loadAnimation('has space')).toBeNull();
  });

  it('returns null when file cannot be read', async () => {
    readFileMock.mockRejectedValue(new Error('ENOENT'));
    expect(await loadAnimation('valid-id')).toBeNull();
  });

  it('returns null when JSON is malformed', async () => {
    readFileMock.mockResolvedValue('not json' as unknown as string);
    expect(await loadAnimation('valid-id')).toBeNull();
  });

  it('returns null when schema validation fails', async () => {
    readFileMock.mockResolvedValue(JSON.stringify({ id: 'INVALID CAPS' }) as unknown as string);
    expect(await loadAnimation('valid-id')).toBeNull();
  });

  it('returns parsed data when file is valid', async () => {
    readFileMock.mockResolvedValue(JSON.stringify(validAnim) as unknown as string);
    const result = await loadAnimation('sample-anim');
    expect(result?.id).toBe('sample-anim');
  });
});

describe('loadAllAnimations', () => {
  beforeEach(() => {
    readdirMock.mockReset();
    readFileMock.mockReset();
  });

  it('loads and filters all valid animations', async () => {
    readdirMock.mockResolvedValue(['a.json', 'b.json'] as unknown as never);
    readFileMock
      .mockResolvedValueOnce(JSON.stringify({ ...validAnim, id: 'a' }) as unknown as string)
      .mockResolvedValueOnce('malformed' as unknown as string);
    const result = await loadAllAnimations();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('returns empty array when directory is empty', async () => {
    readdirMock.mockResolvedValue([] as unknown as never);
    expect(await loadAllAnimations()).toEqual([]);
  });
});

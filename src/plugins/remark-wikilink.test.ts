import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => {
  const readFileSync = vi.fn();
  const readdirSync = vi.fn();
  const existsSync = vi.fn();
  return {
    default: { readFileSync, readdirSync, existsSync },
    readFileSync,
    readdirSync,
    existsSync,
  };
});

import fs from 'node:fs';

interface MdNode {
  type: string;
  value?: string;
  url?: string;
  title?: string;
  children?: MdNode[];
  data?: { hProperties?: Record<string, unknown> };
}

function tree(node: MdNode): MdNode {
  return { type: 'root', children: [node] };
}

const readFileSyncMock = vi.mocked(fs.readFileSync);
const readdirSyncMock = vi.mocked(fs.readdirSync);
const existsSyncMock = vi.mocked(fs.existsSync);

function dirent(name: string, isDirectory = false): { name: string; isDirectory: () => boolean } {
  return { name, isDirectory: () => isDirectory };
}

describe('remarkWikilink', () => {
  beforeEach(() => {
    readFileSyncMock.mockReset();
    readdirSyncMock.mockReset();
    existsSyncMock.mockReset();
  });

  it('resolves [[target]] to link when a matching file exists', async () => {
    vi.resetModules();
    existsSyncMock.mockImplementation((p) => String(p).endsWith('posts'));
    readdirSyncMock.mockReturnValue([dirent('python.md')] as never);
    readFileSyncMock.mockReturnValue('---\ntitle: Python\n---\nbody' as unknown as string);
    const mod = await import('./remark-wikilink.mjs');
    const t = tree({ type: 'text', value: 'see [[python]] doc' });
    mod.default()(t as never);
    const link = t.children?.find((c) => c.type === 'link');
    expect(link).toBeDefined();
    expect(link?.url).toBe('/posts/python/');
  });

  it('marks broken wikilinks with class and aria-disabled', async () => {
    vi.resetModules();
    existsSyncMock.mockReturnValue(false);
    readdirSyncMock.mockReturnValue([] as never);
    const mod = await import('./remark-wikilink.mjs');
    const t = tree({ type: 'text', value: '[[nonexistent]]' });
    mod.default()(t as never);
    const link = t.children?.find((c) => c.type === 'link');
    expect(link?.url).toBe('#');
    expect(link?.data?.hProperties?.['aria-disabled']).toBe('true');
    const cls = link?.data?.hProperties?.className as string[];
    expect(cls).toContain('broken');
  });

  it('applies alias display text when present', async () => {
    vi.resetModules();
    existsSyncMock.mockImplementation((p) => String(p).endsWith('wiki'));
    readdirSyncMock.mockReturnValue([dirent('django.md')] as never);
    readFileSyncMock.mockReturnValue('---\ntitle: Django\n---\nbody' as unknown as string);
    const mod = await import('./remark-wikilink.mjs');
    const t = tree({ type: 'text', value: '[[django|장고]]' });
    mod.default()(t as never);
    const link = t.children?.find((c) => c.type === 'link');
    expect(link?.children?.[0].value).toBe('장고');
  });

  it('appends heading anchor when specified', async () => {
    vi.resetModules();
    existsSyncMock.mockImplementation((p) => String(p).endsWith('wiki'));
    readdirSyncMock.mockReturnValue([dirent('django.md')] as never);
    readFileSyncMock.mockReturnValue('---\ntitle: Django\n---\nbody' as unknown as string);
    const mod = await import('./remark-wikilink.mjs');
    const t = tree({ type: 'text', value: '[[django#models]]' });
    mod.default()(t as never);
    const link = t.children?.find((c) => c.type === 'link');
    expect(link?.url).toContain('#models');
  });

  it('handles inline aliases block in frontmatter', async () => {
    vi.resetModules();
    existsSyncMock.mockImplementation((p) => String(p).endsWith('posts'));
    readdirSyncMock.mockReturnValue([dirent('py.md')] as never);
    readFileSyncMock.mockReturnValue(
      "---\ntitle: Python\naliases: ['py', 'python']\n---\nbody" as unknown as string,
    );
    const mod = await import('./remark-wikilink.mjs');
    const t = tree({ type: 'text', value: 'see [[py]] docs' });
    mod.default()(t as never);
    const link = t.children?.find((c) => c.type === 'link');
    expect(link).toBeDefined();
  });

  it('leaves text without wikilinks untouched', async () => {
    vi.resetModules();
    existsSyncMock.mockReturnValue(false);
    readdirSyncMock.mockReturnValue([] as never);
    const mod = await import('./remark-wikilink.mjs');
    const t = tree({ type: 'text', value: 'no wikilinks here' });
    mod.default()(t as never);
    expect(t.children?.[0].type).toBe('text');
  });
});

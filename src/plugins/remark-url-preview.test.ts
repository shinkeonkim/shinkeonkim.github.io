import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => {
  const readFileSync = vi.fn();
  return {
    default: { readFileSync },
    readFileSync,
  };
});

import fs from 'node:fs';
import remarkUrlPreview from './remark-url-preview.mjs';

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
}

function tree(node: MdNode): MdNode {
  return { type: 'root', children: [node] };
}

const readFileSyncMock = vi.mocked(fs.readFileSync);

describe('remarkUrlPreview', () => {
  beforeEach(() => {
    readFileSyncMock.mockReset();
  });

  it('renders card HTML from cached preview data', () => {
    readFileSyncMock.mockReturnValue(
      JSON.stringify({
        'https://example.com/': {
          title: 'Example',
          description: 'Site description',
          image: 'https://example.com/img.png',
          favicon: 'https://example.com/favicon.ico',
          siteName: 'Example Site',
          fetchedAt: '2024-01-01',
        },
      }) as unknown as string,
    );
    const t = tree({
      type: 'text',
      value: 'see <UrlPreview url="https://example.com/" /> for details',
    });
    remarkUrlPreview()(t as never);
    const children = t.children as MdNode[];
    const card = children.find((c) => c.type === 'html');
    expect(card).toBeDefined();
    expect(card?.value).toContain('url-preview-card');
    expect(card?.value).toContain('Example');
  });

  it('renders fallback card when URL not in cache', () => {
    readFileSyncMock.mockReturnValue('{}' as unknown as string);
    const t = tree({ type: 'text', value: '<UrlPreview url="https://uncached.com/" />' });
    remarkUrlPreview()(t as never);
    const card = t.children?.find((c) => c.type === 'html');
    expect(card).toBeDefined();
    expect(card?.value).toContain('uncached.com');
  });

  it('handles broken cache file gracefully', () => {
    readFileSyncMock.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const t = tree({ type: 'text', value: '<UrlPreview url="https://x.io/" />' });
    remarkUrlPreview()(t as never);
    expect(t.children?.[0].type).toBe('html');
  });

  it('handles invalid URLs by using raw value as hostname', () => {
    readFileSyncMock.mockReturnValue('{}' as unknown as string);
    const t = tree({ type: 'text', value: '<UrlPreview url="not-a-url" />' });
    remarkUrlPreview()(t as never);
    const card = t.children?.find((c) => c.type === 'html');
    expect(card).toBeDefined();
    expect(card?.value).toContain('not-a-url');
  });

  it('leaves text without UrlPreview tags unchanged', () => {
    readFileSyncMock.mockReturnValue('{}' as unknown as string);
    const t = tree({ type: 'text', value: 'plain paragraph' });
    remarkUrlPreview()(t as never);
    expect(t.children?.[0].value).toBe('plain paragraph');
  });

  it('preserves surrounding text around the tag', () => {
    readFileSyncMock.mockReturnValue('{}' as unknown as string);
    const t = tree({
      type: 'text',
      value: 'before <UrlPreview url="https://a.com/" /> after',
    });
    remarkUrlPreview()(t as never);
    const children = t.children as MdNode[];
    expect(children.some((c) => c.value?.includes('before'))).toBe(true);
    expect(children.some((c) => c.value?.includes('after'))).toBe(true);
  });

  it('handles multiple tags in one text node', () => {
    readFileSyncMock.mockReturnValue('{}' as unknown as string);
    const t = tree({
      type: 'text',
      value: '<UrlPreview url="https://a.com/" /> and <UrlPreview url="https://b.com/" />',
    });
    remarkUrlPreview()(t as never);
    const htmlNodes = (t.children as MdNode[]).filter((c) => c.type === 'html');
    expect(htmlNodes.length).toBeGreaterThanOrEqual(2);
  });

  it('processes html nodes as well as text nodes', () => {
    readFileSyncMock.mockReturnValue('{}' as unknown as string);
    const t = tree({ type: 'html', value: '<UrlPreview url="https://x.io/" />' });
    remarkUrlPreview()(t as never);
    const card = t.children?.find((c) => c.type === 'html' && c.value?.includes('url-preview-card'));
    expect(card).toBeDefined();
  });
});

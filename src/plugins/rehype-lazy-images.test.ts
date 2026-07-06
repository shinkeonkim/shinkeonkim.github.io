import { describe, expect, it } from 'vitest';
import rehypeLazyImages from './rehype-lazy-images.mjs';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function tree(root: HastNode): HastNode {
  return { type: 'root', children: [root] };
}

describe('rehypeLazyImages', () => {
  it('adds loading=lazy and decoding=async to internal img', () => {
    const img: HastNode = { type: 'element', tagName: 'img', properties: { src: '/foo.png' } };
    const t = tree(img);
    rehypeLazyImages()(t as never);
    expect(img.properties?.loading).toBe('lazy');
    expect(img.properties?.decoding).toBe('async');
    expect(img.properties?.fetchpriority).toBe('low');
  });

  it('leaves fetchpriority undefined for external images', () => {
    const img: HastNode = {
      type: 'element',
      tagName: 'img',
      properties: { src: 'https://example.com/x.png' },
    };
    rehypeLazyImages()(tree(img) as never);
    expect(img.properties?.loading).toBe('lazy');
    expect(img.properties?.fetchpriority).toBeUndefined();
  });

  it('skips priority images (data-eager)', () => {
    const img: HastNode = {
      type: 'element',
      tagName: 'img',
      properties: { src: '/x.png', 'data-eager': true },
    };
    rehypeLazyImages()(tree(img) as never);
    expect(img.properties?.loading).toBeUndefined();
  });

  it('skips when dataPriority marks eager-loading or priority', () => {
    const img: HastNode = {
      type: 'element',
      tagName: 'img',
      properties: { src: '/x.png', dataPriority: 'priority' },
    };
    rehypeLazyImages()(tree(img) as never);
    expect(img.properties?.loading).toBeUndefined();
  });

  it('preserves existing loading and decoding', () => {
    const img: HastNode = {
      type: 'element',
      tagName: 'img',
      properties: { src: '/x.png', loading: 'eager', decoding: 'sync' },
    };
    rehypeLazyImages()(tree(img) as never);
    expect(img.properties?.loading).toBe('eager');
    expect(img.properties?.decoding).toBe('sync');
  });

  it('ignores non-img elements', () => {
    const p: HastNode = { type: 'element', tagName: 'p', properties: {} };
    rehypeLazyImages()(tree(p) as never);
    expect(p.properties?.loading).toBeUndefined();
  });

  it('creates properties object when missing', () => {
    const img: HastNode = { type: 'element', tagName: 'img' };
    rehypeLazyImages()(tree(img) as never);
    expect(img.properties).toBeDefined();
    expect(img.properties?.loading).toBe('lazy');
  });
});

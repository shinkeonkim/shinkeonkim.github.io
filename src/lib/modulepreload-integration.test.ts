import { describe, expect, it } from 'vitest';
import { buildPreloadTags, collectChunkRefs } from './modulepreload-integration.mjs';

const vendors = new Map<string, string>([
  ['vendor-three', '/_astro/vendor-three.AbCd1234.js'],
  ['vendor-d3', '/_astro/vendor-d3.EfGh5678.js'],
  ['vendor-katex', '/_astro/vendor-katex.IjKl9012.js'],
]);

describe('collectChunkRefs', () => {
  it('extracts all _astro/*.js references', () => {
    const html = `<script src="/_astro/Hero3D.AbC123.js"></script><link href="/_astro/Graph.XyZ987.js">`;
    const refs = collectChunkRefs(html);
    expect(refs.has('Hero3D.AbC123.js')).toBe(true);
    expect(refs.has('Graph.XyZ987.js')).toBe(true);
  });
  it('returns empty set when no chunks present', () => {
    expect(collectChunkRefs('<html>no chunks</html>').size).toBe(0);
  });
});

describe('buildPreloadTags', () => {
  const chunkToVendors = new Map<string, Set<string>>([
    ['Hero3D.AbC123.js', new Set(['/_astro/vendor-three.AbCd1234.js'])],
    ['Graph.XyZ987.js', new Set([
      '/_astro/vendor-three.AbCd1234.js',
      '/_astro/vendor-d3.EfGh5678.js',
    ])],
  ]);

  it('preloads vendors transitively required via referenced chunks', () => {
    const html = `<script src="/_astro/Hero3D.AbC123.js"></script>`;
    const tags = buildPreloadTags(html, vendors, chunkToVendors);
    expect(tags).toContain('vendor-three.AbCd1234.js');
    expect(tags).not.toContain('vendor-d3');
    expect(tags).not.toContain('vendor-katex');
  });

  it('unions vendors across multiple referenced chunks', () => {
    const html = `<script src="/_astro/Graph.XyZ987.js"></script>`;
    const tags = buildPreloadTags(html, vendors, chunkToVendors);
    expect(tags).toContain('vendor-three.AbCd1234.js');
    expect(tags).toContain('vendor-d3.EfGh5678.js');
  });

  it('preloads vendor chunk when directly referenced in HTML', () => {
    const html = `<script src="/_astro/vendor-three.AbCd1234.js"></script>`;
    const tags = buildPreloadTags(html, vendors, chunkToVendors);
    expect(tags).toContain('vendor-three.AbCd1234.js');
  });

  it('returns empty string when no chunks referenced', () => {
    const tags = buildPreloadTags('<html>no chunks here</html>', vendors, chunkToVendors);
    expect(tags).toBe('');
  });

  it('uses rel=modulepreload with crossorigin', () => {
    const html = `<script src="/_astro/Hero3D.AbC123.js"></script>`;
    const tags = buildPreloadTags(html, vendors, chunkToVendors);
    expect(tags).toMatch(/rel="modulepreload"/);
    expect(tags).toMatch(/crossorigin/);
  });
});

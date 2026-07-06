import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => {
  const readdir = vi.fn();
  const readFile = vi.fn();
  const writeFile = vi.fn();
  return {
    readdir,
    readFile,
    writeFile,
    default: { readdir, readFile, writeFile },
  };
});

import { readFile, readdir, writeFile } from 'node:fs/promises';
import modulepreloadIntegration, {
  buildChunkVendorMap,
  buildPreloadTags,
  collectChunkRefs,
  findVendorChunks,
  walkHtml,
} from './modulepreload-integration.mjs';

const readdirMock = vi.mocked(readdir);
const readFileMock = vi.mocked(readFile);
const writeFileMock = vi.mocked(writeFile);

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

describe('findVendorChunks', () => {
  beforeEach(() => {
    readdirMock.mockReset();
  });

  it('extracts vendor-* JS filenames', async () => {
    readdirMock.mockResolvedValue([
      'vendor-three.abc.js',
      'vendor-d3.def.js',
      'index.xyz.js',
      'Hero3D.hij.js',
    ] as never);
    const result = await findVendorChunks('/dist/_astro');
    expect(result.get('vendor-three')).toBe('/_astro/vendor-three.abc.js');
    expect(result.get('vendor-d3')).toBe('/_astro/vendor-d3.def.js');
    expect(result.has('index')).toBe(false);
  });

  it('returns empty map when directory unreadable', async () => {
    readdirMock.mockRejectedValue(new Error('ENOENT'));
    const result = await findVendorChunks('/nonexistent');
    expect(result.size).toBe(0);
  });
});

describe('walkHtml', () => {
  beforeEach(() => {
    readdirMock.mockReset();
  });

  it('yields nested html paths recursively', async () => {
    readdirMock
      .mockResolvedValueOnce([
        { name: 'index.html', isDirectory: () => false },
        { name: 'sub', isDirectory: () => true },
      ] as never)
      .mockResolvedValueOnce([
        { name: 'page.html', isDirectory: () => false },
        { name: 'skip.txt', isDirectory: () => false },
      ] as never);
    const results: string[] = [];
    for await (const p of walkHtml('/dist')) results.push(p);
    expect(results.some((p) => p.endsWith('index.html'))).toBe(true);
    expect(results.some((p) => p.endsWith('page.html'))).toBe(true);
  });

  it('returns nothing when directory unreadable', async () => {
    readdirMock.mockRejectedValue(new Error('ENOENT'));
    const results: string[] = [];
    for await (const p of walkHtml('/nonexistent')) results.push(p);
    expect(results).toHaveLength(0);
  });
});

describe('buildChunkVendorMap', () => {
  beforeEach(() => {
    readdirMock.mockReset();
    readFileMock.mockReset();
  });

  it('resolves direct vendor imports for each chunk', async () => {
    readdirMock.mockResolvedValue([
      'Hero3D.abc.js',
      'vendor-three.def.js',
    ] as never);
    readFileMock.mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p.includes('Hero3D')) return 'import { x } from "./vendor-three.def.js";';
      return '';
    });
    const vendorsMap = new Map([['vendor-three', '/_astro/vendor-three.def.js']]);
    const result = await buildChunkVendorMap('/dist/_astro', vendorsMap);
    expect(result.get('Hero3D.abc.js')?.has('/_astro/vendor-three.def.js')).toBe(true);
  });

  it('resolves transitive vendors through intermediary chunks', async () => {
    readdirMock.mockResolvedValue([
      'A.js',
      'B.js',
      'vendor-d3.def.js',
    ] as never);
    readFileMock.mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p.includes('A.js')) return 'import { b } from "./B.js";';
      if (p.includes('B.js')) return 'import { v } from "./vendor-d3.def.js";';
      return '';
    });
    const vendorsMap = new Map([['vendor-d3', '/_astro/vendor-d3.def.js']]);
    const result = await buildChunkVendorMap('/dist/_astro', vendorsMap);
    expect(result.get('A.js')?.has('/_astro/vendor-d3.def.js')).toBe(true);
  });

  it('prevents infinite loops on circular imports', async () => {
    readdirMock.mockResolvedValue(['A.js', 'B.js'] as never);
    readFileMock.mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p.includes('A.js')) return 'import { b } from "./B.js";';
      if (p.includes('B.js')) return 'import { a } from "./A.js";';
      return '';
    });
    const result = await buildChunkVendorMap('/dist/_astro', new Map());
    expect(result.size).toBe(0);
  });

  it('returns empty map when directory unreadable', async () => {
    readdirMock.mockRejectedValue(new Error('ENOENT'));
    const result = await buildChunkVendorMap('/nonexistent', new Map());
    expect(result.size).toBe(0);
  });

  it('skips chunks whose files cannot be read', async () => {
    readdirMock.mockResolvedValue(['broken.js'] as never);
    readFileMock.mockRejectedValue(new Error('IO'));
    const result = await buildChunkVendorMap('/dist/_astro', new Map());
    expect(result.size).toBe(0);
  });
});

describe('modulepreloadIntegration default export', () => {
  beforeEach(() => {
    readdirMock.mockReset();
    readFileMock.mockReset();
    writeFileMock.mockReset();
  });

  it('returns Astro integration with astro:build:done hook', () => {
    const integration = modulepreloadIntegration();
    expect(integration.name).toBe('modulepreload-integration');
    expect(typeof integration.hooks['astro:build:done']).toBe('function');
  });

  it('logs and returns early when no vendor chunks found', async () => {
    readdirMock.mockResolvedValue([] as never);
    const integration = modulepreloadIntegration();
    const infoLog = vi.fn();
    await integration.hooks['astro:build:done']({
      dir: { pathname: '/dist/' },
      logger: { info: infoLog },
    } as never);
    expect(infoLog).toHaveBeenCalledWith(expect.stringContaining('no vendor chunks'));
  });

  it('patches HTML files when vendors are present', async () => {
    readdirMock.mockImplementation(async (path: unknown, opts?: unknown) => {
      const p = String(path);
      if (opts && typeof opts === 'object' && 'withFileTypes' in opts) {
        return [{ name: 'index.html', isDirectory: () => false }] as never;
      }
      if (p.endsWith('_astro')) return ['vendor-x.abc.js', 'chunk.def.js'] as unknown as never;
      return [] as never;
    });
    readFileMock.mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p.includes('index.html')) {
        return '<html><head></head><body><script src="/_astro/chunk.def.js"></script></body></html>' as unknown as string;
      }
      if (p.includes('chunk.def')) return 'import { v } from "./vendor-x.abc.js";' as unknown as string;
      return '' as unknown as string;
    });
    const integration = modulepreloadIntegration();
    const infoLog = vi.fn();
    await integration.hooks['astro:build:done']({
      dir: { pathname: '/dist/' },
      logger: { info: infoLog },
    } as never);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });
});

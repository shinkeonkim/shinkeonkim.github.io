// Astro integration that, after build, injects <link rel="modulepreload"> for
// vendor chunks (vendor-three, vendor-d3, ...) into HTML pages whose loaded
// chunks dynamically import them. Vite emits dynamic-import chunks without
// static modulepreload hints, so we add them post-hoc to reduce TTI on heavy
// pages (e.g. /graph/, posts with KaTeX).
//
// Algorithm:
//   1. Enumerate /_astro/vendor-*.<hash>.js — these are the targets.
//   2. For each .js chunk, scan its source for references to vendor chunks
//      → build a "chunk → set<vendor>" transitive map.
//   3. For each HTML file, find chunks it loads (via script src or transitive
//      modulepreload tags inserted by Vite), union their vendor dependencies.
//   4. Inject <link rel="modulepreload"> for each required vendor chunk.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';

const ASTRO_DIR = '_astro';

async function findVendorChunks(astroDir) {
  let entries;
  try {
    entries = await readdir(astroDir);
  } catch {
    return new Map();
  }
  const map = new Map();
  for (const name of entries) {
    if (!name.endsWith('.js')) continue;
    const m = name.match(/^(vendor-[a-z0-9]+)\./);
    if (!m) continue;
    map.set(m[1], `/${ASTRO_DIR}/${name}`);
  }
  return map;
}

async function buildChunkVendorMap(astroDir, vendors) {
  let entries;
  try {
    entries = await readdir(astroDir);
  } catch {
    return new Map();
  }

  const allJsFiles = entries.filter((n) => n.endsWith('.js'));
  const vendorNames = new Set();
  for (const [, vendorHref] of vendors) vendorNames.add(basename(vendorHref));

  const directImports = new Map();
  await Promise.all(
    allJsFiles.map(async (name) => {
      let src;
      try {
        src = await readFile(join(astroDir, name), 'utf-8');
      } catch {
        return;
      }
      const imports = new Set();
      const re = /(?:from\s*["']|import\s*\(\s*["'])\.\/([A-Za-z0-9._-]+\.js)["']/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        if (m[1] !== name) imports.add(m[1]);
      }
      directImports.set(name, imports);
    }),
  );

  const vendorClosure = new Map();
  function resolveVendors(name, visiting) {
    if (vendorClosure.has(name)) return vendorClosure.get(name);
    if (visiting.has(name)) return new Set();
    visiting.add(name);
    const out = new Set();
    const direct = directImports.get(name) ?? new Set();
    for (const imp of direct) {
      if (vendorNames.has(imp)) {
        for (const [vName, vHref] of vendors) {
          if (basename(vHref) === imp) {
            out.add(vHref);
            break;
          }
          void vName;
        }
      } else {
        for (const v of resolveVendors(imp, visiting)) out.add(v);
      }
    }
    visiting.delete(name);
    vendorClosure.set(name, out);
    return out;
  }

  const map = new Map();
  for (const name of allJsFiles) {
    const refs = resolveVendors(name, new Set());
    if (refs.size > 0) map.set(name, refs);
  }
  return map;
}

async function* walkHtml(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkHtml(full);
    } else if (e.name.endsWith('.html')) {
      yield full;
    }
  }
}

function collectChunkRefs(html) {
  const refs = new Set();
  const re = /\/_astro\/([A-Za-z0-9._-]+\.js)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    refs.add(m[1]);
  }
  return refs;
}

function buildPreloadTags(html, vendors, chunkToVendors) {
  const required = new Set();
  for (const chunkName of collectChunkRefs(html)) {
    const v = chunkToVendors.get(chunkName);
    if (v) for (const href of v) required.add(href);
    if (vendors.has(chunkName.match(/^(vendor-[a-z0-9]+)/)?.[1] ?? '')) {
      const href = vendors.get(chunkName.match(/^(vendor-[a-z0-9]+)/)?.[1] ?? '');
      if (href) required.add(href);
    }
  }
  if (required.size === 0) return '';
  return Array.from(required)
    .map((href) => `<link rel="modulepreload" href="${href}" crossorigin>`)
    .join('');
}

export default function modulepreloadIntegration() {
  return {
    name: 'modulepreload-integration',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distDir = dir.pathname;
        const astroDir = join(distDir, ASTRO_DIR);
        const vendors = await findVendorChunks(astroDir);
        if (vendors.size === 0) {
          logger?.info?.('[modulepreload] no vendor chunks found, skipping');
          return;
        }
        const chunkToVendors = await buildChunkVendorMap(astroDir, vendors);

        let patched = 0;
        for await (const file of walkHtml(distDir)) {
          const html = await readFile(file, 'utf-8');
          const tags = buildPreloadTags(html, vendors, chunkToVendors);
          if (!tags) continue;
          const idx = html.indexOf('</head>');
          if (idx === -1) continue;
          const next = html.slice(0, idx) + tags + html.slice(idx);
          await writeFile(file, next);
          patched += 1;
        }
        logger?.info?.(`[modulepreload] injected into ${patched} HTML file(s)`);
      },
    },
  };
}

export { findVendorChunks, buildChunkVendorMap, buildPreloadTags, walkHtml, collectChunkRefs };

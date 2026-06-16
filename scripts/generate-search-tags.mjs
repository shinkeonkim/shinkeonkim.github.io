#!/usr/bin/env bun
// Generate src/data/search-tags.json at build time.
//
// SearchModal.astro needs a precomputed tag list (with aliases and counts)
// to render its tag filter UI. Originally it computed this inline via
// `await Promise.all([getPublishedPosts(), ...])`, which made the modal
// an async Astro component. Astro 6.4 prerender bundles every page using
// the BaseLayout (which embeds SearchModal) into the same async chunk and
// then regresses `Astro.props` on pages whose `getStaticPaths()` returns
// props (see Astro issue #16949 and the related callAction / undefined.url
// / props=undefined errors in CI). Moving tag computation out of the
// component eliminates the top-level await and the chunk co-bundling.
//
// This script reads each content collection's frontmatter directly via
// `@astrojs/markdown-remark`'s parser, applies the same canonicalization
// rules as `src/data/tags.ts`, and writes the resulting list to
// `src/data/search-tags.json`. The runtime component just imports the
// JSON synchronously.
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(REPO_ROOT, 'src/content');
const OUT_PATH = path.join(REPO_ROOT, 'src/data/search-tags.json');
const COLLECTIONS = ['posts', 'notes', 'wiki'];

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (/\.(md|mdx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

async function readTags(file) {
  const raw = await fs.readFile(file, 'utf-8');
  const { frontmatter } = parseFrontmatter(raw);
  if (frontmatter.draft) return null;
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
  return tags.filter((t) => typeof t === 'string' && t.length > 0);
}

async function main() {
  // Re-import the canonical tag registry. tags.ts is pure ESM with no
  // Astro-specific imports, so a dynamic `import()` is safe here.
  const tagsMod = await import(path.join(REPO_ROOT, 'src/data/tags.ts'));
  const { canonicalizeTag, getTagMeta } = tagsMod;

  const tagCounts = new Map();
  const tagLabels = new Map();
  const bump = (raw) => {
    const canonical = canonicalizeTag(raw);
    tagCounts.set(canonical, (tagCounts.get(canonical) ?? 0) + 1);
    if (!tagLabels.has(canonical)) {
      const meta = getTagMeta(canonical);
      tagLabels.set(canonical, meta?.canonical ?? raw);
    }
  };

  for (const collection of COLLECTIONS) {
    const dir = path.join(CONTENT_DIR, collection);
    const files = await walk(dir);
    for (const file of files) {
      const tags = await readTags(file);
      if (!tags) continue;
      for (const t of tags) bump(t);
    }
  }

  const tagList = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([slug, count]) => ({
      name: tagLabels.get(slug) ?? slug,
      slug,
      count,
    }));

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(tagList, null, 2) + '\n');
  console.log(`search tags: wrote ${tagList.length} tag(s) → ${path.relative(REPO_ROOT, OUT_PATH)}`);
}

await main();

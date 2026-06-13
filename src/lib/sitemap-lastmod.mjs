// Build Map<absoluteUrl, isoDateString> by reading content frontmatter at
// config-load time. Consumed by @astrojs/sitemap serialize() to emit
// <lastmod> per URL.
//
// Why frontmatter (not git history): keeps the build deterministic and
// fast — no `git log` per file. Authors control freshness via `updated`
// in frontmatter.
//
// Why regex parsing (not full YAML): mirrors src/lib/sitemap-images.mjs.
// We only need a handful of scalar fields plus the `tags` array, so a
// targeted parser keeps config-load light.
//
// Tag / category / series URLs use the same lowercasing & slugify rules
// as the page generators (src/pages/tags/[tag].astro,
// src/pages/posts/category/, src/pages/posts/series/) so the URLs in
// this map line up with the URLs Astro renders.

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractFrontmatter, isDraft, parseField } from './sitemap-images.mjs';

function resolveContentRoot() {
  try {
    return join(fileURLToPath(new URL('../../', import.meta.url)), 'src', 'content');
  } catch {
    return join(process.cwd(), 'src', 'content');
  }
}

const CONTENT_ROOT = resolveContentRoot();

// Mirrors src/lib/taxonomy.ts slugify: lowercase, replace non-word runs
// with '-', NFC-normalize so Korean Hangul stays composed (NFC) — that's
// the form the dist filesystem and sitemap URLs use.
const SLUG_RE = /[^\p{L}\p{N}_-]+/gu;

export function slugify(value) {
  return value.normalize('NFC').toLowerCase().replace(SLUG_RE, '-').replace(/^-|-$/g, '');
}

// Mirrors src/pages/tags/[tag].astro: just lowercase. The sitemap URL
// gets percent-encoded by `new URL(...)` on insert.
export function tagSlug(value) {
  return value.toLowerCase();
}

export function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

// Pick the first non-empty / parseable date from the given frontmatter
// fields, in priority order. Returns Date or null.
export function pickDate(yaml, fields) {
  for (const field of fields) {
    const v = parseField(yaml, field);
    if (!v) continue;
    const d = parseDate(v);
    if (d) return d;
  }
  return null;
}

export function maxDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a.valueOf() > b.valueOf() ? a : b;
}

// Parse the `tags:` array out of a YAML frontmatter block.
// Supports both forms seen in the codebase:
//   inline:  tags: [a, b, 'c']
//   block:   tags:
//              - a
//              - "b"
// Returns string[] (possibly empty). Does NOT validate items.
export function parseTagsArray(yaml) {
  const tags = [];

  // Inline form first (faster, more common in newer posts).
  const inline = yaml.match(/^tags:\s*\[([^\]\r\n]*)\]\s*(?:#.*)?$/m);
  if (inline) {
    for (const raw of inline[1].split(',')) {
      const v = raw.trim().replace(/^['"]|['"]$/g, '');
      if (v) tags.push(v);
    }
    return tags;
  }

  // Block form: scan lines after `tags:` until first non-list-item line.
  const lines = yaml.split(/\r?\n/);
  let inBlock = false;
  for (const line of lines) {
    if (!inBlock) {
      if (/^tags:\s*$/.test(line)) inBlock = true;
      continue;
    }
    const m = line.match(/^\s*-\s+(?:['"]([^'"]+)['"]|([^#\r\n]+?))\s*(?:#.*)?$/);
    if (m) {
      const v = (m[1] ?? m[2] ?? '').trim();
      if (v) tags.push(v);
      continue;
    }
    // Blank line inside YAML keeps us in the block; any other
    // non-list-item line means the array ended.
    if (line.trim() !== '') break;
  }
  return tags;
}

async function* walk(dir, extPattern = /\.mdx?$/) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full, extPattern);
    } else if (extPattern.test(e.name)) {
      yield full;
    }
  }
}

function toUrlSlug(collectionDir, filePath) {
  // Mirror Astro's content layer: each path segment goes through the same
  // slugifier we use for category / series, so file paths like
  // "posts/TIL/2020-11-12-TIL-foo.md" map to "/posts/til/2020-11-12-til-foo/".
  // See node_modules/astro/dist/content/utils.js getContentEntryIdAndSlug().
  const rel = relative(join(CONTENT_ROOT, collectionDir), filePath);
  return rel
    .replace(/\.mdx?$/, '')
    .split(/[\\/]/)
    .map((seg) => slugify(seg))
    .filter(Boolean)
    .join('/');
}

const COLLECTIONS = [
  {
    dir: 'posts',
    urlPrefix: '/posts/',
    dateFields: ['updated', 'date'],
    extPattern: /\.mdx?$/,
    categorize: true,
  },
  {
    dir: 'wiki',
    urlPrefix: '/wiki/',
    dateFields: ['updated'],
    extPattern: /\.mdx?$/,
  },
  {
    dir: 'notes',
    urlPrefix: '/notes/',
    dateFields: ['date'],
    extPattern: /\.md$/,
  },
];

let cache = null;

/**
 * @param {string} siteUrl - e.g. "https://shinkeonkim.com"
 * @returns {Promise<Map<string, string>>} url → ISO date string
 */
export async function buildLastmodMap(siteUrl) {
  if (cache) return cache;
  const map = new Map();
  const site = new URL(siteUrl);

  const setIfLater = (path, date) => {
    if (!date) return;
    const url = new URL(path, site).toString();
    const existing = map.get(url);
    if (!existing || date.valueOf() > new Date(existing).valueOf()) {
      map.set(url, date.toISOString());
    }
  };

  const collectionLatest = new Map(); // collection dir → Date
  const categoryLatest = new Map(); // category → Date
  const seriesLatest = new Map(); // series slug → Date
  const tagLatest = new Map(); // tag slug → Date

  for (const col of COLLECTIONS) {
    for await (const file of walk(join(CONTENT_ROOT, col.dir), col.extPattern)) {
      let text;
      try {
        text = await readFile(file, 'utf-8');
      } catch {
        continue;
      }
      const fm = extractFrontmatter(text);
      if (!fm) continue;
      if (isDraft(fm)) continue;

      const date = pickDate(fm, col.dateFields);
      if (!date) continue;

      const slug = toUrlSlug(col.dir, file);
      setIfLater(col.urlPrefix + slug + '/', date);

      collectionLatest.set(col.dir, maxDate(collectionLatest.get(col.dir), date));

      if (col.categorize) {
        const explicitCategory = parseField(fm, 'category');
        const inferredCategory = slug.includes('/') ? slug.split('/')[0] : null;
        const rawCategory = explicitCategory ?? inferredCategory;
        if (rawCategory) {
          const cslug = slugify(rawCategory);
          if (cslug) {
            categoryLatest.set(cslug, maxDate(categoryLatest.get(cslug), date));
          }
        }
        const seriesName = parseField(fm, 'series');
        if (seriesName) {
          const sslug = slugify(seriesName);
          if (sslug) {
            seriesLatest.set(sslug, maxDate(seriesLatest.get(sslug), date));
          }
        }
      }

      for (const tag of parseTagsArray(fm)) {
        const tslug = tagSlug(tag);
        if (tslug) {
          tagLatest.set(tslug, maxDate(tagLatest.get(tslug), date));
        }
      }
    }
  }

  // Aggregate URLs.
  setIfLater('/posts/', collectionLatest.get('posts'));
  setIfLater('/wiki/', collectionLatest.get('wiki'));
  setIfLater('/notes/', collectionLatest.get('notes'));

  for (const [category, date] of categoryLatest) {
    setIfLater(`/posts/category/${category}/`, date);
  }
  for (const [series, date] of seriesLatest) {
    setIfLater(`/posts/series/${series}/`, date);
  }

  let allTagsLatest = null;
  for (const [tag, date] of tagLatest) {
    setIfLater(`/tags/${tag}/`, date);
    allTagsLatest = maxDate(allTagsLatest, date);
  }
  setIfLater('/tags/', allTagsLatest);

  // Homepage = latest of everything content-bearing.
  const overallLatest = [
    collectionLatest.get('posts'),
    collectionLatest.get('wiki'),
    collectionLatest.get('notes'),
  ].reduce((a, b) => maxDate(a, b), null);
  setIfLater('/', overallLatest);

  cache = map;
  return map;
}

// Resolve a lastmod for any URL, falling back through pagination prefixes
// so /posts/3/ inherits from /posts/, /posts/category/foo/2/ from
// /posts/category/foo/, etc. Returns ISO string or undefined.
export function resolveLastmod(map, url) {
  const direct = map.get(url);
  if (direct) return direct;
  const paginated = url.replace(/(\/)(\d+)\/$/, '$1');
  if (paginated !== url) {
    const fallback = map.get(paginated);
    if (fallback) return fallback;
  }
  return undefined;
}

// Build a Map<absoluteUrl, sitemapImage> by reading content frontmatter at config-load time.
// Used by @astrojs/sitemap serialize() to add <image:image> entries per page.
//
// Side effects: none beyond fs reads. Safe to call multiple times (cached internally).

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveContentRoot() {
  try {
    return join(fileURLToPath(new URL('../../', import.meta.url)), 'src', 'content');
  } catch {
    return join(process.cwd(), 'src', 'content');
  }
}

const CONTENT_ROOT = resolveContentRoot();

const COLLECTIONS = [
  { dir: 'posts', urlPrefix: '/posts/' },
  { dir: 'wiki', urlPrefix: '/wiki/' },
];

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

export function parseField(yaml, field) {
  // Matches: field: value   OR   field: "value"   OR   field: 'value'
  const re = new RegExp(`^${field}:\\s*(?:(['"])([^'"\\r\\n]+?)\\1|([^\\r\\n#]+?))\\s*(?:#.*)?$`, 'm');
  const m = yaml.match(re);
  if (!m) return undefined;
  const v = (m[2] ?? m[3] ?? '').trim();
  if (!v || v === '~' || v.toLowerCase() === 'null') return undefined;
  return v;
}

export function extractFrontmatter(text) {
  const m = text.match(FRONTMATTER_RE);
  return m ? m[1] : null;
}

export function isDraft(yaml) {
  return /^draft:\s*true\b/m.test(yaml);
}

export function entryToImage(yaml, siteUrl) {
  if (isDraft(yaml)) return null;
  const image = parseField(yaml, 'cover') ?? parseField(yaml, 'thumbnail');
  if (!image) return null;
  let url;
  try {
    url = image.startsWith('http') ? image : new URL(image, siteUrl).toString();
  } catch {
    return null;
  }
  const title = parseField(yaml, 'title');
  const caption = parseField(yaml, 'description') ?? parseField(yaml, 'coverAlt');
  return {
    url,
    ...(title ? { title } : {}),
    ...(caption ? { caption } : {}),
  };
}

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (/\.mdx?$/.test(e.name)) {
      yield full;
    }
  }
}

function toUrlPath(collectionDir, filePath) {
  // src/content/posts/foo/bar.md → "foo/bar"
  const rel = relative(join(CONTENT_ROOT, collectionDir), filePath);
  return rel.replace(/\.mdx?$/, '').split(/[\\/]/).join('/');
}

let cache = null;

/**
 * @param {string} siteUrl - e.g. "https://shinkeonkim.com"
 * @returns {Promise<Map<string, { url: string; title?: string; caption?: string }>>}
 */
export async function buildImageMap(siteUrl) {
  if (cache) return cache;
  const map = new Map();
  const site = new URL(siteUrl);

  for (const col of COLLECTIONS) {
    for await (const file of walk(join(CONTENT_ROOT, col.dir))) {
      let text;
      try {
        text = await readFile(file, 'utf-8');
      } catch {
        continue;
      }
      const fm = extractFrontmatter(text);
      if (!fm) continue;

      const img = entryToImage(fm, site);
      if (!img) continue;

      const slug = toUrlPath(col.dir, file);
      const pageUrl = new URL(col.urlPrefix + slug + '/', site).toString();

      map.set(pageUrl, img);
    }
  }

  cache = map;
  return map;
}

#!/usr/bin/env bun
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import ogs from 'open-graph-scraper';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const CONTENT_ROOT = path.join(REPO_ROOT, 'src/content');
const CACHE_PATH = path.join(REPO_ROOT, 'src/data/url-previews.json');
const TAG_RE = /<UrlPreview\s+url=["']([^"']+)["']\s*\/>/g;

const args = process.argv.slice(2);
const force = args.includes('--force');
const maxAgeArg = args.find((a) => a.startsWith('--max-age='));
const maxAgeHours = maxAgeArg ? Number(maxAgeArg.split('=')[1]) : 24 * 30;

function cacheKey(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name.startsWith('_')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (/\.(md|mdx)$/.test(e.name)) out.push(full);
  }
  return out;
}

async function collectUrls() {
  const files = await walk(CONTENT_ROOT);
  const urls = new Set();
  for (const f of files) {
    const text = await fs.readFile(f, 'utf-8');
    if (!text.includes('<UrlPreview')) continue;
    TAG_RE.lastIndex = 0;
    let m;
    while ((m = TAG_RE.exec(text)) !== null) {
      urls.add(m[1]);
    }
  }
  return Array.from(urls);
}

async function loadCache() {
  try {
    return JSON.parse(await fs.readFile(CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function isFresh(entry, hours) {
  if (!entry?.fetchedAt) return false;
  const age = Date.now() - new Date(entry.fetchedAt).getTime();
  return age < hours * 60 * 60 * 1000;
}

function pickFavicon(url, ogResult) {
  const favicon = ogResult?.favicon;
  if (!favicon) return undefined;
  if (/^https?:/.test(favicon)) return favicon;
  try {
    return new URL(favicon, url).toString();
  } catch {
    return undefined;
  }
}

async function fetchOne(url) {
  try {
    const { error, result } = await ogs({
      url,
      timeout: 12000,
      onlyGetOpenGraphInfo: false,
      fetchOptions: {
        headers: {
          'User-Agent': 'shinkeonkim-blog-url-preview/1.0 (+https://shinkeonkim.com)',
        },
      },
    });
    if (error) throw new Error(typeof result?.error === 'string' ? result.error : 'ogs failed');
    const image = Array.isArray(result.ogImage) ? result.ogImage[0]?.url : result.ogImage?.url;
    return {
      url,
      title: result.ogTitle ?? result.twitterTitle ?? undefined,
      description: result.ogDescription ?? result.twitterDescription ?? undefined,
      image,
      favicon: pickFavicon(url, result),
      siteName: result.ogSiteName ?? undefined,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      url,
      error: err instanceof Error ? err.message : String(err),
      fetchedAt: new Date().toISOString(),
    };
  }
}

const urls = await collectUrls();
if (urls.length === 0) {
  console.log('no <UrlPreview /> usages found.');
  process.exit(0);
}
const cache = await loadCache();
let fetched = 0;
let skipped = 0;
for (const url of urls) {
  const key = cacheKey(url);
  if (!force && isFresh(cache[key], maxAgeHours) && !cache[key].error) {
    skipped++;
    continue;
  }
  process.stdout.write(`fetching ${url}\n`);
  cache[key] = await fetchOne(url);
  fetched++;
}
await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf-8');
console.log(
  `done: ${fetched} fetched, ${skipped} cached, ${urls.length} total → ${path.relative(REPO_ROOT, CACHE_PATH)}`,
);

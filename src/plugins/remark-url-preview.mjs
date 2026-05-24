import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

const CACHE_PATH = path.resolve(process.cwd(), 'src/data/url-previews.json');
const TAG_RE = /<UrlPreview\s+url=["']([^"']+)["']\s*\/>/g;

let cachedPreviews = null;
let cacheLoadedAt = 0;

function loadCache() {
  const now = Date.now();
  if (cachedPreviews && now - cacheLoadedAt < 5000) return cachedPreviews;
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    cachedPreviews = JSON.parse(raw);
  } catch {
    cachedPreviews = {};
  }
  cacheLoadedAt = now;
  return cachedPreviews;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function cacheKey(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

function renderCardHtml(url) {
  const cache = loadCache();
  const data = cache[cacheKey(url)];
  const host = hostname(url);
  const title = escapeHtml(data?.title ?? url);
  const description = data?.description
    ? `<span class="url-preview-description">${escapeHtml(data.description)}</span>`
    : '';
  const image = data?.image
    ? `<span class="url-preview-image" style="background-image:url(${JSON.stringify(data.image)})"></span>`
    : '';
  const favicon = data?.favicon
    ? `<img src="${escapeHtml(data.favicon)}" alt="" width="14" height="14" class="url-preview-favicon" loading="lazy" />`
    : '';
  const siteName = escapeHtml(data?.siteName ?? host);
  return `<a class="url-preview-card not-prose" href="${escapeHtml(url)}" target="_blank" rel="noopener" data-url-preview="${escapeHtml(url)}">${image}<span class="url-preview-body"><span class="url-preview-host">${favicon}<span>${siteName}</span></span><span class="url-preview-title">${title}</span>${description}</span></a>`;
}

export default function remarkUrlPreview() {
  return (tree) => {
    visit(tree, ['text', 'html'], (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      const text = node.value;
      if (typeof text !== 'string' || !text.includes('<UrlPreview')) return;
      TAG_RE.lastIndex = 0;
      const parts = [];
      let last = 0;
      let m;
      let matched = false;
      while ((m = TAG_RE.exec(text)) !== null) {
        matched = true;
        if (m.index > last) {
          parts.push({ type: node.type, value: text.slice(last, m.index) });
        }
        parts.push({ type: 'html', value: renderCardHtml(m[1]) });
        last = m.index + m[0].length;
      }
      if (!matched) return;
      if (last < text.length) {
        parts.push({ type: node.type, value: text.slice(last) });
      }
      parent.children.splice(index, 1, ...parts);
      return [undefined, index + parts.length];
    });
  };
}

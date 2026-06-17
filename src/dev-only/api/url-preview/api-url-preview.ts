import type { APIRoute } from 'astro';
import { notFoundResponse } from '@/dev-only/shared/api-utils';
import ogs from 'open-graph-scraper';
import fs from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

const CACHE_PATH = path.resolve(process.cwd(), 'src/data/url-previews.json');

interface CachedPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  fetchedAt: string;
  error?: string;
}

function cacheKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

function pickFavicon(url: string, result: Record<string, unknown>): string | undefined {
  const fav = result.favicon;
  if (typeof fav !== 'string' || fav.length === 0) return undefined;
  if (/^https?:/.test(fav)) return fav;
  try {
    return new URL(fav, url).toString();
  } catch {
    return undefined;
  }
}

async function loadCache(): Promise<Record<string, CachedPreview>> {
  try {
    return JSON.parse(await fs.readFile(CACHE_PATH, 'utf-8')) as Record<string, CachedPreview>;
  } catch {
    return {};
  }
}

async function saveCache(cache: Record<string, CachedPreview>): Promise<void> {
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf-8');
}

export const GET: APIRoute = async ({ url }) => {
  if (!import.meta.env.DEV) return notFoundResponse();
  const target = url.searchParams.get('url');
  if (!target) {
    return new Response(JSON.stringify({ error: 'url required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return new Response(JSON.stringify({ error: 'http/https only' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const force = url.searchParams.get('force') === '1';
  const cache = await loadCache();
  const key = cacheKey(target);
  if (!force && cache[key] && !cache[key].error) {
    return new Response(JSON.stringify({ preview: cache[key], cached: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { error, result } = await ogs({
      url: target,
      timeout: 12000,
      onlyGetOpenGraphInfo: false,
      fetchOptions: {
        headers: { 'User-Agent': 'shinkeonkim-blog-dev-editor/1.0' },
      },
    });
    if (error)
      throw new Error(
        typeof (result as { error?: unknown })?.error === 'string'
          ? (result as { error?: string }).error!
          : 'ogs failed',
      );
    const ogResult = result as Record<string, unknown>;
    const ogImage = Array.isArray(ogResult.ogImage)
      ? (ogResult.ogImage[0] as { url?: string } | undefined)?.url
      : (ogResult.ogImage as { url?: string } | undefined)?.url;
    const preview: CachedPreview = {
      url: target,
      title:
        (ogResult.ogTitle as string | undefined) ?? (ogResult.twitterTitle as string | undefined),
      description:
        (ogResult.ogDescription as string | undefined) ??
        (ogResult.twitterDescription as string | undefined),
      image: ogImage,
      favicon: pickFavicon(target, ogResult),
      siteName: ogResult.ogSiteName as string | undefined,
      fetchedAt: new Date().toISOString(),
    };
    cache[key] = preview;
    await saveCache(cache);
    return new Response(JSON.stringify({ preview, cached: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

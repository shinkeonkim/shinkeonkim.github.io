export interface UrlPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  fetchedAt: string;
  error?: string;
}

export type UrlPreviewCache = Record<string, UrlPreviewData>;

let cachePromise: Promise<UrlPreviewCache> | null = null;

export function loadUrlPreviews(): Promise<UrlPreviewCache> {
  if (!cachePromise) {
    cachePromise = import('../data/url-previews.json')
      .then((mod) => (mod.default ?? mod) as UrlPreviewCache)
      .catch(() => ({}) as UrlPreviewCache);
  }
  return cachePromise;
}

export function cacheKeyFor(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

export function hostnameFor(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

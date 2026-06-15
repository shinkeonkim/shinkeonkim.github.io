// Minimal service worker for shinkeonkim.com.
// Strategy:
// - Static assets (_astro, fonts, images, json): cache-first.
// - HTML navigations: stale-while-revalidate, falling back to /offline/.
// - Versioned cache name lets a new SW evict the old cache on activate.

const VERSION = 'v1-2026-06-15';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const OFFLINE_URL = '/offline/';
const STATIC_PRECACHE = [OFFLINE_URL];

const STATIC_EXT_RE = /\.(?:css|js|woff2?|ttf|otf|svg|png|jpe?g|gif|webp|avif|ico|json|xml)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_PRECACHE).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone()).catch(() => undefined);
    return response;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone()).catch(() => undefined);
      return response;
    })
    .catch(() => null);
  if (cached) {
    network.catch(() => undefined);
    return cached;
  }
  const fresh = await network;
  if (fresh) return fresh;
  const offline = await cache.match(OFFLINE_URL);
  if (offline) return offline;
  return new Response('Offline', { status: 503, statusText: 'Offline' });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (STATIC_EXT_RE.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
  }
});

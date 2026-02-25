// NutriMind Service Worker
// Strategy:
//   - _next/static/** → cache-first (immutable hashed chunks)
//   - /api/**         → network-only (live data from SQLite)
//   - pages           → network-first, fall back to cache

const CACHE = 'nutrimind-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API routes — always go to network, no caching
  if (url.pathname.startsWith('/api/')) return;

  // Next.js static chunks — cache-first (they're content-hashed, safe to cache forever)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((res) => {
              cache.put(request, res.clone());
              return res;
            }),
        ),
      ),
    );
    return;
  }

  // Pages — network-first, serve stale on offline
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request)),
  );
});

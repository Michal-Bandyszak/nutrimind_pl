// NutriMind Service Worker
// Cache only immutable public assets. Authenticated HTML and API responses
// must never survive logout or leak between accounts on a shared device.

const CACHE = 'nutrimind-v2';

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

  if (url.pathname.startsWith('/api/') || !url.pathname.startsWith('/_next/static/')) return;

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

});

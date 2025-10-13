/* Minimal SW with stale-while-revalidate for images/fonts and cache-first for app shell */
const VERSION = 'v1.0.0';
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(`app-shell-${VERSION}`).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => {
      if (!k.includes(VERSION)) return caches.delete(k);
    })))
  );
  self.clients.claim();
});

// Messaging
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CACHE_CLEAR') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});

function isImage(req) {
  return req.destination === 'image' || /\.(png|jpe?g|webp|svg|gif)$/i.test(new URL(req.url).pathname);
}
function isFont(req) {
  return req.destination === 'font' || /\.(woff2?|ttf|otf)$/i.test(new URL(req.url).pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Same-origin only for shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Images/Fonts: stale-while-revalidate
  if (isImage(request) || isFont(request)) {
    event.respondWith(
      caches.open('assets-swr').then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request).then((resp) => {
          if (resp && resp.status === 200) cache.put(request, resp.clone());
          return resp;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Other GET requests: try network first, fallback to cache
  if (request.method === 'GET') {
    event.respondWith(
      fetch(request).then((resp) => {
        const copy = resp.clone();
        caches.open('misc-network-first').then((c) => c.put(request, copy));
        return resp;
      }).catch(() => caches.match(request))
    );
    return;
  }
});

// Minimal Service Worker - デバッグ用
console.log('Minimal Service Worker loaded');

self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

const CACHE_NAME = 'dpjp-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon_android_192x192.png',
  '/icons/icon_android_144x144.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // HTMLドキュメントはNetwork-firstでオフライン時にfallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }
  // 静的アセットはCache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached || fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        }).catch(() => cached)
      );
    })
  );
});

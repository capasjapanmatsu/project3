/* Minimal SW with stale-while-revalidate for images/fonts and cache-first for app shell */
const VERSION = 'v1.0.1';
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

  // 非GET（POST/PUT/DELETEなど）や、クロスオリジンは介入しない（そのままネットワークへ）
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Same-origin のHTMLナビゲーションは Network-first
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

  // Other GET requests (same-origin): Network-first with fallback to cache
  event.respondWith(
    fetch(request).then((resp) => {
      const copy = resp.clone();
      caches.open('misc-network-first').then((c) => c.put(request, copy));
      return resp;
    }).catch(() => caches.match(request))
  );
});

// Minimal Service Worker - デバッグ用
console.log('Minimal Service Worker loaded');

// 余分な重複ハンドラを削除し、GETのみを対象にしました（POSTは素通し）

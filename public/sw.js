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

self.addEventListener('fetch', function(event) {
  // フェッチイベントをそのまま通す（キャッシュなし）
  event.respondWith(fetch(event.request));
});

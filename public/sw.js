/**
 * ドッグパークJP Service Worker
 * PWA対応のためのキャッシュ戦略とオフライン機能を提供
 */

const CACHE_NAME = 'dogpark-jp-v1.2.0';
const OFFLINE_URL = '/offline.html';

// キャッシュするリソースの定義
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.svg'
];

// キャッシュ戦略の設定
const CACHE_STRATEGIES = {
  // アプリシェル（HTML、CSS、JS）- キャッシュ優先
  appShell: {
    pattern: /\.(html|css|js|tsx|ts)$/,
    strategy: 'cacheFirst'
  },
  
  // 画像リソース - キャッシュ優先、フォールバック付き
  images: {
    pattern: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
    strategy: 'cacheFirst'
  },
  
  // API レスポンス - ネットワーク優先、キャッシュフォールバック
  api: {
    pattern: /\/api\//,
    strategy: 'networkFirst'
  },
  
  // フォント - キャッシュ優先
  fonts: {
    pattern: /\.(woff|woff2|ttf|eot)$/,
    strategy: 'cacheFirst'
  },
  
  // Supabase API - ネットワーク優先
  supabase: {
    pattern: /supabase\.co/,
    strategy: 'networkFirst'
  }
};

/**
 * Service Worker インストール時の処理
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: インストール開始');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: 静的リソースをキャッシュ中...');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker: インストール完了');
        // 新しいSWを即座にアクティブ化
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: インストール失敗', error);
      })
  );
});

/**
 * Service Worker アクティベーション時の処理
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: アクティベーション開始');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 古いキャッシュを削除
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: 古いキャッシュを削除:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: アクティベーション完了');
        // 全てのクライアントを即座に制御下に置く
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('❌ Service Worker: アクティベーション失敗', error);
      })
  );
});

/**
 * フェッチイベントの処理
 */
self.addEventListener('fetch', (event) => {
  // Chrome拡張機能のリクエストは無視
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // POSTリクエストなどの非GETリクエストは通常通り処理
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(handleFetch(event.request));
});

/**
 * リクエスト処理のメイン関数
 */
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // キャッシュ戦略を決定
    const strategy = determineStrategy(url);
    
    switch (strategy) {
      case 'cacheFirst':
        return await cacheFirstStrategy(request);
      case 'networkFirst':
        return await networkFirstStrategy(request);
      case 'staleWhileRevalidate':
        return await staleWhileRevalidateStrategy(request);
      default:
        return await networkFirstStrategy(request);
    }
  } catch (error) {
    console.warn('⚠️ Service Worker: フェッチエラー', error);
    return await handleOfflineFallback(request);
  }
}

/**
 * URL に基づいてキャッシュ戦略を決定
 */
function determineStrategy(url) {
  for (const [name, config] of Object.entries(CACHE_STRATEGIES)) {
    if (config.pattern.test(url.pathname) || config.pattern.test(url.href)) {
      return config.strategy;
    }
  }
  return 'networkFirst'; // デフォルト戦略
}

/**
 * キャッシュ優先戦略
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // バックグラウンドでキャッシュを更新
    updateCacheInBackground(request);
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  await updateCache(request, networkResponse.clone());
  return networkResponse;
}

/**
 * ネットワーク優先戦略
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    await updateCache(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Stale While Revalidate戦略
 */
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  // バックグラウンドでネットワークからフェッチして更新
  const networkResponsePromise = fetch(request)
    .then(response => {
      updateCache(request, response.clone());
      return response;
    })
    .catch(() => null);
  
  // キャッシュがあればそれを返し、なければネットワークレスポンスを待つ
  return cachedResponse || await networkResponsePromise;
}

/**
 * バックグラウンドでキャッシュを更新
 */
function updateCacheInBackground(request) {
  fetch(request)
    .then(response => updateCache(request, response))
    .catch(() => {
      // サイレントに失敗
    });
}

/**
 * キャッシュを更新
 */
async function updateCache(request, response) {
  if (response.status === 200) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
  }
}

/**
 * オフライン時のフォールバック処理
 */
async function handleOfflineFallback(request) {
  const url = new URL(request.url);
  
  // HTMLページの場合はオフラインページを返す
  if (request.destination === 'document') {
    const offlineResponse = await caches.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }
  }
  
  // 画像の場合はプレースホルダーを返す
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">オフライン</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
  
  // その他の場合は基本的なエラーレスポンス
  return new Response('オフラインです', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

/**
 * メッセージイベントの処理
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_CLEAR') {
    clearAllCaches();
  }
});

/**
 * 全キャッシュをクリア（開発用）
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('🗑️ Service Worker: 全キャッシュをクリアしました');
}

/**
 * 同期イベントの処理（バックグラウンド同期）
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

/**
 * バックグラウンド同期の処理
 */
async function doBackgroundSync() {
  try {
    // オフライン時に蓄積されたデータを同期
    console.log('🔄 Service Worker: バックグラウンド同期を実行中...');
    
    // 実際の同期ロジックをここに実装
    // 例: 未送信の予約データを送信、ユーザーデータを更新など
    
    console.log('✅ Service Worker: バックグラウンド同期完了');
  } catch (error) {
    console.error('❌ Service Worker: バックグラウンド同期失敗', error);
  }
}

/**
 * プッシュ通知の処理
 */
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'ドッグパークJPからのお知らせです',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '確認する',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('ドッグパークJP', options)
  );
});

/**
 * 通知クリック時の処理
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

console.log('🎉 Service Worker: 初期化完了 - Version', CACHE_NAME);

// Service Worker for Dog Park App
// Best Practices対応版

const CACHE_NAME = 'dog-park-app-v1.0.0';
const OFFLINE_URL = '/offline.html';
const FALLBACK_IMAGE = '/images/fallback-dog.jpg';

// 重要なリソース（必ずキャッシュする）
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// 動的にキャッシュするリソース
const RUNTIME_CACHE = {
  images: 'images',
  api: 'api',
  pages: 'pages',
  assets: 'assets'
};

// セキュリティ対策：許可されたオリジンのみキャッシュ
const ALLOWED_ORIGINS = [
  self.location.origin,
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://your-project.supabase.co',
  'https://api.stripe.com'
];

// インストール時の処理
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('📦 Pre-caching core assets...');

        // コアアセットを事前キャッシュ
        await cache.addAll(CORE_ASSETS);

        // 即座にアクティブ化
        await self.skipWaiting();

        console.log('✅ Service Worker installed successfully');
      } catch (error) {
        console.error('❌ Service Worker installation failed:', error);
      }
    })()
  );
});

// アクティベーション時の処理
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');

  event.waitUntil(
    (async () => {
      try {
        // 古いキャッシュを削除
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('🗑️ Deleting old cache:', name);
              return caches.delete(name);
            })
        );

        // 全てのクライアントを制御
        await self.clients.claim();

        console.log('✅ Service Worker activated successfully');
      } catch (error) {
        console.error('❌ Service Worker activation failed:', error);
      }
    })()
  );
});

// フェッチイベントの処理
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // セキュリティ対策：許可されたオリジンのみ処理
  if (!ALLOWED_ORIGINS.includes(url.origin)) {
    return;
  }

  // POSTリクエストなどはキャッシュしない
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(handleRequest(request));
});

// リクエスト処理のメイン関数
async function handleRequest(request) {
  const url = new URL(request.url);

  try {
    // 戦略的キャッシュ処理
    if (url.pathname.startsWith('/api/')) {
      return await handleApiRequest(request);
    } else if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
      return await handleImageRequest(request);
    } else if (url.pathname.match(/\.(js|css|woff|woff2)$/)) {
      return await handleAssetRequest(request);
    } else {
      return await handlePageRequest(request);
    }
  } catch (error) {
    console.error('❌ Request handling failed:', error);
    return await handleOfflineResponse(request);
  }
}

// APIリクエストの処理（Network First）
async function handleApiRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE.api);

  try {
    // ネットワークを優先
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // レスポンスをキャッシュ（5分間）
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
    }

    return networkResponse;
  } catch (error) {
    console.log('🔌 Network failed, trying cache for API:', request.url);

    // ネットワークが失敗した場合はキャッシュから
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // API用のオフラインレスポンス
    return new Response(
      JSON.stringify({
        error: 'Network unavailable',
        message: 'Please check your internet connection and try again.',
        offline: true
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

// 画像リクエストの処理（Cache First）
async function handleImageRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE.images);

  // キャッシュを優先
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // ネットワークから取得
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // レスポンスをキャッシュ
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    console.log('🖼️ Image load failed, using fallback');

    // フォールバック画像
    const fallbackResponse = await cache.match(FALLBACK_IMAGE);
    if (fallbackResponse) {
      return fallbackResponse;
    }

    // SVGでのフォールバック
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
        <rect width="300" height="200" fill="#f3f4f6"/>
        <text x="150" y="100" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle">
          画像を読み込めませんでした
        </text>
      </svg>`,
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400'
        }
      }
    );
  }
}

// アセット（JS/CSS）の処理（Cache First）
async function handleAssetRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE.assets);

  // キャッシュを優先
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // ネットワークから取得
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // レスポンスをキャッシュ
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    console.log('📦 Asset load failed:', request.url);

    // アセット読み込み失敗の場合は通常のエラー処理
    return new Response('/* Asset loading failed */', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// ページリクエストの処理（Network First with Cache Fallback）
async function handlePageRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE.pages);

  try {
    // ネットワークを優先
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // レスポンスをキャッシュ
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    console.log('🔌 Network failed, trying cache for page:', request.url);

    // キャッシュから試行
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // メインページのフォールバック
    const indexResponse = await cache.match('/');
    if (indexResponse) {
      return indexResponse;
    }

    // オフラインページ
    return await handleOfflineResponse(request);
  }
}

// オフライン時の処理
async function handleOfflineResponse(request) {
  const cache = await caches.open(CACHE_NAME);

  // オフラインページを返す
  const offlineResponse = await cache.match(OFFLINE_URL);
  if (offlineResponse) {
    return offlineResponse;
  }

  // 最後の手段：シンプルなオフラインメッセージ
  return new Response(
    `<!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>オフライン - ドッグパークJP</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: #f9fafb;
          color: #374151;
        }
        .container {
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          max-width: 400px;
        }
        h1 { color: #ef4444; margin-bottom: 1rem; }
        p { margin-bottom: 1rem; line-height: 1.6; }
        button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
        }
        button:hover { background: #2563eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔌 オフライン</h1>
        <p>インターネット接続が利用できません。<br>接続を確認してから再度お試しください。</p>
        <button onclick="window.location.reload()">再読み込み</button>
      </div>
    </body>
    </html>`,
    {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    }
  );
}

// メッセージイベントの処理
self.addEventListener('message', (event) => {
  const { type, resource } = event.data;

  if (type === 'CACHE_RESOURCE') {
    cacheResource(resource);
  } else if (type === 'CLEAR_CACHE') {
    clearAllCaches();
  } else if (type === 'GET_CACHE_STATUS') {
    getCacheStatus().then(status => {
      event.ports[0].postMessage(status);
    });
  }
});

// リソースのキャッシュ
async function cacheResource(resource) {
  try {
    const cache = await caches.open(RUNTIME_CACHE.assets);
    await cache.add(resource);
    console.log('✅ Resource cached:', resource);
  } catch (error) {
    console.error('❌ Failed to cache resource:', resource, error);
  }
}

// 全キャッシュのクリア
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('✅ All caches cleared');
  } catch (error) {
    console.error('❌ Failed to clear caches:', error);
  }
}

// キャッシュステータスの取得
async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const status = {};

    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      status[name] = keys.length;
    }

    return status;
  } catch (error) {
    console.error('❌ Failed to get cache status:', error);
    return {};
  }
}

// エラーハンドリングの改善
self.addEventListener('error', (event) => {
  console.error('❌ Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Service Worker unhandled rejection:', event.reason);
});

// デバッグ情報（開発環境のみ）
if (self.location.hostname === 'localhost') {
  console.log('🔍 Service Worker Debug Mode');
  console.log('Cache Name:', CACHE_NAME);
  console.log('Core Assets:', CORE_ASSETS);
  console.log('Allowed Origins:', ALLOWED_ORIGINS);
}

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Download, 
  Wifi, 
  WifiOff, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Copy,
  ExternalLink,
  Monitor,
  Code,
  Zap,
  Shield
} from 'lucide-react';

interface PWAImplementationStep {
  id: string;
  title: string;
  description: string;
  code?: string;
  completed: boolean;
  type: 'manifest' | 'serviceworker' | 'registration' | 'html' | 'build' | 'testing';
}

const PWAImplementationGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'implementation' | 'testing' | 'deployment'>('overview');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // PWA実装ステップ
  const implementationSteps: PWAImplementationStep[] = [
    {
      id: 'manifest',
      title: '1. manifest.json の作成',
      description: 'PWAのメタデータとアイコンを定義',
      type: 'manifest',
      completed: true,
      code: `{
  "name": "ドッグパークJP - 愛犬とお散歩",
  "short_name": "ドッグパークJP",
  "description": "愛犬とのお散歩をもっと楽しく。全国のドッグランを簡単に検索・予約できるサービスです。",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#3B82F6",
  "categories": ["lifestyle", "travel", "social"],
  "lang": "ja",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "shortcuts": [
    {
      "name": "ドッグラン検索",
      "short_name": "検索",
      "description": "近くのドッグランを検索",
      "url": "/parks",
      "icons": [
        {
          "src": "/icons/icon-192x192.png",
          "sizes": "192x192",
          "type": "image/png"
        }
      ]
    }
  ]
}`
    },
    {
      id: 'serviceworker',
      title: '2. Service Worker の実装',
      description: 'キャッシュ戦略とオフライン機能を提供',
      type: 'serviceworker',
      completed: true,
      code: `// Service Worker の基本実装
const CACHE_NAME = 'dogpark-jp-v1.0.0';
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html'
];

// インストール時のキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_RESOURCES))
      .then(() => self.skipWaiting())
  );
});

// アクティベート時の古いキャッシュ削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチイベントでキャッシュ戦略を実装
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseClone));
            }
            return response;
          })
          .catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});`
    },
    {
      id: 'registration',
      title: '3. Service Worker の登録',
      description: 'メインアプリケーションでService Workerを登録',
      type: 'registration',
      completed: true,
      code: `// main.tsx または index.js
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker 登録成功:', registration.scope);
      
      // 更新チェック
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification();
            }
          });
        }
      });
      
    } catch (error) {
      console.error('Service Worker 登録失敗:', error);
    }
  });
}

// PWA インストールプロンプト
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

// インストールボタンクリック時
async function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('インストール結果:', outcome);
    deferredPrompt = null;
  }
}`
    },
    {
      id: 'html',
      title: '4. HTML の設定',
      description: 'PWAに必要なメタタグとリンクを追加',
      type: 'html',
      completed: true,
      code: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- PWA必須メタタグ -->
  <meta name="theme-color" content="#3B82F6" />
  <link rel="manifest" href="/manifest.json" />
  
  <!-- Apple PWA対応 -->
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="ドッグパークJP" />
  
  <!-- Microsoft PWA対応 -->
  <meta name="msapplication-TileImage" content="/icons/icon-192x192.png" />
  <meta name="msapplication-TileColor" content="#3B82F6" />
  
  <!-- SEO最適化 -->
  <meta name="description" content="愛犬とのお散歩をもっと楽しく。全国のドッグランを簡単に検索・予約できるサービスです。" />
  
  <title>ドッグパークJP</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`
    },
    {
      id: 'offline',
      title: '5. オフラインページの作成',
      description: 'ネットワーク接続がない時の代替ページ',
      type: 'html',
      completed: true,
      code: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>オフライン - ドッグパークJP</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      text-align: center;
      padding: 20px;
    }
    
    .offline-container {
      max-width: 500px;
      padding: 40px 30px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .retry-button {
      background: #3B82F6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="offline-container">
    <h1>🐕 オフラインです</h1>
    <p>インターネット接続を確認してください</p>
    <button class="retry-button" onclick="window.location.reload()">
      再試行
    </button>
  </div>
</body>
</html>`
    },
    {
      id: 'build',
      title: '6. ビルド設定の最適化',
      description: 'Vite/Webpack等でPWA用の最適化を実装',
      type: 'build',
      completed: true,
      code: `// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    // PWA プラグイン（オプション）
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
    //   manifest: {
    //     name: 'ドッグパークJP',
    //     short_name: 'ドッグパークJP',
    //     description: '愛犬とのお散歩をもっと楽しく',
    //     theme_color: '#3B82F6',
    //     icons: [
    //       {
    //         src: 'icons/icon-192x192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       }
    //     ]
    //   }
    // })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  }
});`
    }
  ];

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('コピーに失敗しました:', err);
    }
  };

  const PWAFeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; status: 'completed' | 'pending' | 'error' }> = ({ icon, title, description, status }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 text-2xl">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
            {status === 'pending' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
            {status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
          </div>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </motion.div>
  );

  const CodeBlock: React.FC<{ code: string; language: string; id: string }> = ({ code, language, id }) => (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
        <span className="text-sm text-gray-300">{language}</span>
        <button
          onClick={() => copyToClipboard(code, id)}
          className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span className="text-xs">{copiedCode === id ? 'コピー済み' : 'コピー'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm text-gray-100">{code}</code>
      </pre>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Helmet>
        <title>PWA実装ガイド - ドッグパークJP</title>
        <meta name="description" content="ドッグパークJPのPWA（プログレッシブ・ウェブ・アプリ）実装の完全ガイド" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            PWA実装ガイド
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            ドッグパークJPのプログレッシブ・ウェブ・アプリ（PWA）実装の完全なガイドとコード例
          </p>
        </motion.div>

        {/* タブナビゲーション */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            {[
              { key: 'overview', label: '概要', icon: <Monitor className="w-4 h-4" /> },
              { key: 'implementation', label: '実装', icon: <Code className="w-4 h-4" /> },
              { key: 'testing', label: 'テスト', icon: <CheckCircle className="w-4 h-4" /> },
              { key: 'deployment', label: 'デプロイ', icon: <Zap className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <PWAFeatureCard
                icon={<Smartphone />}
                title="ホーム画面への追加"
                description="ネイティブアプリのようにホーム画面からアクセス可能"
                status="completed"
              />
              <PWAFeatureCard
                icon={<WifiOff />}
                title="オフライン機能"
                description="インターネット接続がなくても基本機能を利用可能"
                status="completed"
              />
              <PWAFeatureCard
                icon={<Zap />}
                title="高速ロード"
                description="Service Workerによるキャッシュで高速な読み込み"
                status="completed"
              />
              <PWAFeatureCard
                icon={<Shield />}
                title="セキュアな配信"
                description="HTTPS必須でセキュアな通信を保証"
                status="completed"
              />
              <PWAFeatureCard
                icon={<Download />}
                title="自動更新"
                description="新しいバージョンを自動で検出・更新"
                status="completed"
              />
              <PWAFeatureCard
                icon={<Settings />}
                title="プッシュ通知"
                description="重要な情報をプッシュ通知で配信"
                status="pending"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">PWAの利点</h3>
              <ul className="space-y-2 text-blue-800">
                <li>• ネイティブアプリのような体験を提供</li>
                <li>• オフラインでも動作する信頼性</li>
                <li>• 高速な読み込みとスムーズな操作</li>
                <li>• インストール不要で簡単にアクセス</li>
                <li>• アプリストアを経由せずに配信可能</li>
                <li>• クロスプラットフォーム対応</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* 実装タブ */}
        {activeTab === 'implementation' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {implementationSteps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                  {step.completed && <CheckCircle className="w-6 h-6 text-green-500" />}
                </div>
                <p className="text-gray-600 mb-4">{step.description}</p>
                
                {step.code && (
                  <CodeBlock
                    code={step.code}
                    language={step.type === 'manifest' ? 'JSON' : step.type === 'html' ? 'HTML' : 'JavaScript'}
                    id={step.id}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* テストタブ */}
        {activeTab === 'testing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">PWA動作確認手順</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">1. Chrome DevToolsでの確認</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Chrome DevToolsを開く（F12）</li>
                    <li>「Application」タブを選択</li>
                    <li>「Manifest」でmanifest.jsonの内容を確認</li>
                    <li>「Service Workers」でSWの登録状況を確認</li>
                    <li>「Storage」でキャッシュの状況を確認</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">2. Lighthouse PWA監査</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Chrome DevToolsの「Lighthouse」タブを選択</li>
                    <li>「Progressive Web App」をチェック</li>
                    <li>「Generate report」をクリック</li>
                    <li>PWAスコアと改善点を確認</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">3. オフライン動作テスト</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Chrome DevToolsの「Network」タブを選択</li>
                    <li>「Offline」にチェックを入れる</li>
                    <li>ページをリロードしてオフラインページが表示されるか確認</li>
                    <li>キャッシュされたリソースが正常に読み込まれるか確認</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">4. インストール可能性テスト</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Chromeのアドレスバーにインストールアイコンが表示されるか確認</li>
                    <li>「Add to Home screen」が可能か確認</li>
                    <li>インストール後、スタンドアローンモードで起動するか確認</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-yellow-900 mb-2">⚠️ テスト時の注意点</h4>
              <ul className="list-disc list-inside text-yellow-800 space-y-1">
                <li>PWAのテストは必ずHTTPS環境で行う（localhost除く）</li>
                <li>Service Workerの更新時はハードリフレッシュ（Ctrl+Shift+R）を実行</li>
                <li>キャッシュの動作確認時は「Disable cache」のチェックを外す</li>
                <li>モバイルデバイスでの実機テストも必ず実施</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* デプロイタブ */}
        {activeTab === 'deployment' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Netlifyでのデプロイ設定</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">_redirects ファイル</h4>
                  <CodeBlock
                    code={`# SPA用のリダイレクト設定
/*    /index.html   200

# PWA用のヘッダー設定
/manifest.json
  Cache-Control: public, max-age=0, must-revalidate
/sw.js
  Cache-Control: public, max-age=0, must-revalidate
/offline.html
  Cache-Control: public, max-age=86400`}
                    language="Text"
                    id="redirects"
                  />
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">netlify.toml 設定</h4>
                  <CodeBlock
                    code={`[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
    Content-Type = "application/manifest+json"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
    Content-Type = "application/javascript"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"`}
                    language="TOML"
                    id="netlify-toml"
                  />
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-green-900 mb-2">✅ デプロイ完了後の確認事項</h4>
              <ul className="list-disc list-inside text-green-800 space-y-1">
                <li>HTTPS配信が有効になっているか確認</li>
                <li>manifest.jsonが正しく配信されているか確認</li>
                <li>Service Workerが登録されているか確認</li>
                <li>PWA Lighthouseスコアが90以上になっているか確認</li>
                <li>モバイルデバイスでインストール可能か確認</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">その他のホスティング設定</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Vercel</h4>
                  <CodeBlock
                    code={`{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Cache-Control", 
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}`}
                    language="JSON"
                    id="vercel"
                  />
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Firebase Hosting</h4>
                  <CodeBlock
                    code={`{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json"],
    "rewrites": [{
      "source": "**",
      "destination": "/index.html"
    }],
    "headers": [{
      "source": "/sw.js",
      "headers": [{
        "key": "Cache-Control",
        "value": "no-cache"
      }]
    }]
  }
}`}
                    language="JSON"
                    id="firebase"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* フッター */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-12 text-center"
        >
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">🎉 PWA実装完了！</h3>
            <p className="text-blue-800">
              ドッグパークJPは完全なPWA対応が実装されており、
              ユーザーはネイティブアプリのような体験を享受できます。
            </p>
            <div className="mt-4 flex justify-center space-x-4">
              <a
                href="https://web.dev/pwa-checklist/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                PWA公式チェックリスト
              </a>
              <a
                href="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                MDN PWAガイド
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PWAImplementationGuide;

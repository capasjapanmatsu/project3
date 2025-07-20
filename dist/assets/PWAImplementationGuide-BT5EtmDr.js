import{j as e,m as t,aT as y,aU as f,g as c,aV as m,h as v,W as N,a as w,D as C,e as k,a7 as x,l as h,aj as P}from"./ui-vendor-w2MLOks7.js";import{r as p}from"./react-vendor-_GyjDmDn.js";import{H as W}from"./index-pj4YkVsE.js";import"./supabase-vendor-Df9iqQzW.js";const _=()=>{const[l,g]=p.useState("overview"),[u,d]=p.useState(null),j=[{id:"manifest",title:"1. manifest.json の作成",description:"PWAのメタデータとアイコンを定義",type:"manifest",completed:!0,code:`{
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
}`},{id:"serviceworker",title:"2. Service Worker の実装",description:"キャッシュ戦略とオフライン機能を提供",type:"serviceworker",completed:!0,code:`// Service Worker の基本実装
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
});`},{id:"registration",title:"3. Service Worker の登録",description:"メインアプリケーションでService Workerを登録",type:"registration",completed:!0,code:`// main.tsx または index.js
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
}`},{id:"html",title:"4. HTML の設定",description:"PWAに必要なメタタグとリンクを追加",type:"html",completed:!0,code:`<!DOCTYPE html>
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
  <script type="module" src="/src/main.tsx"><\/script>
</body>
</html>`},{id:"offline",title:"5. オフラインページの作成",description:"ネットワーク接続がない時の代替ページ",type:"html",completed:!0,code:`<!DOCTYPE html>
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
</html>`},{id:"build",title:"6. ビルド設定の最適化",description:"Vite/Webpack等でPWA用の最適化を実装",type:"build",completed:!0,code:`// vite.config.ts
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
});`}],b=async(s,i)=>{try{await navigator.clipboard.writeText(s),d(i),setTimeout(()=>d(null),2e3)}catch(r){console.error("コピーに失敗しました:",r)}},a=({icon:s,title:i,description:r,status:o})=>e.jsx(t.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},className:"bg-white rounded-xl p-6 shadow-sm border border-gray-100",children:e.jsxs("div",{className:"flex items-start space-x-4",children:[e.jsx("div",{className:"flex-shrink-0 text-2xl",children:s}),e.jsxs("div",{className:"flex-1",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("h3",{className:"text-lg font-semibold text-gray-900",children:i}),o==="completed"&&e.jsx(c,{className:"w-5 h-5 text-green-500"}),o==="pending"&&e.jsx(h,{className:"w-5 h-5 text-yellow-500"}),o==="error"&&e.jsx(h,{className:"w-5 h-5 text-red-500"})]}),e.jsx("p",{className:"text-gray-600 mt-1",children:r})]})]})}),n=({code:s,language:i,id:r})=>e.jsxs("div",{className:"relative bg-gray-900 rounded-lg overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between px-4 py-2 bg-gray-800",children:[e.jsx("span",{className:"text-sm text-gray-300",children:i}),e.jsxs("button",{onClick:()=>b(s,r),className:"flex items-center space-x-1 text-gray-300 hover:text-white transition-colors",children:[e.jsx(P,{className:"w-4 h-4"}),e.jsx("span",{className:"text-xs",children:u===r?"コピー済み":"コピー"})]})]}),e.jsx("pre",{className:"p-4 overflow-x-auto",children:e.jsx("code",{className:"text-sm text-gray-100",children:s})})]});return e.jsxs("div",{className:"min-h-screen bg-gray-50 py-12",children:[e.jsxs(W,{children:[e.jsx("title",{children:"PWA実装ガイド - ドッグパークJP"}),e.jsx("meta",{name:"description",content:"ドッグパークJPのPWA（プログレッシブ・ウェブ・アプリ）実装の完全ガイド"})]}),e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",children:[e.jsxs(t.div,{initial:{opacity:0,y:-20},animate:{opacity:1,y:0},className:"text-center mb-12",children:[e.jsx("h1",{className:"text-4xl font-bold text-gray-900 mb-4",children:"PWA実装ガイド"}),e.jsx("p",{className:"text-xl text-gray-600 max-w-3xl mx-auto",children:"ドッグパークJPのプログレッシブ・ウェブ・アプリ（PWA）実装の完全なガイドとコード例"})]}),e.jsx("div",{className:"flex justify-center mb-8",children:e.jsx("div",{className:"bg-white rounded-lg p-1 shadow-sm border border-gray-200",children:[{key:"overview",label:"概要",icon:e.jsx(y,{className:"w-4 h-4"})},{key:"implementation",label:"実装",icon:e.jsx(f,{className:"w-4 h-4"})},{key:"testing",label:"テスト",icon:e.jsx(c,{className:"w-4 h-4"})},{key:"deployment",label:"デプロイ",icon:e.jsx(m,{className:"w-4 h-4"})}].map(s=>e.jsxs("button",{onClick:()=>g(s.key),className:`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${l===s.key?"bg-blue-500 text-white":"text-gray-600 hover:text-gray-900"}`,children:[s.icon,e.jsx("span",{children:s.label})]},s.key))})}),l==="overview"&&e.jsxs(t.div,{initial:{opacity:0},animate:{opacity:1},className:"space-y-8",children:[e.jsxs("div",{className:"grid md:grid-cols-2 lg:grid-cols-3 gap-6",children:[e.jsx(a,{icon:e.jsx(v,{}),title:"ホーム画面への追加",description:"ネイティブアプリのようにホーム画面からアクセス可能",status:"completed"}),e.jsx(a,{icon:e.jsx(N,{}),title:"オフライン機能",description:"インターネット接続がなくても基本機能を利用可能",status:"completed"}),e.jsx(a,{icon:e.jsx(m,{}),title:"高速ロード",description:"Service Workerによるキャッシュで高速な読み込み",status:"completed"}),e.jsx(a,{icon:e.jsx(w,{}),title:"セキュアな配信",description:"HTTPS必須でセキュアな通信を保証",status:"completed"}),e.jsx(a,{icon:e.jsx(C,{}),title:"自動更新",description:"新しいバージョンを自動で検出・更新",status:"completed"}),e.jsx(a,{icon:e.jsx(k,{}),title:"プッシュ通知",description:"重要な情報をプッシュ通知で配信",status:"pending"})]}),e.jsxs("div",{className:"bg-blue-50 border border-blue-200 rounded-lg p-6",children:[e.jsx("h3",{className:"text-lg font-semibold text-blue-900 mb-3",children:"PWAの利点"}),e.jsxs("ul",{className:"space-y-2 text-blue-800",children:[e.jsx("li",{children:"• ネイティブアプリのような体験を提供"}),e.jsx("li",{children:"• オフラインでも動作する信頼性"}),e.jsx("li",{children:"• 高速な読み込みとスムーズな操作"}),e.jsx("li",{children:"• インストール不要で簡単にアクセス"}),e.jsx("li",{children:"• アプリストアを経由せずに配信可能"}),e.jsx("li",{children:"• クロスプラットフォーム対応"})]})]})]}),l==="implementation"&&e.jsx(t.div,{initial:{opacity:0},animate:{opacity:1},className:"space-y-8",children:j.map((s,i)=>e.jsxs(t.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:i*.1},className:"bg-white rounded-xl p-6 shadow-sm border border-gray-100",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("h3",{className:"text-xl font-semibold text-gray-900",children:s.title}),s.completed&&e.jsx(c,{className:"w-6 h-6 text-green-500"})]}),e.jsx("p",{className:"text-gray-600 mb-4",children:s.description}),s.code&&e.jsx(n,{code:s.code,language:s.type==="manifest"?"JSON":s.type==="html"?"HTML":"JavaScript",id:s.id})]},s.id))}),l==="testing"&&e.jsxs(t.div,{initial:{opacity:0},animate:{opacity:1},className:"space-y-8",children:[e.jsxs("div",{className:"bg-white rounded-xl p-6 shadow-sm border border-gray-100",children:[e.jsx("h3",{className:"text-xl font-semibold text-gray-900 mb-4",children:"PWA動作確認手順"}),e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"text-lg font-medium text-gray-900 mb-2",children:"1. Chrome DevToolsでの確認"}),e.jsxs("ul",{className:"list-disc list-inside text-gray-600 space-y-1",children:[e.jsx("li",{children:"Chrome DevToolsを開く（F12）"}),e.jsx("li",{children:"「Application」タブを選択"}),e.jsx("li",{children:"「Manifest」でmanifest.jsonの内容を確認"}),e.jsx("li",{children:"「Service Workers」でSWの登録状況を確認"}),e.jsx("li",{children:"「Storage」でキャッシュの状況を確認"})]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"text-lg font-medium text-gray-900 mb-2",children:"2. Lighthouse PWA監査"}),e.jsxs("ul",{className:"list-disc list-inside text-gray-600 space-y-1",children:[e.jsx("li",{children:"Chrome DevToolsの「Lighthouse」タブを選択"}),e.jsx("li",{children:"「Progressive Web App」をチェック"}),e.jsx("li",{children:"「Generate report」をクリック"}),e.jsx("li",{children:"PWAスコアと改善点を確認"})]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"text-lg font-medium text-gray-900 mb-2",children:"3. オフライン動作テスト"}),e.jsxs("ul",{className:"list-disc list-inside text-gray-600 space-y-1",children:[e.jsx("li",{children:"Chrome DevToolsの「Network」タブを選択"}),e.jsx("li",{children:"「Offline」にチェックを入れる"}),e.jsx("li",{children:"ページをリロードしてオフラインページが表示されるか確認"}),e.jsx("li",{children:"キャッシュされたリソースが正常に読み込まれるか確認"})]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"text-lg font-medium text-gray-900 mb-2",children:"4. インストール可能性テスト"}),e.jsxs("ul",{className:"list-disc list-inside text-gray-600 space-y-1",children:[e.jsx("li",{children:"Chromeのアドレスバーにインストールアイコンが表示されるか確認"}),e.jsx("li",{children:"「Add to Home screen」が可能か確認"}),e.jsx("li",{children:"インストール後、スタンドアローンモードで起動するか確認"})]})]})]})]}),e.jsxs("div",{className:"bg-yellow-50 border border-yellow-200 rounded-lg p-6",children:[e.jsx("h4",{className:"text-lg font-medium text-yellow-900 mb-2",children:"⚠️ テスト時の注意点"}),e.jsxs("ul",{className:"list-disc list-inside text-yellow-800 space-y-1",children:[e.jsx("li",{children:"PWAのテストは必ずHTTPS環境で行う（localhost除く）"}),e.jsx("li",{children:"Service Workerの更新時はハードリフレッシュ（Ctrl+Shift+R）を実行"}),e.jsx("li",{children:"キャッシュの動作確認時は「Disable cache」のチェックを外す"}),e.jsx("li",{children:"モバイルデバイスでの実機テストも必ず実施"})]})]})]}),l==="deployment"&&e.jsxs(t.div,{initial:{opacity:0},animate:{opacity:1},className:"space-y-8",children:[e.jsxs("div",{className:"bg-white rounded-xl p-6 shadow-sm border border-gray-100",children:[e.jsx("h3",{className:"text-xl font-semibold text-gray-900 mb-4",children:"Netlifyでのデプロイ設定"}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"text-lg font-medium text-gray-900 mb-2",children:"_redirects ファイル"}),e.jsx(n,{code:`# SPA用のリダイレクト設定
/*    /index.html   200

# PWA用のヘッダー設定
/manifest.json
  Cache-Control: public, max-age=0, must-revalidate
/sw.js
  Cache-Control: public, max-age=0, must-revalidate
/offline.html
  Cache-Control: public, max-age=86400`,language:"Text",id:"redirects"})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"text-lg font-medium text-gray-900 mb-2",children:"netlify.toml 設定"}),e.jsx(n,{code:`[build]
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
    Referrer-Policy = "strict-origin-when-cross-origin"`,language:"TOML",id:"netlify-toml"})]})]})]}),e.jsxs("div",{className:"bg-green-50 border border-green-200 rounded-lg p-6",children:[e.jsx("h4",{className:"text-lg font-medium text-green-900 mb-2",children:"✅ デプロイ完了後の確認事項"}),e.jsxs("ul",{className:"list-disc list-inside text-green-800 space-y-1",children:[e.jsx("li",{children:"HTTPS配信が有効になっているか確認"}),e.jsx("li",{children:"manifest.jsonが正しく配信されているか確認"}),e.jsx("li",{children:"Service Workerが登録されているか確認"}),e.jsx("li",{children:"PWA Lighthouseスコアが90以上になっているか確認"}),e.jsx("li",{children:"モバイルデバイスでインストール可能か確認"})]})]}),e.jsxs("div",{className:"bg-white rounded-xl p-6 shadow-sm border border-gray-100",children:[e.jsx("h3",{className:"text-xl font-semibold text-gray-900 mb-4",children:"その他のホスティング設定"}),e.jsxs("div",{className:"grid md:grid-cols-2 gap-6",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"text-lg font-medium text-gray-900 mb-2",children:"Vercel"}),e.jsx(n,{code:`{
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
}`,language:"JSON",id:"vercel"})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"text-lg font-medium text-gray-900 mb-2",children:"Firebase Hosting"}),e.jsx(n,{code:`{
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
}`,language:"JSON",id:"firebase"})]})]})]})]}),e.jsx(t.div,{initial:{opacity:0},animate:{opacity:1},className:"mt-12 text-center",children:e.jsxs("div",{className:"bg-blue-50 border border-blue-200 rounded-lg p-6",children:[e.jsx("h3",{className:"text-lg font-semibold text-blue-900 mb-2",children:"🎉 PWA実装完了！"}),e.jsx("p",{className:"text-blue-800",children:"ドッグパークJPは完全なPWA対応が実装されており、 ユーザーはネイティブアプリのような体験を享受できます。"}),e.jsxs("div",{className:"mt-4 flex justify-center space-x-4",children:[e.jsxs("a",{href:"https://web.dev/pwa-checklist/",target:"_blank",rel:"noopener noreferrer",className:"inline-flex items-center text-blue-600 hover:text-blue-800",children:[e.jsx(x,{className:"w-4 h-4 mr-1"}),"PWA公式チェックリスト"]}),e.jsxs("a",{href:"https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps",target:"_blank",rel:"noopener noreferrer",className:"inline-flex items-center text-blue-600 hover:text-blue-800",children:[e.jsx(x,{className:"w-4 h-4 mr-1"}),"MDN PWAガイド"]})]})]})})]})]})};export{_ as default};

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// リソースヒントを追加
import { addResourceHints } from './utils/lazyLoad';

// 早期にリソースヒントを追加
addResourceHints();

// Appコンポーネントを遅延読み込み
const loadApp = () => {
  // 最適化版のAppを使用する場合
  if (import.meta.env.VITE_USE_OPTIMIZED === 'true') {
    return import('./App.lazy');
  }
  // 通常版
  return import('./App');
};

// Service Workerの登録（PWA）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful:', registration.scope);
      },
      (err) => {
        console.log('ServiceWorker registration failed:', err);
      }
    );
  });
}

// Web Vitalsの計測（開発環境のみ）
if (import.meta.env.DEV) {
  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
    onCLS(console.log);
    onFID(console.log);
    onFCP(console.log);
    onLCP(console.log);
    onTTFB(console.log);
  });
}

// ローディング画面を表示
const showLoadingScreen = () => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      ">
        <div style="text-align: center; color: white;">
          <div style="
            width: 60px;
            height: 60px;
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          "></div>
          <h1 style="font-size: 24px; margin: 0 0 10px;">ドッグパーク JP</h1>
          <p style="font-size: 14px; opacity: 0.8;">読み込み中...</p>
        </div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }
};

// アプリケーションの起動
const startApp = async () => {
  showLoadingScreen();
  
  try {
    const AppModule = await loadApp();
    const App = AppModule.default;
    
    const container = document.getElementById('root');
    if (!container) {
      throw new Error('Root element not found');
    }
    
    const root = createRoot(container);
    
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error('Failed to start application:', error);
    
    // エラー画面を表示
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: #f3f4f6;
          padding: 20px;
        ">
          <div style="
            text-align: center;
            max-width: 400px;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          ">
            <h1 style="color: #ef4444; font-size: 24px; margin: 0 0 10px;">
              エラーが発生しました
            </h1>
            <p style="color: #6b7280; margin: 0 0 20px;">
              アプリケーションの起動に失敗しました。<br>
              ページを再読み込みしてください。
            </p>
            <button 
              onclick="location.reload()"
              style="
                background: #3b82f6;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
              "
            >
              再読み込み
            </button>
          </div>
        </div>
      `;
    }
  }
};

// DOMContentLoadedを待ってから起動
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

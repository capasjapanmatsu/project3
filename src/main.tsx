import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import CriticalCSS, { OptimizedFontLoader, ResourceHints } from './components/CriticalCSS';
import { AuthProvider } from './context/AuthContext';
import { MaintenanceProvider } from './context/MaintenanceContext';
import './index.css';
import { initializePerformanceOptimizations } from './utils/preloadStrategies';

// パフォーマンス最適化の初期化
initializePerformanceOptimizations();

// PWA Service Worker 登録
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('🎉 Service Worker 登録成功:', registration.scope);

      // Service Worker の更新チェック
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新しいバージョンが利用可能
              console.log('🆕 新しいバージョンが利用可能です');
              showUpdateNotification();
            }
          });
        }
      });

    } catch (error) {
      console.error('❌ Service Worker 登録失敗:', error);
    }
  });
}

// PWA インストールプロンプト
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// PWA インストール可能イベント
window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  console.log('💾 PWA インストール可能になりました');

  // インストールボタンを表示（実装は App.tsx で行う）
  window.dispatchEvent(new Event('pwa-installable'));
});

// PWA インストール成功イベント
window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA インストールが完了しました');
  deferredPrompt = null;
});

// エラーハンドリング
window.addEventListener('error', (e) => {
  console.error('❌ グローバルエラー:', e.error);
  // 本番環境でのエラー報告（実装に応じて調整）
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('❌ 未処理のPromise拒否:', e.reason);
  // 本番環境でのエラー報告（実装に応じて調整）
});

// 更新通知表示
function showUpdateNotification() {
  // 実際のプロジェクトでは、適切な通知コンポーネントを使用
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3b82f6;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 320px;
    ">
      <div style="font-weight: 600; margin-bottom: 8px;">新バージョン利用可能</div>
      <div style="margin-bottom: 12px;">アプリの新しいバージョンが利用可能です。</div>
      <button onclick="window.location.reload()" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-right: 8px;
      ">更新</button>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: none;
        border: none;
        color: rgba(255,255,255,0.8);
        cursor: pointer;
        font-size: 12px;
      ">後で</button>
    </div>
  `;

  document.body.appendChild(notification);

  // 10秒後に自動で消去
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 10000);
}

// PWA インストール処理
export const installPWA = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    console.log('PWA インストールプロンプトが利用できません');
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('🎉 PWA インストールが受け入れられました');
      return true;
    } else {
      console.log('❌ PWA インストールが拒否されました');
      return false;
    }
  } catch (error) {
    console.error('❌ PWA インストールエラー:', error);
    return false;
  } finally {
    deferredPrompt = null;
  }
};

// パフォーマンス監視
if (import.meta.env.PROD) {
  // Real User Monitoring (RUM) の設定
  window.addEventListener('load', () => {
    // Navigation Timing API を使用した測定
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (navigationTiming) {
      const metrics = {
        dns: navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart,
        tcp: navigationTiming.connectEnd - navigationTiming.connectStart,
        request: navigationTiming.responseStart - navigationTiming.requestStart,
        response: navigationTiming.responseEnd - navigationTiming.responseStart,
        dom: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart,
        load: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
      };

      console.log('📊 パフォーマンス測定:', metrics);

      // 本番環境では、これらの値を分析サービスに送信
      // 例: Google Analytics, Mixpanel, カスタム分析など
    }
  });
}

// メインアプリケーションのレンダリング
const root = ReactDOM.createRoot(document.getElementById('root')!);

// 開発環境でのStrictMode、本番環境では無効化（パフォーマンス向上）
const AppWrapper = import.meta.env.PROD ? (
  <CriticalCSS>
    <ResourceHints />
    <OptimizedFontLoader />
    <HelmetProvider>
      <BrowserRouter>
        <MaintenanceProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MaintenanceProvider>
      </BrowserRouter>
    </HelmetProvider>
  </CriticalCSS>
) : (
  <React.StrictMode>
    <CriticalCSS>
      <ResourceHints />
      <OptimizedFontLoader />
      <HelmetProvider>
        <BrowserRouter>
          <MaintenanceProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </MaintenanceProvider>
        </BrowserRouter>
      </HelmetProvider>
    </CriticalCSS>
  </React.StrictMode>
);

root.render(AppWrapper);

// Hot Module Replacement (HMR) の設定
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('🔄 HMR: アプリケーションが更新されました');
  });
}

// メモリリーク防止
window.addEventListener('beforeunload', () => {
  // 必要に応じてクリーンアップ処理を追加
  console.log('🧹 アプリケーションのクリーンアップ中...');
});

// デバッグ用（開発環境のみ）
if (import.meta.env.DEV) {
  // @ts-ignore
  window.debugPerformance = () => {
    const entries = performance.getEntriesByType('measure');
    console.table(entries);
  };

  // @ts-ignore
  window.debugMemory = () => {
    if ('memory' in performance) {
      // @ts-ignore
      console.log('メモリ使用量:', performance.memory);
    }
  };
}

// パフォーマンス最適化のためのイベントリスナー
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // タブが非アクティブになった時の処理
    console.log('📱 タブが非アクティブになりました');
  } else {
    // タブがアクティブになった時の処理
    console.log('📱 タブがアクティブになりました');
  }
});

// Connection API を使用したネットワーク最適化
if ('connection' in navigator) {
  // @ts-ignore
  const connection = (navigator as any).connection;

  if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
    console.log('🐌 低速ネットワークが検出されました');
    // 低速ネットワーク用の最適化を実行
    document.body.classList.add('slow-network');
  }

  if (connection) {
    connection.addEventListener('change', () => {
      console.log('📡 ネットワーク状態が変更されました:', connection.effectiveType);
    });
  }
}
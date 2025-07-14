import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { MaintenanceProvider } from './context/MaintenanceContext';
import App from './App';
import './index.css';

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
  console.log('📱 PWA インストール可能');
  showInstallButton();
});

// PWA インストール完了イベント
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA インストール完了');
  deferredPrompt = null;
  hideInstallButton();
});

// インストールボタンの表示
function showInstallButton() {
  // カスタムインストールボタンがある場合の処理
  const installButton = document.getElementById('pwa-install-button');
  if (installButton) {
    installButton.style.display = 'block';
    installButton.addEventListener('click', installPWA);
  }
}

// インストールボタンの非表示
function hideInstallButton() {
  const installButton = document.getElementById('pwa-install-button');
  if (installButton) {
    installButton.style.display = 'none';
  }
}

// PWA インストール実行
async function installPWA() {
  if (!deferredPrompt) return;
  
  try {
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('👍 ユーザーがPWAインストールを承認');
    } else {
      console.log('👎 ユーザーがPWAインストールを拒否');
    }
    
    deferredPrompt = null;
  } catch (error) {
    console.error('❌ PWA インストールエラー:', error);
  }
}

// Service Worker 更新通知
function showUpdateNotification() {
  // カスタム更新通知の表示
  if (window.confirm('新しいバージョンが利用可能です。更新しますか？')) {
    window.location.reload();
  }
}

// オフライン/オンライン状態の監視
window.addEventListener('online', () => {
  console.log('🌐 オンラインに復帰');
  showNetworkStatus('オンライン', 'success');
});

window.addEventListener('offline', () => {
  console.log('📵 オフラインモード');
  showNetworkStatus('オフライン', 'warning');
});

// ネットワーク状態表示
function showNetworkStatus(status: string, type: 'success' | 'warning') {
  // 簡単なトースト通知
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    background: ${type === 'success' ? '#10b981' : '#f59e0b'};
    transition: all 0.3s ease;
  `;
  toast.textContent = `接続状態: ${status}`;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

// 緊急モードのタイムアウト設定
const EMERGENCY_TIMEOUT = process.env.NODE_ENV === 'development' ? 120000 : 60000; // 開発環境: 120秒, 本番: 60秒

// 緊急モードのフラグ
let isEmergencyMode = false;

// アプリケーションの初期化タイムアウト
const initTimeout = setTimeout(() => {
  if (!isEmergencyMode) {
    console.warn('⚠️ App initialization timeout reached. Activating emergency mode...');
    isEmergencyMode = true;
    
    // 緊急モードでレンダリング
    const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
    root.render(
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">アプリケーション緊急モード</h1>
              <p className="text-gray-600 text-sm mb-4">
                アプリケーションの読み込みに時間がかかっています。
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <h4 className="font-medium text-yellow-900 mb-1">システム情報:</h4>
              <div className="text-sm text-yellow-800 space-y-1">
                <p>環境: {process.env.NODE_ENV === 'development' ? '開発' : '本番'}</p>
                <p>URL: {window.location.href}</p>
                <p>オンライン: {navigator.onLine ? 'はい' : 'いいえ'}</p>
                <p>PWA: {window.matchMedia('(display-mode: standalone)').matches ? 'はい' : 'いいえ'}</p>
                <p>時刻: {new Date().toLocaleString('ja-JP')}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                      registrations.forEach(registration => registration.unregister());
                    });
                  }
                  window.location.reload();
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                全データクリア & 再読み込み
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                再読み込み
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}, EMERGENCY_TIMEOUT);

// 通常のアプリケーション初期化
try {
  console.log('🚀 Starting app initialization...');
  
  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
  
  // 初期化完了をマーク
  const markInitialized = () => {
    clearTimeout(initTimeout);
    isEmergencyMode = false;
    console.log('✅ App initialized successfully');
  };
  
  // アプリケーションをレンダリング
  root.render(
    <React.StrictMode>
      <HelmetProvider>
        <BrowserRouter>
          <AuthProvider>
            <MaintenanceProvider>
              <App />
            </MaintenanceProvider>
          </AuthProvider>
        </BrowserRouter>
      </HelmetProvider>
    </React.StrictMode>
  );
  
  // 初期化完了をマーク（レンダリング後）
  setTimeout(markInitialized, 100);
  
} catch (error) {
  console.error('❌ Failed to initialize app:', error);
  clearTimeout(initTimeout);
  
  // エラー時のレンダリング
  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-red-900 mb-2">初期化エラー</h1>
            <p className="text-red-600 text-sm mb-4">
              アプリケーションの初期化中にエラーが発生しました。
            </p>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <h4 className="font-medium text-red-900 mb-1">エラー詳細:</h4>
            <p className="text-sm text-red-800">{error?.toString()}</p>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => registration.unregister());
                  });
                }
                window.location.reload();
              }}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              全データクリア & 再読み込み
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              再読み込み
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// PWA デバッグ情報の出力（開発環境のみ）
if (import.meta.env.DEV) {
  console.log('🔍 PWA デバッグ情報:');
  console.log('- Service Worker サポート:', 'serviceWorker' in navigator);
  console.log('- PWA モード:', window.matchMedia('(display-mode: standalone)').matches);
  console.log('- オンライン状態:', navigator.onLine);
  console.log('- プラットフォーム:', navigator.platform);
  console.log('- ユーザーエージェント:', navigator.userAgent);
}
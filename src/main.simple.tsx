import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { MaintenanceProvider } from './context/MaintenanceContext';
import './index.css';

console.log('🚀 Starting app initialization...');

// Root要素の確認
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found');
  throw new Error('Root element not found');
}

// アプリケーションをレンダリング
try {
  const root = ReactDOM.createRoot(rootElement);
  
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

  console.log('✅ App rendered successfully');

} catch (error) {
  console.error('❌ Failed to render app:', error);
  
  // エラー時のフォールバック表示
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ 
        maxWidth: '400px', 
        width: '100%', 
        margin: '0 auto', 
        padding: '24px', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#991b1b', marginBottom: '8px' }}>
            アプリケーションエラー
          </h1>
          <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>
            アプリケーションの初期化中にエラーが発生しました。
          </p>
          <div style={{ 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '6px', 
            padding: '12px', 
            marginBottom: '16px' 
          }}>
            <h4 style={{ fontWeight: 'medium', color: '#991b1b', marginBottom: '4px' }}>エラー詳細:</h4>
            <p style={{ fontSize: '12px', color: '#b91c1c' }}>{error?.toString()}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              backgroundColor: '#dc2626',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ページを再読み込み
          </button>
        </div>
      </div>
    </div>
  );
}

// PWA Service Worker 登録（本番環境のみ）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('🎉 Service Worker 登録成功:', registration.scope);
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

window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  console.log('📱 PWA インストール可能');
});

window.addEventListener('appinstalled', () => {
  console.log('✅ PWA インストール完了');
  deferredPrompt = null;
});

// 開発環境でのデバッグ情報
if (import.meta.env.DEV) {
  console.log('🔍 開発環境デバッグ情報:');
  console.log('- Node.js環境:', import.meta.env.NODE_ENV);
  console.log('- Vite環境:', import.meta.env.MODE);
  console.log('- Service Worker サポート:', 'serviceWorker' in navigator);
  console.log('- オンライン状態:', navigator.onLine);
}

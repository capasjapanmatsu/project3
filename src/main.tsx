import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { MaintenanceProvider } from './context/MaintenanceContext';
import './index.css';
import './styles/modern.css';
import { queryClient } from './utils/queryClient';

// ===== PWA SERVICE WORKER =====
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('🎉 Service Worker registered successfully:', registration.scope);

      // Check for service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🆕 New version available');
              showUpdateNotification();
            }
          });
        }
      });
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
}

// ===== PWA INSTALL PROMPT =====
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  console.log('💾 PWA installable');
  window.dispatchEvent(new Event('pwa-installable'));
});

window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA installed successfully');
  deferredPrompt = null;
});

// ===== ERROR HANDLING =====
window.addEventListener('error', (e) => {
  console.error('❌ Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('❌ Unhandled promise rejection:', e.reason);
});

// ===== UPDATE NOTIFICATION =====
function showUpdateNotification() {
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
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 10000);
}

// ===== PWA INSTALL FUNCTION =====
export const installPWA = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    console.log('PWA install prompt not available');
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('🎉 PWA installation accepted');
      return true;
    } else {
      console.log('❌ PWA installation declined');
      return false;
    }
  } catch (error) {
    console.error('❌ PWA installation error:', error);
    return false;
  } finally {
    deferredPrompt = null;
  }
};

// ===== RENDER APPLICATION =====
const root = ReactDOM.createRoot(document.getElementById('root')!);

const AppWrapper = (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter>
          <MaintenanceProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </MaintenanceProvider>
        </BrowserRouter>
        {/* Development環境でのみReact Query DevToolsを表示 */}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </HelmetProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

root.render(AppWrapper);

// ===== HOT MODULE REPLACEMENT =====
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('🔄 HMR: Application updated');
  });
}
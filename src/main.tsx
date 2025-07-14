import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MaintenanceProvider } from './context/MaintenanceContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';
import { isStorageAvailable } from './utils/safeStorage';

// グローバルエラーハンドラーを追加
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  console.error('Error details:', {
    message: event.error?.message,
    stack: event.error?.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    timestamp: new Date().toISOString()
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  console.error('Rejection details:', {
    reason: event.reason,
    timestamp: new Date().toISOString()
  });
});

// Check storage availability and log warnings if not available
if (!isStorageAvailable('localStorage')) {
  console.warn('localStorage is not available. Using in-memory storage instead.');
}

if (!isStorageAvailable('sessionStorage')) {
  console.warn('sessionStorage is not available. Using in-memory storage instead.');
}

// 緊急フォールバック コンポーネント
const EmergencyFallback = () => {
  const handleClearAndReload = () => {
    try {
      // ローカルストレージをクリア
      const keysToRemove = [
        'sb-onmcivwxtzqajcovptgf-auth-token',
        'supabase.auth.token',
        'lastUsedEmail',
        'isTrustedDevice',
        'maintenance_last_check',
        'maintenance_status'
      ];
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove ${key}:`, e);
        }
      });
      
      // セッションストレージもクリア
      try {
        sessionStorage.clear();
      } catch (e) {
        console.warn('Failed to clear sessionStorage:', e);
      }
      
      console.log('✅ Storage cleared, reloading...');
      
      // 2秒後にリロード
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Failed to clear storage:', error);
      // それでもリロードを試行
      window.location.reload();
    }
  };

  const handleEmergencyDiagnose = () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      environment: import.meta.env.PROD ? 'production' : 'development',
      online: navigator.onLine,
      localStorage_available: typeof Storage !== 'undefined',
      sessionStorage_available: typeof Storage !== 'undefined' && !!window.sessionStorage,
      console_errors: [] as string[]
    };

    // ローカルストレージの内容を確認
    try {
      const authTokens = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('auth')
      );
      diagnostics.console_errors.push(`Auth tokens: ${authTokens.join(', ')}`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      diagnostics.console_errors.push(`LocalStorage error: ${errorMessage}`);
    }

    console.log('🔍 Emergency Diagnostics:', diagnostics);
    
    // 診断結果をアラートで表示
    alert(`緊急診断結果をコンソールに出力しました。\n\n環境: ${diagnostics.environment}\nオンライン: ${diagnostics.online}\n時刻: ${diagnostics.timestamp}\n\nF12を押してコンソールを確認してください。`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            アプリケーション緊急モード
          </h1>
          <p className="text-gray-600 mb-4">
            アプリケーションの読み込みに時間がかかっています。
          </p>
          
          {/* 本番環境での情報表示 */}
          <div className="mb-4 p-3 bg-yellow-50 rounded border text-sm text-left">
            <p className="font-medium text-yellow-800 mb-1">システム情報:</p>
            <div className="text-yellow-700 space-y-1">
              <p>環境: {import.meta.env.PROD ? '本番' : '開発'}</p>
              <p>URL: {window.location.href}</p>
              <p>オンライン: {navigator.onLine ? 'はい' : 'いいえ'}</p>
              <p>時刻: {new Date().toLocaleString('ja-JP')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleClearAndReload}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              ストレージをクリアして再読み込み
            </button>
            
            <button
              onClick={handleEmergencyDiagnose}
              className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
            >
              緊急診断を実行
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              強制再読み込み
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              ホームページに移動
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t text-xs text-gray-500">
            <p>
              問題が続く場合は、ブラウザのキャッシュを削除するか、
              <br />
              シークレットモードでお試しください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppWrapper = () => {
  const [emergencyMode, setEmergencyMode] = useState(false);

  useEffect(() => {
    // 本番環境では60秒、開発環境では30秒後に緊急モードを有効化
    const emergencyTimeoutDuration = import.meta.env.PROD ? 60000 : 30000;
    
    const emergencyTimeout = setTimeout(() => {
      console.warn(`Emergency mode activated: App took too long to initialize (${emergencyTimeoutDuration}ms)`);
      setEmergencyMode(true);
    }, emergencyTimeoutDuration);

    return () => clearTimeout(emergencyTimeout);
  }, []);

  if (emergencyMode) {
    return <EmergencyFallback />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <MaintenanceProvider>
            <App />
          </MaintenanceProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);
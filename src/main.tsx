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
            読み込み中です
          </h1>
          <p className="text-gray-600 mb-4">
            アプリケーションを読み込んでいます。しばらくお待ちください。
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    </div>
  );
};

const AppWrapper = () => {
  const [emergencyMode, setEmergencyMode] = useState(false);

  useEffect(() => {
    // 30秒後に緊急モードを有効化
    const emergencyTimeout = setTimeout(() => {
      console.warn('Emergency mode activated: App took too long to initialize');
      setEmergencyMode(true);
    }, 30000);

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
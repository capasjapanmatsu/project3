import React from 'react';
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <MaintenanceProvider>
            <App />
          </MaintenanceProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
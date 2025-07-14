import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { MaintenanceProvider } from './context/MaintenanceContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { isStorageAvailable } from './utils/safeStorage';

// Global error handling
window.addEventListener('error', (event) => {
  if (import.meta.env.PROD) {
    // In production, you would send this to an error tracking service
    console.error('Global error:', event.error);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (import.meta.env.PROD) {
    // In production, you would send this to an error tracking service
    console.error('Unhandled promise rejection:', event.reason);
  }
});

// Check storage availability and log warnings if not available
if (!isStorageAvailable('localStorage')) {
  console.warn('localStorage is not available. Using in-memory storage instead.');
}

if (!isStorageAvailable('sessionStorage')) {
  console.warn('sessionStorage is not available. Using in-memory storage instead.');
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <MaintenanceProvider>
          <App />
        </MaintenanceProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
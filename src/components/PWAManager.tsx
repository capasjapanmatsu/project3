import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  X, 
  CheckCircle,
  Smartphone,
  Bell
} from 'lucide-react';

interface PWAStatus {
  isInstalled: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  canInstall: boolean;
  canNotify: boolean;
}

interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAManager: React.FC = () => {
  const [pwaStatus, setPwaStatus] = useState<PWAStatus>({
    isInstalled: false,
    isOnline: navigator.onLine,
    hasUpdate: false,
    canInstall: false,
    canNotify: false
  });
  
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallPrompt | null>(null);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // PWA状態の初期化
    initializePWAStatus();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // Service Worker の状態監視
    monitorServiceWorker();
    
    return () => {
      removeEventListeners();
    };
  }, []);

  const initializePWAStatus = () => {
    setPwaStatus(prev => ({
      ...prev,
      isInstalled: window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true,
      isOnline: navigator.onLine,
      canNotify: 'Notification' in window
    }));
  };

  const setupEventListeners = () => {
    // オンライン/オフライン状態の監視
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    // PWAインストールプロンプト
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // PWAインストール完了
    window.addEventListener('appinstalled', handleAppInstalled);
  };

  const removeEventListeners = () => {
    window.removeEventListener('online', handleOnlineStatus);
    window.removeEventListener('offline', handleOnlineStatus);
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  };

  const handleOnlineStatus = () => {
    setPwaStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine
    }));
  };

  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    setDeferredPrompt(e as any);
    setPwaStatus(prev => ({
      ...prev,
      canInstall: true
    }));
    setShowInstallPrompt(true);
  };

  const handleAppInstalled = () => {
    console.log('PWA がインストールされました');
    setPwaStatus(prev => ({
      ...prev,
      isInstalled: true,
      canInstall: false
    }));
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  const monitorServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Service Worker の更新チェック
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setPwaStatus(prev => ({ ...prev, hasUpdate: true }));
                setUpdateRegistration(registration);
                setShowUpdatePrompt(true);
              }
            });
          }
        });

        // 定期的な更新チェック
        setInterval(() => {
          registration.update();
        }, 60000); // 1分ごと

      } catch (error) {
        console.error('Service Worker の監視でエラーが発生しました:', error);
      }
    }
  };

  const installPWA = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('インストール結果:', outcome);
      
      if (outcome === 'accepted') {
        console.log('ユーザーがPWAインストールを承認しました');
      } else {
        console.log('ユーザーがPWAインストールを拒否しました');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      setPwaStatus(prev => ({ ...prev, canInstall: false }));
      
    } catch (error) {
      console.error('PWAインストールでエラーが発生しました:', error);
    }
  };

  const updatePWA = async () => {
    if (!updateRegistration) return;

    try {
      // 新しい Service Worker をアクティベート
      if (updateRegistration.waiting) {
        updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // ページをリロード
      window.location.reload();
      
    } catch (error) {
      console.error('PWA更新でエラーが発生しました:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('このブラウザは通知をサポートしていません');
      return;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      setPwaStatus(prev => ({ ...prev, canNotify: true }));
      
      // テスト通知を送信
      new Notification('ドッグパークJP', {
        body: '通知が有効になりました！',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png'
      });
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    setPwaStatus(prev => ({ ...prev, canInstall: false }));
  };

  const dismissUpdatePrompt = () => {
    setShowUpdatePrompt(false);
    setPwaStatus(prev => ({ ...prev, hasUpdate: false }));
  };

  return (
    <>
      {/* PWA状態インジケーター */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {/* PWAインストール状態 */}
        {pwaStatus.isInstalled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-full shadow-lg"
          >
            <Smartphone className="w-4 h-4" />
            <span className="text-sm font-medium">PWAインストール済み</span>
          </motion.div>
        )}
      </div>

      {/* インストールプロンプト */}
      {showInstallPrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                アプリをインストール
              </h3>
              <button
                onClick={dismissInstallPrompt}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                ドッグパークJPをホーム画面に追加して、
                ネイティブアプリのように利用しませんか？
              </p>
              
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>高速な起動</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>オフライン機能</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>プッシュ通知</span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={installPWA}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>インストール</span>
              </button>
              <button
                onClick={dismissInstallPrompt}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                後で
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 更新プロンプト */}
      {showUpdatePrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                新しいバージョンが利用可能
              </h3>
              <button
                onClick={dismissUpdatePrompt}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                ドッグパークJPの新しいバージョンが利用可能です。
                更新しますか？
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={updatePWA}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>今すぐ更新</span>
              </button>
              <button
                onClick={dismissUpdatePrompt}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                後で
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 通知許可プロンプト */}
      {!pwaStatus.canNotify && pwaStatus.isInstalled && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-20 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-40"
        >
          <div className="flex items-start space-x-3">
            <Bell className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">
                通知を許可しますか？
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                重要な情報をお知らせできます
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={requestNotificationPermission}
                className="text-xs bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors"
              >
                許可
              </button>
              <button
                onClick={() => setPwaStatus(prev => ({ ...prev, canNotify: true }))}
                className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
              >
                後で
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default PWAManager;

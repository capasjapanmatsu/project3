import {
    Monitor,
    RefreshCw,
    Settings,
    Trash2,
    Wifi,
    WifiOff,
    X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { log } from '../utils/helpers';

interface PWADebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWADebugPanel: React.FC<PWADebugPanelProps> = ({ isOpen, onClose }) => {
  const [swRegistration, setSWRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [cacheNames, setCacheNames] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pwaInfo, setPWAInfo] = useState({
    canInstall: false,
    isInstalled: window.matchMedia('(display-mode: standalone)').matches,
    platform: navigator.platform,
    userAgent: navigator.userAgent.substring(0, 50) + '...'
  });

  useEffect(() => {
    if (!isOpen) return;

    // Service Worker 情報を取得
    navigator.serviceWorker.getRegistration().then(reg => {
      setSWRegistration(reg || null);
    });

    // キャッシュ情報を取得
    if ('caches' in window) {
      caches.keys().then(names => {
        setCacheNames(names);
      });
    }

    // オンライン状態の監視
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOpen]);

  const handleClearAllCaches = async () => {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
      setCacheNames([]);
      log('info', '🗑️ 全キャッシュをクリアしました');
      alert('全キャッシュをクリアしました');
    }
  };

  const handleUnregisterSW = async () => {
    if (swRegistration) {
      await swRegistration.unregister();
      setSWRegistration(null);
      log('info', '🗑️ Service Worker を登録解除しました');
      alert('Service Worker を登録解除しました');
    }
  };

  const handleReloadPage = () => {
    window.location.reload();
  };

  const handleSimulateOffline = () => {
    if (isOnline) {
      // オフライン状態をシミュレート
      alert('実際のオフラインテストはブラウザのDevToolsを使用してください');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            PWA デバッグパネル
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-6">
          {/* システム情報 */}
          <div>
            <h3 className="font-medium mb-3 flex items-center">
              <Monitor className="w-4 h-4 mr-2" />
              システム情報
            </h3>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>PWA モード:</span>
                <span className={pwaInfo.isInstalled ? 'text-green-600' : 'text-gray-600'}>
                  {pwaInfo.isInstalled ? 'インストール済み' : '未インストール'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ネットワーク状態:</span>
                <span className={`flex items-center ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? <Wifi className="w-4 h-4 mr-1" /> : <WifiOff className="w-4 h-4 mr-1" />}
                  {isOnline ? 'オンライン' : 'オフライン'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>プラットフォーム:</span>
                <span className="text-gray-600">{pwaInfo.platform}</span>
              </div>
              <div className="flex justify-between">
                <span>User Agent:</span>
                <span className="text-gray-600 text-xs">{pwaInfo.userAgent}</span>
              </div>
            </div>
          </div>

          {/* Service Worker 情報 */}
          <div>
            <h3 className="font-medium mb-3">Service Worker</h3>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>状態:</span>
                <span className={swRegistration ? 'text-green-600' : 'text-red-600'}>
                  {swRegistration ? '登録済み' : '未登録'}
                </span>
              </div>
              {swRegistration && (
                <>
                  <div className="flex justify-between">
                    <span>スコープ:</span>
                    <span className="text-gray-600">{swRegistration.scope}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>アクティブ:</span>
                    <span className={swRegistration.active ? 'text-green-600' : 'text-red-600'}>
                      {swRegistration.active ? 'はい' : 'いいえ'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* キャッシュ情報 */}
          <div>
            <h3 className="font-medium mb-3">キャッシュ情報</h3>
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <div className="mb-2">
                <span className="font-medium">キャッシュ数: </span>
                <span className="text-gray-600">{cacheNames.length}個</span>
              </div>
              {cacheNames.length > 0 && (
                <div className="space-y-1">
                  {cacheNames.map((name, index) => (
                    <div key={index} className="text-xs text-gray-500 bg-white p-1 rounded">
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 操作ボタン */}
          <div>
            <h3 className="font-medium mb-3">操作</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleClearAllCaches}
                className="flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                キャッシュクリア
              </button>
              
              <button
                onClick={handleUnregisterSW}
                className="flex items-center justify-center px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                disabled={!swRegistration}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                SW登録解除
              </button>
              
              <button
                onClick={handleReloadPage}
                className="flex items-center justify-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                ページ再読み込み
              </button>
              
              <button
                onClick={handleSimulateOffline}
                className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <WifiOff className="w-4 h-4 mr-2" />
                オフラインテスト
              </button>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h4 className="font-medium text-yellow-800 mb-2">注意事項</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• このパネルは開発環境でのみ表示されます</li>
              <li>• オフラインテストはブラウザのDevToolsで行ってください</li>
              <li>• キャッシュクリア後はページが再読み込みされる場合があります</li>
              <li>• Service Worker の変更は再登録が必要です</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWADebugPanel; 
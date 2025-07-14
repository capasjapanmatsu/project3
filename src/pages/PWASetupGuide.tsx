import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { pwaManager } from '../utils/pwa';

interface PWAFeature {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
}

interface PWASetupStep {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  code?: string;
  completed: boolean;
}

interface PWAStatus {
  isInstalled: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  canInstall: boolean;
}

const PWASetupGuide: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [pwaStatus, setPwaStatus] = useState<PWAStatus>({
    isInstalled: false,
    isOnline: true,
    hasUpdate: false,
    canInstall: false
  });

  // PWA機能の定義
  const pwaFeatures: PWAFeature[] = [
    {
      icon: '📱',
      title: 'ホーム画面への追加',
      description: 'アプリをホーム画面に追加してネイティブアプリのように利用',
      enabled: true
    },
    {
      icon: '⚡',
      title: 'オフライン機能',
      description: 'インターネット接続がなくても一部機能を利用可能',
      enabled: true
    },
    {
      icon: '🔄',
      title: '自動更新',
      description: 'アプリの新しいバージョンを自動で検出・更新',
      enabled: true
    },
    {
      icon: '📊',
      title: 'バックグラウンド同期',
      description: 'オフライン時のデータを接続復帰時に自動同期',
      enabled: true
    },
    {
      icon: '🔔',
      title: 'プッシュ通知',
      description: '重要なお知らせを即座に受信',
      enabled: false
    },
    {
      icon: '💾',
      title: 'キャッシュ機能',
      description: '高速な読み込みとデータ使用量の削減',
      enabled: true
    }
  ];

  // セットアップ手順の定義
  const setupSteps: PWASetupStep[] = [
    {
      id: 'manifest-check',
      title: 'マニフェスト設定の確認',
      description: 'PWAマニフェストファイルが正しく設定されているか確認します。',
      instructions: [
        'ブラウザのDevToolsを開く (F12)',
        'Application タブに移動',
        'Manifest セクションを確認',
        'アプリ名、アイコン、表示設定を確認'
      ],
      code: `{
  "name": "ドッグパークJP",
  "short_name": "ドッグパークJP",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#3B82F6",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}`,
      completed: false
    },
    {
      id: 'service-worker-check',
      title: 'Service Worker の確認',
      description: 'Service Workerが正しく登録・動作しているか確認します。',
      instructions: [
        'DevToolsのApplication タブを開く',
        'Service Workers セクションを確認',
        '登録済みのService Workerを確認',
        'ステータスが "running" になっているか確認'
      ],
      completed: false
    },
    {
      id: 'cache-check',
      title: 'キャッシュ機能の確認',
      description: 'アプリリソースが正しくキャッシュされているか確認します。',
      instructions: [
        'DevToolsのApplication タブを開く',
        'Storage > Cache Storage を確認',
        'キャッシュされたファイル一覧を確認',
        'オフラインモードで動作テスト'
      ],
      completed: false
    },
    {
      id: 'install-test',
      title: 'インストール機能のテスト',
      description: 'アプリのインストール機能をテストします。',
      instructions: [
        'ブラウザのアドレスバーにインストールアイコンが表示されるか確認',
        'インストールプロンプトの動作確認',
        'ホーム画面へのアプリ追加を確認',
        'スタンドアロンモードでの起動確認'
      ],
      completed: false
    },
    {
      id: 'offline-test',
      title: 'オフライン機能のテスト',
      description: 'オフライン時の動作を確認します。',
      instructions: [
        'DevToolsのNetwork タブを開く',
        '"Offline" にチェックを入れる',
        'ページをリロードして動作確認',
        'オフラインページが表示されるか確認'
      ],
      completed: false
    }
  ];

  // PWA ステータスの更新
  useEffect(() => {
    const updateStatus = () => {
      const status = pwaManager.getStatus();
      setPwaStatus(status);
    };

    updateStatus();

    // 接続状態の変化を監視
    const handleConnectionChange = () => {
      updateStatus();
    };

    window.addEventListener('connectionchange', handleConnectionChange);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('connectionchange', handleConnectionChange);
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  const handleInstallApp = async (): Promise<void> => {
    try {
      const success = await pwaManager.promptInstall();
      if (success) {
        setPwaStatus(prev => ({ ...prev, isInstalled: true, canInstall: false }));
      }
    } catch (error) {
      console.error('PWA install failed:', error);
    }
  };

  const handleClearCache = async (): Promise<void> => {
    try {
      await pwaManager.clearCache();
      window.location.reload();
    } catch (error) {
      console.error('Cache clear failed:', error);
    }
  };

  const handleCheckUpdates = async (): Promise<void> => {
    try {
      await pwaManager.checkForUpdates();
    } catch (error) {
      console.error('Update check failed:', error);
    }
  };

  const copyToClipboard = (text: string): void => {
    void navigator.clipboard.writeText(text).then(() => {
      alert('クリップボードにコピーしました！');
    });
  };

  const renderStatusIndicator = (): JSX.Element => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">PWA ステータス</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${pwaStatus.isInstalled ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-sm">
            インストール: {pwaStatus.isInstalled ? '済み' : '未完了'}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${pwaStatus.isOnline ? 'bg-green-500' : 'bg-orange-500'}`} />
          <span className="text-sm">
            接続: {pwaStatus.isOnline ? 'オンライン' : 'オフライン'}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${pwaStatus.hasUpdate ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <span className="text-sm">
            更新: {pwaStatus.hasUpdate ? '利用可能' : '最新'}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${pwaStatus.canInstall ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <span className="text-sm">
            インストール: {pwaStatus.canInstall ? '可能' : '不可'}
          </span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-4">
        {pwaStatus.canInstall && (
          <button
            onClick={() => void handleInstallApp()}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            📱 アプリをインストール
          </button>
        )}
        <button
          onClick={() => void handleCheckUpdates()}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
        >
          🔄 更新確認
        </button>
        <button
          onClick={() => void handleClearCache()}
          className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700"
        >
          🗑️ キャッシュクリア
        </button>
      </div>
    </div>
  );

  const renderFeatureGrid = (): JSX.Element => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">PWA 機能</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pwaFeatures.map((feature, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-2 ${
              feature.enabled 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl">{feature.icon}</span>
              <div>
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    feature.enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {feature.enabled ? '有効' : '無効'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStepIndicator = (): JSX.Element => (
    <div className="flex items-center mb-8 overflow-x-auto pb-2">
      {setupSteps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-shrink-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              index <= currentStep
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {index + 1}
          </div>
          {index < setupSteps.length - 1 && (
            <div
              className={`w-16 h-0.5 ${
                index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderCurrentStep = (): JSX.Element => {
    const step = setupSteps[currentStep];
    
    if (!step) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-red-600">ステップが見つかりません。</p>
        </div>
      );
    }

    return (
      <motion.div
        key={step.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h2 className="text-xl font-bold mb-4">{step.title}</h2>
        <p className="text-gray-600 mb-6">{step.description}</p>

        <div className="mb-6">
          <h3 className="font-semibold mb-3">実施手順:</h3>
          <ol className="list-decimal list-inside space-y-2">
            {step.instructions.map((instruction, index) => (
              <li key={index} className="text-sm text-gray-700">
                {instruction}
              </li>
            ))}
          </ol>
        </div>

        {step.code && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">設定例:</h4>
              <button
                onClick={() => copyToClipboard(step.code!)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                📋 コピー
              </button>
            </div>
            <pre className="text-sm overflow-x-auto">
              <code>{step.code}</code>
            </pre>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400"
          >
            前のステップ
          </button>
          
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={step.completed}
                onChange={(e) => {
                  const newSteps = [...setupSteps];
                  if (newSteps[currentStep]) {
                    newSteps[currentStep].completed = e.target.checked;
                  }
                  // ここで状態を更新する処理が必要
                }}
                className="rounded"
              />
              <span className="text-sm">完了</span>
            </label>
          </div>
          
          <button
            onClick={() => setCurrentStep(Math.min(setupSteps.length - 1, currentStep + 1))}
            disabled={currentStep === setupSteps.length - 1}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            次のステップ
          </button>
        </div>
      </motion.div>
    );
  };

  const renderTroubleshooting = (): JSX.Element => (
    <div className="bg-white rounded-lg shadow-md p-6 mt-8">
      <h2 className="text-xl font-bold mb-4">トラブルシューティング</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">💡 よくある問題と解決方法</h3>
          <div className="space-y-4">
            <div className="border-l-4 border-yellow-400 pl-4">
              <h4 className="font-medium">Service Worker が登録されない</h4>
              <ul className="text-sm text-gray-600 mt-1 space-y-1">
                <li>• HTTPSで配信されているか確認</li>
                <li>• ブラウザがService Workerをサポートしているか確認</li>
                <li>• コンソールエラーを確認</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-red-400 pl-4">
              <h4 className="font-medium">インストールプロンプトが表示されない</h4>
              <ul className="text-sm text-gray-600 mt-1 space-y-1">
                <li>• マニフェストファイルが正しく設定されているか確認</li>
                <li>• HTTPS で配信されているか確認</li>
                <li>• 既にインストール済みでないか確認</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-blue-400 pl-4">
              <h4 className="font-medium">オフライン機能が動作しない</h4>
              <ul className="text-sm text-gray-600 mt-1 space-y-1">
                <li>• Service Worker が正しく動作しているか確認</li>
                <li>• キャッシュが正しく設定されているか確認</li>
                <li>• オフラインページが存在するか確認</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">🔧 開発者向けツール</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Chrome DevTools</h4>
              <p className="text-sm text-gray-600 mb-2">
                Application タブで PWA の状態を確認
              </p>
              <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">F12 → Application</kbd>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Lighthouse監査</h4>
              <p className="text-sm text-gray-600 mb-2">
                PWA要件の適合性を自動チェック
              </p>
              <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">F12 → Lighthouse</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>PWA設定ガイド - ドッグパークJP</title>
        <meta name="description" content="ドッグパークJPのプログレッシブ・ウェブ・アプリ機能の設定と確認方法について詳しく説明します。" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            📱 PWA設定ガイド
          </h1>
          <p className="text-lg text-gray-600">
            プログレッシブ・ウェブ・アプリ機能の設定と動作確認
          </p>
        </div>

        {renderStatusIndicator()}
        {renderFeatureGrid()}
        {renderStepIndicator()}
        {renderCurrentStep()}
        {renderTroubleshooting()}

        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-xl font-bold mb-4">📚 参考リソース</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">公式ドキュメント</h3>
              <a href="https://web.dev/progressive-web-apps/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 block text-sm">
                Progressive Web Apps | web.dev
              </a>
              <a href="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 block text-sm">
                PWA | MDN Web Docs
              </a>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">開発ツール</h3>
              <a href="https://developers.google.com/web/tools/lighthouse" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 block text-sm">
                Lighthouse
              </a>
              <a href="https://web.dev/pwa-checklist/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 block text-sm">
                PWA Checklist
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWASetupGuide;

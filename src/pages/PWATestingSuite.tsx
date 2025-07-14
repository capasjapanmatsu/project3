import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Monitor, Smartphone, Wifi, WifiOff } from 'lucide-react';

interface PWACheckItem {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  details?: string;
}

interface PWATestSuite {
  installation: PWACheckItem[];
  offline: PWACheckItem[];
  performance: PWACheckItem[];
  security: PWACheckItem[];
  features: PWACheckItem[];
}

const PWATestingSuite: React.FC = () => {
  const [testResults, setTestResults] = useState<PWATestSuite>({
    installation: [],
    offline: [],
    performance: [],
    security: [],
    features: []
  });
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<keyof PWATestSuite>('installation');

  const runTests = async () => {
    setIsRunning(true);
    
    try {
      // インストール関連のテスト
      const installationTests = await runInstallationTests();
      
      // オフライン機能のテスト
      const offlineTests = await runOfflineTests();
      
      // パフォーマンステスト
      const performanceTests = await runPerformanceTests();
      
      // セキュリティテスト
      const securityTests = await runSecurityTests();
      
      // PWA機能テスト
      const featureTests = await runFeatureTests();

      setTestResults({
        installation: installationTests,
        offline: offlineTests,
        performance: performanceTests,
        security: securityTests,
        features: featureTests
      });
    } catch (error) {
      console.error('テスト実行エラー:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // インストール関連のテスト
  const runInstallationTests = async (): Promise<PWACheckItem[]> => {
    const tests: PWACheckItem[] = [];

    // マニフェストファイルの存在確認
    try {
      const response = await fetch('/manifest.json');
      tests.push({
        id: 'manifest-exists',
        name: 'マニフェストファイル',
        description: 'manifest.jsonファイルが存在するか',
        status: response.ok ? 'pass' : 'fail',
        details: response.ok ? 'マニフェストファイルが正常に読み込まれました' : 'マニフェストファイルが見つかりません'
      });

      if (response.ok) {
        const manifest = await response.json();
        
        // 必須フィールドの確認
        tests.push({
          id: 'manifest-name',
          name: 'アプリ名',
          description: 'manifestにname/short_nameが設定されているか',
          status: (manifest.name && manifest.short_name) ? 'pass' : 'fail',
          details: `name: ${manifest.name || '未設定'}, short_name: ${manifest.short_name || '未設定'}`
        });

        tests.push({
          id: 'manifest-icons',
          name: 'アイコン',
          description: 'manifestに適切なアイコンが設定されているか',
          status: (manifest.icons && manifest.icons.length > 0) ? 'pass' : 'fail',
          details: `${manifest.icons?.length || 0}個のアイコンが設定されています`
        });

        tests.push({
          id: 'manifest-start-url',
          name: 'スタートURL',
          description: 'manifestにstart_urlが設定されているか',
          status: manifest.start_url ? 'pass' : 'fail',
          details: `start_url: ${manifest.start_url || '未設定'}`
        });

        tests.push({
          id: 'manifest-display',
          name: '表示モード',
          description: 'manifestに適切な表示モードが設定されているか',
          status: manifest.display ? 'pass' : 'warning',
          details: `display: ${manifest.display || 'browser (デフォルト)'}`
        });
      }
    } catch (error) {
      tests.push({
        id: 'manifest-error',
        name: 'マニフェストエラー',
        description: 'マニフェストファイルの読み込みでエラーが発生',
        status: 'fail',
        details: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
      });
    }

    // Service Workerの確認
    tests.push({
      id: 'service-worker',
      name: 'Service Worker',
      description: 'Service Workerが登録されているか',
      status: 'serviceWorker' in navigator ? 'pass' : 'fail',
      details: 'serviceWorker' in navigator ? 'Service Workerがサポートされています' : 'Service Workerがサポートされていません'
    });

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        tests.push({
          id: 'service-worker-registered',
          name: 'Service Worker登録状態',
          description: 'Service Workerが実際に登録されているか',
          status: registration ? 'pass' : 'warning',
          details: registration ? `登録済み: ${registration.scope}` : '未登録または登録中'
        });
      } catch (error) {
        tests.push({
          id: 'service-worker-error',
          name: 'Service Workerエラー',
          description: 'Service Worker確認中にエラーが発生',
          status: 'fail',
          details: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
        });
      }
    }

    // インストール可能性の確認
    tests.push({
      id: 'installable',
      name: 'インストール可能性',
      description: 'PWAがインストール可能な状態か',
      status: window.matchMedia('(display-mode: standalone)').matches ? 'pass' : 'warning',
      details: window.matchMedia('(display-mode: standalone)').matches ? 
        'PWAモードで実行中' : 'ブラウザモードで実行中（インストール可能かもしれません）'
    });

    return tests;
  };

  // オフライン機能のテスト
  const runOfflineTests = async (): Promise<PWACheckItem[]> => {
    const tests: PWACheckItem[] = [];

    // オフラインページの存在確認
    try {
      const response = await fetch('/offline.html');
      tests.push({
        id: 'offline-page',
        name: 'オフラインページ',
        description: 'オフライン時に表示されるページが存在するか',
        status: response.ok ? 'pass' : 'fail',
        details: response.ok ? 'オフラインページが正常に読み込まれました' : 'オフラインページが見つかりません'
      });
    } catch (error) {
      tests.push({
        id: 'offline-page-error',
        name: 'オフラインページエラー',
        description: 'オフラインページの確認中にエラーが発生',
        status: 'fail',
        details: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
      });
    }

    // キャッシュストレージの確認
    tests.push({
      id: 'cache-api',
      name: 'Cache API',
      description: 'Cache APIがサポートされているか',
      status: 'caches' in window ? 'pass' : 'fail',
      details: 'caches' in window ? 'Cache APIがサポートされています' : 'Cache APIがサポートされていません'
    });

    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        tests.push({
          id: 'cache-stored',
          name: 'キャッシュ保存状況',
          description: 'アプリのキャッシュが保存されているか',
          status: cacheNames.length > 0 ? 'pass' : 'warning',
          details: `${cacheNames.length}個のキャッシュが保存されています: ${cacheNames.join(', ')}`
        });
      } catch (error) {
        tests.push({
          id: 'cache-error',
          name: 'キャッシュエラー',
          description: 'キャッシュ確認中にエラーが発生',
          status: 'fail',
          details: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
        });
      }
    }

    // ネットワーク状態の確認
    tests.push({
      id: 'network-status',
      name: 'ネットワーク状態',
      description: '現在のネットワーク接続状態',
      status: navigator.onLine ? 'pass' : 'warning',
      details: navigator.onLine ? 'オンライン' : 'オフライン'
    });

    return tests;
  };

  // パフォーマンステスト
  const runPerformanceTests = async (): Promise<PWACheckItem[]> => {
    const tests: PWACheckItem[] = [];

    // ページ読み込み時間の測定
    if ('performance' in window && performance.navigation) {
      const navigation = performance.navigation;
      const timing = performance.timing;
      
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      tests.push({
        id: 'load-time',
        name: 'ページ読み込み時間',
        description: 'ページの読み込み速度',
        status: loadTime < 3000 ? 'pass' : loadTime < 5000 ? 'warning' : 'fail',
        details: `${loadTime}ms（目標: 3秒以下）`
      });

      const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
      tests.push({
        id: 'dom-content-loaded',
        name: 'DOM構築時間',
        description: 'DOMContentLoadedまでの時間',
        status: domContentLoaded < 1500 ? 'pass' : domContentLoaded < 2500 ? 'warning' : 'fail',
        details: `${domContentLoaded}ms（目標: 1.5秒以下）`
      });
    }

    // リソースサイズの確認
    if ('performance' in window && performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const totalSize = resources.reduce((total, resource) => {
        return total + (resource.transferSize || 0);
      }, 0);

      tests.push({
        id: 'resource-size',
        name: 'リソースサイズ',
        description: '読み込まれたリソースの総サイズ',
        status: totalSize < 1000000 ? 'pass' : totalSize < 2000000 ? 'warning' : 'fail',
        details: `${(totalSize / 1024).toFixed(2)} KB（目標: 1MB以下）`
      });
    }

    // メモリ使用量の確認（利用可能な場合）
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      tests.push({
        id: 'memory-usage',
        name: 'メモリ使用量',
        description: 'JavaScriptヒープのメモリ使用量',
        status: memory.usedJSHeapSize < 50000000 ? 'pass' : 'warning',
        details: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`
      });
    }

    return tests;
  };

  // セキュリティテスト
  const runSecurityTests = async (): Promise<PWACheckItem[]> => {
    const tests: PWACheckItem[] = [];

    // HTTPS接続の確認
    tests.push({
      id: 'https',
      name: 'HTTPS接続',
      description: 'セキュアな接続が使用されているか',
      status: location.protocol === 'https:' || location.hostname === 'localhost' ? 'pass' : 'fail',
      details: `プロトコル: ${location.protocol}`
    });

    // Content Security Policyの確認
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    tests.push({
      id: 'csp',
      name: 'Content Security Policy',
      description: 'CSPが設定されているか',
      status: cspMeta ? 'pass' : 'warning',
      details: cspMeta ? 'CSPが設定されています' : 'CSPが設定されていません（推奨）'
    });

    // Service Worker のスコープ確認
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          tests.push({
            id: 'sw-scope',
            name: 'Service Worker スコープ',
            description: 'Service Workerのスコープが適切か',
            status: registration.scope.endsWith('/') ? 'pass' : 'warning',
            details: `スコープ: ${registration.scope}`
          });
        }
      } catch (error) {
        // エラーは無視（他のテストで確認済み）
      }
    }

    return tests;
  };

  // PWA機能テスト
  const runFeatureTests = async (): Promise<PWACheckItem[]> => {
    const tests: PWACheckItem[] = [];

    // Web App Manifestの確認
    const manifestLink = document.querySelector('link[rel="manifest"]');
    tests.push({
      id: 'manifest-link',
      name: 'マニフェストリンク',
      description: 'HTMLにマニフェストリンクが設定されているか',
      status: manifestLink ? 'pass' : 'fail',
      details: manifestLink ? `リンク先: ${(manifestLink as HTMLLinkElement).href}` : 'マニフェストリンクが見つかりません'
    });

    // アイコンの確認
    const iconLinks = document.querySelectorAll('link[rel*="icon"]');
    tests.push({
      id: 'favicon',
      name: 'ファビコン',
      description: 'ファビコンが設定されているか',
      status: iconLinks.length > 0 ? 'pass' : 'warning',
      details: `${iconLinks.length}個のアイコンリンクが見つかりました`
    });

    // ビューポート設定の確認
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    tests.push({
      id: 'viewport',
      name: 'ビューポート設定',
      description: 'モバイル対応のビューポートが設定されているか',
      status: viewportMeta ? 'pass' : 'warning',
      details: viewportMeta ? `設定: ${(viewportMeta as HTMLMetaElement).content}` : 'ビューポート設定が見つかりません'
    });

    // テーマカラーの確認
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    tests.push({
      id: 'theme-color',
      name: 'テーマカラー',
      description: 'アプリのテーマカラーが設定されているか',
      status: themeColorMeta ? 'pass' : 'warning',
      details: themeColorMeta ? `カラー: ${(themeColorMeta as HTMLMetaElement).content}` : 'テーマカラーが設定されていません'
    });

    // Push通知の対応確認
    tests.push({
      id: 'push-notifications',
      name: 'Push通知対応',
      description: 'Push通知APIがサポートされているか',
      status: 'PushManager' in window ? 'pass' : 'warning',
      details: 'PushManager' in window ? 'Push通知がサポートされています' : 'Push通知がサポートされていません'
    });

    // Background Syncの対応確認
    tests.push({
      id: 'background-sync',
      name: 'Background Sync対応',
      description: 'Background Sync APIがサポートされているか',
      status: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype ? 'pass' : 'warning',
      details: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype ? 
        'Background Syncがサポートされています' : 'Background Syncがサポートされていません'
    });

    return tests;
  };

  const getStatusIcon = (status: PWACheckItem['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <RefreshCw className="h-5 w-5 text-gray-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: PWACheckItem['status']) => {
    switch (status) {
      case 'pass':
        return 'border-green-200 bg-green-50';
      case 'fail':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'pending':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const categories = {
    installation: { name: 'インストール', icon: <Monitor className="h-4 w-4" /> },
    offline: { name: 'オフライン機能', icon: <WifiOff className="h-4 w-4" /> },
    performance: { name: 'パフォーマンス', icon: <RefreshCw className="h-4 w-4" /> },
    security: { name: 'セキュリティ', icon: <CheckCircle className="h-4 w-4" /> },
    features: { name: 'PWA機能', icon: <Smartphone className="h-4 w-4" /> }
  };

  const getCurrentTests = () => testResults[selectedCategory] || [];

  const getOverallStatus = () => {
    const allTests = Object.values(testResults).flat();
    if (allTests.length === 0) return null;
    
    const passCount = allTests.filter(test => test.status === 'pass').length;
    const failCount = allTests.filter(test => test.status === 'fail').length;
    const warningCount = allTests.filter(test => test.status === 'warning').length;
    
    return { passCount, failCount, warningCount, total: allTests.length };
  };

  useEffect(() => {
    // コンポーネントマウント時に自動でテストを実行
    runTests();
  }, []);

  const overallStatus = getOverallStatus();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">PWA テスト・チェックリスト</h1>
        <p className="text-gray-600 mb-6">
          Progressive Web App (PWA) の実装状況を包括的にテストし、改善点を特定します。
        </p>
        
        <div className="flex justify-center gap-4 mb-6">
          <Button
            onClick={runTests}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'テスト実行中...' : 'テストを再実行'}
          </Button>
        </div>

        {overallStatus && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">テスト結果サマリー</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{overallStatus.passCount}</div>
                <div className="text-sm text-gray-600">合格</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{overallStatus.warningCount}</div>
                <div className="text-sm text-gray-600">警告</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{overallStatus.failCount}</div>
                <div className="text-sm text-gray-600">失敗</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{overallStatus.total}</div>
                <div className="text-sm text-gray-600">総数</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(overallStatus.passCount / overallStatus.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                合格率: {Math.round((overallStatus.passCount / overallStatus.total) * 100)}%
              </p>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* カテゴリ選択 */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">テストカテゴリ</h3>
            <div className="space-y-2">
              {Object.entries(categories).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key as keyof PWATestSuite)}
                  className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-2 ${
                    selectedCategory === key
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {category.icon}
                  <span>{category.name}</span>
                  {testResults[key as keyof PWATestSuite] && (
                    <span className="ml-auto text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded">
                      {testResults[key as keyof PWATestSuite].length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* テスト結果表示 */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              {categories[selectedCategory].icon}
              {categories[selectedCategory].name} テスト結果
            </h3>
            
            <div className="space-y-4">
              {getCurrentTests().length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {isRunning ? 'テスト実行中...' : 'テスト結果がありません。テストを実行してください。'}
                </p>
              ) : (
                getCurrentTests().map((test) => (
                  <div
                    key={test.id}
                    className={`p-4 rounded-lg border-2 ${getStatusColor(test.status)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(test.status)}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{test.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{test.description}</p>
                        {test.details && (
                          <p className="text-sm text-gray-700 mt-2 bg-white bg-opacity-50 p-2 rounded">
                            {test.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ヘルプ情報 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">テスト項目について</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              合格 (Pass)
            </h4>
            <p className="text-gray-600">PWAの要件を満たしており、問題ありません。</p>
          </div>
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              警告 (Warning)
            </h4>
            <p className="text-gray-600">必須ではありませんが、改善を推奨します。</p>
          </div>
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              失敗 (Fail)
            </h4>
            <p className="text-gray-600">PWAの基本要件を満たしていません。修正が必要です。</p>
          </div>
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-gray-500" />
              実行中 (Pending)
            </h4>
            <p className="text-gray-600">テストを実行中です。しばらくお待ちください。</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PWATestingSuite;

import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Monitor, 
  Smartphone, 
  Globe, 
  Wifi,
  Download,
  Settings,
  RefreshCw,
  ExternalLink,
  Zap,
  Shield,
  Eye
} from 'lucide-react';

interface DeploymentChecklist {
  id: string;
  category: 'pre-deployment' | 'deployment' | 'post-deployment' | 'monitoring';
  title: string;
  description: string;
  status: 'completed' | 'pending' | 'failed' | 'not-applicable';
  priority: 'high' | 'medium' | 'low';
  autoCheck?: boolean;
  checkFunction?: () => Promise<boolean>;
  actionRequired?: string;
  resources?: { title: string; url: string }[];
}

interface DeploymentEnvironment {
  name: string;
  url?: string;
  status: 'active' | 'inactive' | 'pending';
  lastChecked?: Date;
  issues?: string[];
}

const PWADeploymentGuide: React.FC = () => {
  const [checklist, setChecklist] = useState<DeploymentChecklist[]>([]);
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<DeploymentChecklist['category']>('pre-deployment');
  const [isRunningChecks, setIsRunningChecks] = useState(false);

  const deploymentChecklist: DeploymentChecklist[] = [
    // デプロイ前チェック
    {
      id: 'manifest-validation',
      category: 'pre-deployment',
      title: 'マニフェストファイルの検証',
      description: 'manifest.jsonが正しく設定され、すべての必須フィールドが含まれているか確認',
      status: 'pending',
      priority: 'high',
      autoCheck: true,
      checkFunction: async () => {
        try {
          const response = await fetch('/manifest.json');
          if (!response.ok) return false;
          const manifest = await response.json();
          return !!(manifest.name && manifest.short_name && manifest.start_url && manifest.icons);
        } catch {
          return false;
        }
      },
      actionRequired: 'manifest.jsonの必須フィールドを確認してください',
      resources: [
        { title: 'Web App Manifest MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/Manifest' }
      ]
    },
    {
      id: 'service-worker-validation',
      category: 'pre-deployment',
      title: 'Service Workerの検証',
      description: 'Service Workerが正しく実装され、キャッシュ戦略が適切に設定されているか確認',
      status: 'pending',
      priority: 'high',
      autoCheck: true,
      checkFunction: async () => {
        if (!('serviceWorker' in navigator)) return false;
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          return !!registration;
        } catch {
          return false;
        }
      },
      actionRequired: 'Service Workerの実装を確認してください',
      resources: [
        { title: 'Service Worker API MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API' }
      ]
    },
    {
      id: 'build-optimization',
      category: 'pre-deployment',
      title: 'ビルド最適化',
      description: '本番ビルドが成功し、アセットが適切に最適化されているか確認',
      status: 'pending',
      priority: 'high',
      autoCheck: false,
      actionRequired: 'npm run buildまたはnpm run build:pwaを実行して確認',
      resources: [
        { title: 'Vite Production Build', url: 'https://vitejs.dev/guide/build.html' }
      ]
    },
    {
      id: 'responsive-design',
      category: 'pre-deployment',
      title: 'レスポンシブデザイン',
      description: '複数のデバイスサイズで適切に表示されるか確認',
      status: 'pending',
      priority: 'medium',
      autoCheck: true,
      checkFunction: async () => {
        const viewport = document.querySelector('meta[name="viewport"]');
        return !!viewport;
      },
      actionRequired: 'レスポンシブデザインの確認とテスト',
      resources: [
        { title: 'Responsive Design MDN', url: 'https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design' }
      ]
    },
    {
      id: 'accessibility-check',
      category: 'pre-deployment',
      title: 'アクセシビリティ確認',
      description: 'WCAG 2.1ガイドラインに準拠しているか確認',
      status: 'pending',
      priority: 'medium',
      autoCheck: true,
      checkFunction: async () => {
        const images = document.querySelectorAll('img');
        const imagesWithAlt = Array.from(images).filter(img => img.alt);
        return imagesWithAlt.length === images.length;
      },
      actionRequired: 'アクセシビリティ監査の実行',
      resources: [
        { title: 'WCAG 2.1 Guidelines', url: 'https://www.w3.org/WAI/WCAG21/quickref/' },
        { title: 'axe DevTools', url: 'https://www.deque.com/axe/devtools/' }
      ]
    },

    // デプロイ
    {
      id: 'https-setup',
      category: 'deployment',
      title: 'HTTPS設定',
      description: '本番環境でHTTPS接続が正しく設定されているか確認',
      status: 'pending',
      priority: 'high',
      autoCheck: true,
      checkFunction: async () => {
        return location.protocol === 'https:' || location.hostname === 'localhost';
      },
      actionRequired: '本番環境でHTTPS証明書を設定',
      resources: [
        { title: "Let's Encrypt", url: 'https://letsencrypt.org/' },
        { title: 'Netlify HTTPS', url: 'https://docs.netlify.com/domains-https/https-ssl/' }
      ]
    },
    {
      id: 'domain-setup',
      category: 'deployment',
      title: 'ドメイン設定',
      description: 'カスタムドメインが正しく設定され、DNSが適切に構成されているか確認',
      status: 'pending',
      priority: 'medium',
      autoCheck: false,
      actionRequired: 'DNSレコードの確認とドメイン設定',
      resources: [
        { title: 'Netlify Domains', url: 'https://docs.netlify.com/domains-https/custom-domains/' }
      ]
    },
    {
      id: 'cdn-setup',
      category: 'deployment',
      title: 'CDN設定',
      description: 'Content Delivery Networkが適切に設定され、静的アセットが高速配信されているか確認',
      status: 'pending',
      priority: 'medium',
      autoCheck: false,
      actionRequired: 'CDN設定の確認と最適化',
      resources: [
        { title: 'Cloudflare', url: 'https://www.cloudflare.com/' },
        { title: 'Netlify CDN', url: 'https://docs.netlify.com/domains-https/cdn/' }
      ]
    },
    {
      id: 'environment-variables',
      category: 'deployment',
      title: '環境変数設定',
      description: '本番環境で必要な環境変数がすべて正しく設定されているか確認',
      status: 'pending',
      priority: 'high',
      autoCheck: false,
      actionRequired: '本番環境の環境変数を確認',
      resources: [
        { title: 'Netlify Environment Variables', url: 'https://docs.netlify.com/configure-builds/environment-variables/' }
      ]
    },

    // デプロイ後
    {
      id: 'pwa-installability',
      category: 'post-deployment',
      title: 'PWAインストール可能性',
      description: 'ブラウザでPWAとして認識され、インストールプロンプトが表示されるか確認',
      status: 'pending',
      priority: 'high',
      autoCheck: true,
      checkFunction: async () => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 3000);
          window.addEventListener('beforeinstallprompt', () => {
            clearTimeout(timeout);
            resolve(true);
          });
        });
      },
      actionRequired: 'PWAインストール機能のテスト',
      resources: [
        { title: 'PWA Install Criteria', url: 'https://web.dev/install-criteria/' }
      ]
    },
    {
      id: 'offline-functionality',
      category: 'post-deployment',
      title: 'オフライン機能',
      description: 'ネットワーク接続がない状態でも基本機能が動作するか確認',
      status: 'pending',
      priority: 'high',
      autoCheck: true,
      checkFunction: async () => {
        if (!('caches' in window)) return false;
        const cacheNames = await caches.keys();
        return cacheNames.length > 0;
      },
      actionRequired: 'オフライン機能のテスト',
      resources: [
        { title: 'Offline Cookbook', url: 'https://web.dev/offline-cookbook/' }
      ]
    },
    {
      id: 'performance-test',
      category: 'post-deployment',
      title: 'パフォーマンステスト',
      description: 'Lighthouse監査でPWAスコア90以上を達成しているか確認',
      status: 'pending',
      priority: 'medium',
      autoCheck: false,
      actionRequired: 'Lighthouse監査の実行',
      resources: [
        { title: 'Lighthouse', url: 'https://developers.google.com/web/tools/lighthouse' },
        { title: 'PageSpeed Insights', url: 'https://pagespeed.web.dev/' }
      ]
    },
    {
      id: 'cross-browser-test',
      category: 'post-deployment',
      title: 'クロスブラウザテスト',
      description: '主要ブラウザ（Chrome、Firefox、Safari、Edge）で正常に動作するか確認',
      status: 'pending',
      priority: 'medium',
      autoCheck: false,
      actionRequired: '複数ブラウザでの動作確認',
      resources: [
        { title: 'BrowserStack', url: 'https://www.browserstack.com/' },
        { title: 'Can I Use', url: 'https://caniuse.com/' }
      ]
    },

    // 監視
    {
      id: 'analytics-setup',
      category: 'monitoring',
      title: 'アナリティクス設定',
      description: 'ユーザー行動とパフォーマンスを追跡するアナリティクスが設定されているか確認',
      status: 'pending',
      priority: 'medium',
      autoCheck: false,
      actionRequired: 'Google Analytics等の設定',
      resources: [
        { title: 'Google Analytics', url: 'https://analytics.google.com/' },
        { title: 'Netlify Analytics', url: 'https://docs.netlify.com/monitor-sites/analytics/' }
      ]
    },
    {
      id: 'error-monitoring',
      category: 'monitoring',
      title: 'エラー監視',
      description: 'JavaScriptエラーやクラッシュを監視するシステムが設定されているか確認',
      status: 'pending',
      priority: 'medium',
      autoCheck: false,
      actionRequired: 'エラー監視サービスの設定',
      resources: [
        { title: 'Sentry', url: 'https://sentry.io/' },
        { title: 'LogRocket', url: 'https://logrocket.com/' }
      ]
    },
    {
      id: 'uptime-monitoring',
      category: 'monitoring',
      title: 'アップタイム監視',
      description: 'サイトの可用性を監視し、ダウンタイムを検知するシステムが設定されているか確認',
      status: 'pending',
      priority: 'low',
      autoCheck: false,
      actionRequired: 'アップタイム監視の設定',
      resources: [
        { title: 'UptimeRobot', url: 'https://uptimerobot.com/' },
        { title: 'Pingdom', url: 'https://www.pingdom.com/' }
      ]
    },
    {
      id: 'performance-monitoring',
      category: 'monitoring',
      title: 'パフォーマンス監視',
      description: '継続的にパフォーマンスを監視し、劣化を検知するシステムが設定されているか確認',
      status: 'pending',
      priority: 'medium',
      autoCheck: false,
      actionRequired: 'パフォーマンス監視の設定',
      resources: [
        { title: 'Web Vitals', url: 'https://web.dev/vitals/' },
        { title: 'Chrome UX Report', url: 'https://developers.google.com/web/tools/chrome-user-experience-report' }
      ]
    }
  ];

  const defaultEnvironments: DeploymentEnvironment[] = [
    {
      name: 'Development',
      url: 'http://localhost:5173',
      status: 'inactive'
    },
    {
      name: 'Preview/Staging',
      url: '',
      status: 'inactive'
    },
    {
      name: 'Production',
      url: '',
      status: 'inactive'
    }
  ];

  const runAutomatedChecks = async () => {
    setIsRunningChecks(true);
    
    const updatedChecklist = [...deploymentChecklist];
    
    for (const item of updatedChecklist) {
      if (item.autoCheck && item.checkFunction) {
        try {
          const result = await item.checkFunction();
          item.status = result ? 'completed' : 'failed';
        } catch (error) {
          console.error(`Check failed for ${item.id}:`, error);
          item.status = 'failed';
        }
      }
    }
    
    setChecklist(updatedChecklist);
    setIsRunningChecks(false);
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id 
        ? { 
            ...item, 
            status: item.status === 'completed' ? 'pending' : 'completed' 
          }
        : item
    ));
  };

  const getStatusIcon = (status: DeploymentChecklist['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'not-applicable':
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: DeploymentChecklist['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-green-200 bg-green-50';
    }
  };

  const categories = {
    'pre-deployment': { name: 'デプロイ前チェック', icon: <Settings className="h-4 w-4" /> },
    'deployment': { name: 'デプロイ', icon: <Globe className="h-4 w-4" /> },
    'post-deployment': { name: 'デプロイ後確認', icon: <Monitor className="h-4 w-4" /> },
    'monitoring': { name: '監視・運用', icon: <Eye className="h-4 w-4" /> }
  };

  const getCurrentChecklist = () => checklist.filter(item => item.category === selectedCategory);

  const getOverallProgress = () => {
    if (checklist.length === 0) return 0;
    const completed = checklist.filter(item => item.status === 'completed').length;
    return Math.round((completed / checklist.length) * 100);
  };

  useEffect(() => {
    setChecklist(deploymentChecklist);
    setEnvironments(defaultEnvironments);
    // コンポーネントマウント時に自動チェックを実行
    runAutomatedChecks();
  }, []);

  const progress = getOverallProgress();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">PWA デプロイメントガイド</h1>
        <p className="text-gray-600 mb-6">
          Progressive Web Appの本番環境デプロイから運用まで、包括的なチェックリストとガイド
        </p>
        
        {/* 進捗状況 */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">デプロイメント進捗状況</h2>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div 
              className="bg-blue-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-lg font-medium">
            {progress}% 完了 ({checklist.filter(item => item.status === 'completed').length}/{checklist.length})
          </p>
        </Card>

        <div className="flex justify-center gap-4 mb-6">
          <Button
            onClick={runAutomatedChecks}
            disabled={isRunningChecks}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunningChecks ? 'animate-spin' : ''}`} />
            {isRunningChecks ? '自動チェック実行中...' : '自動チェック実行'}
          </Button>
        </div>
      </div>

      {/* 環境状況 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">デプロイメント環境</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {environments.map((env) => (
            <div key={env.name} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{env.name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  env.status === 'active' ? 'bg-green-100 text-green-800' :
                  env.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {env.status === 'active' ? 'アクティブ' :
                   env.status === 'pending' ? '保留中' : '非アクティブ'}
                </span>
              </div>
              {env.url && (
                <a 
                  href={env.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                >
                  {env.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {env.issues && env.issues.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-600 text-xs">問題: {env.issues.join(', ')}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* カテゴリ選択 */}
      <div className="flex justify-center">
        <div className="flex bg-gray-100 rounded-lg p-1 overflow-x-auto">
          {Object.entries(categories).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as DeploymentChecklist['category'])}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors whitespace-nowrap ${
                selectedCategory === key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {category.icon}
              <span className="hidden sm:inline">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* チェックリスト */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          {categories[selectedCategory].icon}
          {categories[selectedCategory].name}
        </h3>
        
        {getCurrentChecklist().map((item) => (
          <Card key={item.id} className={`p-6 border-2 ${getPriorityColor(item.priority)}`}>
            <div className="flex items-start gap-4">
              <button
                onClick={() => toggleChecklistItem(item.id)}
                className="mt-1"
                disabled={item.autoCheck}
              >
                {getStatusIcon(item.status)}
              </button>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{item.title}</h4>
                  <div className="flex items-center gap-2">
                    {item.autoCheck && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        自動チェック
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.priority === 'high' ? 'bg-red-100 text-red-800' :
                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.priority === 'high' ? '高' :
                       item.priority === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                
                {item.actionRequired && (
                  <div className="bg-white bg-opacity-70 border border-gray-200 rounded-md p-3 mb-3">
                    <p className="text-sm text-gray-700">
                      <strong>必要なアクション:</strong> {item.actionRequired}
                    </p>
                  </div>
                )}
                
                {item.resources && item.resources.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.resources.map((resource, index) => (
                      <a
                        key={index}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                      >
                        {resource.title}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 次のステップ */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          次のステップ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">デプロイメント完了後</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• 定期的なLighthouse監査の実行</li>
              <li>• パフォーマンス指標の監視</li>
              <li>• ユーザーフィードバックの収集</li>
              <li>• セキュリティ更新の適用</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">継続的改善</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• 新機能の段階的ロールアウト</li>
              <li>• A/Bテストの実施</li>
              <li>• キャッシュ戦略の最適化</li>
              <li>• PWA機能の拡張</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PWADeploymentGuide;

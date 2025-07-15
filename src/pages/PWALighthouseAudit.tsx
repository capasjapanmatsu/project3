import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Monitor, Smartphone, Wifi, Settings, Download, Globe } from 'lucide-react';

interface LighthouseMetric {
  score: number;
  displayValue: string;
  description: string;
}

interface LighthouseResults {
  performance: LighthouseMetric;
  accessibility: LighthouseMetric;
  bestPractices: LighthouseMetric;
  seo: LighthouseMetric;
  pwa: LighthouseMetric;
}

interface PWARequirement {
  id: string;
  name: string;
  description: string;
  status: 'compliant' | 'non-compliant' | 'unknown';
  score?: number;
  details: string;
  recommendation?: string;
}

const PWALighthouseAudit: React.FC = () => {
  const [auditResults, setAuditResults] = useState<LighthouseResults | null>(null);
  const [pwaRequirements, setPwaRequirements] = useState<PWARequirement[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'requirements' | 'suggestions'>('overview');

  const runLighthouseAudit = async () => {
    setIsRunning(true);
    
    try {
      // 実際のLighthouse APIを使用する場合は、適切なエンドポイントを呼び出す
      // ここではモックデータを使用
      const mockResults = await simulateLighthouseAudit();
      setAuditResults(mockResults);
      
      const requirements = await checkPWARequirements();
      setPwaRequirements(requirements);
    } catch (error) {
      console.error('Lighthouse監査エラー:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const simulateLighthouseAudit = async (): Promise<LighthouseResults> => {
    // 実際のページパフォーマンスを測定
    await new Promise(resolve => setTimeout(resolve, 2000)); // 監査シミュレーション

    const performance = await measurePagePerformance();
    const accessibility = await checkAccessibility();
    const bestPractices = await checkBestPractices();
    const seo = await checkSEO();
    const pwa = await checkPWAScore();

    return {
      performance,
      accessibility,
      bestPractices,
      seo,
      pwa
    };
  };

  const measurePagePerformance = async (): Promise<LighthouseMetric> => {
    if ('performance' in window && performance.timing) {
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const score = Math.max(0, Math.min(100, 100 - (loadTime / 100)));
      
      return {
        score: Math.round(score),
        displayValue: `${loadTime}ms`,
        description: 'ページの読み込み時間とパフォーマンス指標'
      };
    }
    
    return {
      score: 85,
      displayValue: '1.2s',
      description: 'ページの読み込み時間とパフォーマンス指標'
    };
  };

  const checkAccessibility = async (): Promise<LighthouseMetric> => {
    let score = 100;
    let issues: string[] = [];

    // 基本的なアクセシビリティチェック
    const images = document.querySelectorAll('img');
    const imagesWithoutAlt = Array.from(images).filter(img => !img.alt);
    if (imagesWithoutAlt.length > 0) {
      score -= 10;
      issues.push(`${imagesWithoutAlt.length}個の画像にalt属性がありません`);
    }

    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      score -= 15;
      issues.push('見出し要素が見つかりません');
    }

    const links = document.querySelectorAll('a');
    const linksWithoutText = Array.from(links).filter(link => !link.textContent?.trim());
    if (linksWithoutText.length > 0) {
      score -= 5;
      issues.push(`${linksWithoutText.length}個のリンクにテキストがありません`);
    }

    return {
      score: Math.max(0, score),
      displayValue: `${Math.max(0, score)}%`,
      description: issues.length > 0 ? issues.join(', ') : 'アクセシビリティ要件を満たしています'
    };
  };

  const checkBestPractices = async (): Promise<LighthouseMetric> => {
    let score = 100;
    let issues: string[] = [];

    // HTTPS接続の確認
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      score -= 20;
      issues.push('HTTPS接続を使用していません');
    }

    // CSPの確認
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!cspMeta) {
      score -= 10;
      issues.push('Content Security Policyが設定されていません');
    }

    // エラーのログ確認
    const errors = (console as any).errors || [];
    if (errors.length > 0) {
      score -= 15;
      issues.push(`${errors.length}個のJavaScriptエラーが発生しています`);
    }

    return {
      score: Math.max(0, score),
      displayValue: `${Math.max(0, score)}%`,
      description: issues.length > 0 ? issues.join(', ') : 'ベストプラクティスに従っています'
    };
  };

  const checkSEO = async (): Promise<LighthouseMetric> => {
    let score = 100;
    let issues: string[] = [];

    // titleタグの確認
    const title = document.querySelector('title');
    if (!title || !title.textContent?.trim()) {
      score -= 20;
      issues.push('titleタグが設定されていません');
    }

    // meta descriptionの確認
    const metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      score -= 15;
      issues.push('meta descriptionが設定されていません');
    }

    // viewportの確認
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      score -= 10;
      issues.push('viewportが設定されていません');
    }

    // 言語設定の確認
    const htmlLang = document.documentElement.lang;
    if (!htmlLang) {
      score -= 5;
      issues.push('html要素にlang属性が設定されていません');
    }

    return {
      score: Math.max(0, score),
      displayValue: `${Math.max(0, score)}%`,
      description: issues.length > 0 ? issues.join(', ') : 'SEO要件を満たしています'
    };
  };

  const checkPWAScore = async (): Promise<LighthouseMetric> => {
    let score = 0;
    let features: string[] = [];

    // マニフェストファイルの確認
    try {
      const response = await fetch('/manifest.json');
      if (response.ok) {
        score += 20;
        features.push('マニフェストファイル');
      }
    } catch (error) {
      // マニフェストが見つからない
    }

    // Service Workerの確認
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        score += 30;
        features.push('Service Worker');
      }
    }

    // オフライン対応の確認
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      if (cacheNames.length > 0) {
        score += 25;
        features.push('オフライン対応');
      }
    }

    // インストール可能性の確認
    if (window.matchMedia('(display-mode: standalone)').matches) {
      score += 25;
      features.push('インストール可能');
    } else {
      score += 10; // 潜在的にインストール可能
    }

    return {
      score,
      displayValue: `${features.length}/4 機能`,
      description: `実装済み: ${features.join(', ')}`
    };
  };

  const checkPWARequirements = async (): Promise<PWARequirement[]> => {
    const requirements: PWARequirement[] = [];

    // マニフェストファイルの確認
    try {
      const response = await fetch('/manifest.json');
      if (response.ok) {
        const manifest = await response.json();
        
        requirements.push({
          id: 'manifest-exists',
          name: 'Webアプリマニフェスト',
          description: 'manifest.jsonファイルが存在し、適切に設定されている',
          status: 'compliant',
          score: 100,
          details: '✓ マニフェストファイルが正常に読み込まれました',
          recommendation: '引き続き適切に管理してください'
        });

        // 必須フィールドの確認
        const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
        const missingFields = requiredFields.filter(field => !manifest[field]);
        
        if (missingFields.length === 0) {
          requirements.push({
            id: 'manifest-complete',
            name: 'マニフェスト完全性',
            description: 'マニフェストに必要なフィールドがすべて設定されている',
            status: 'compliant',
            score: 100,
            details: '✓ すべての必須フィールドが設定されています'
          });
        } else {
          requirements.push({
            id: 'manifest-incomplete',
            name: 'マニフェスト完全性',
            description: 'マニフェストに必要なフィールドがすべて設定されている',
            status: 'non-compliant',
            score: 60,
            details: `✗ 不足フィールド: ${missingFields.join(', ')}`,
            recommendation: '不足しているフィールドを追加してください'
          });
        }
      } else {
        requirements.push({
          id: 'manifest-missing',
          name: 'Webアプリマニフェスト',
          description: 'manifest.jsonファイルが存在し、適切に設定されている',
          status: 'non-compliant',
          score: 0,
          details: '✗ マニフェストファイルが見つかりません',
          recommendation: 'manifest.jsonファイルを作成してください'
        });
      }
    } catch (error) {
      requirements.push({
        id: 'manifest-error',
        name: 'Webアプリマニフェスト',
        description: 'manifest.jsonファイルが存在し、適切に設定されている',
        status: 'non-compliant',
        score: 0,
        details: '✗ マニフェストファイルの読み込みに失敗しました',
        recommendation: 'マニフェストファイルの構文を確認してください'
      });
    }

    // Service Workerの確認
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          requirements.push({
            id: 'service-worker',
            name: 'Service Worker',
            description: 'Service Workerが登録され、オフライン機能を提供している',
            status: 'compliant',
            score: 100,
            details: '✓ Service Workerが正常に登録されています'
          });
        } else {
          requirements.push({
            id: 'service-worker-missing',
            name: 'Service Worker',
            description: 'Service Workerが登録され、オフライン機能を提供している',
            status: 'non-compliant',
            score: 0,
            details: '✗ Service Workerが登録されていません',
            recommendation: 'Service Workerを実装してください'
          });
        }
      } catch (error) {
        requirements.push({
          id: 'service-worker-error',
          name: 'Service Worker',
          description: 'Service Workerが登録され、オフライン機能を提供している',
          status: 'non-compliant',
          score: 0,
          details: '✗ Service Workerの確認中にエラーが発生しました',
          recommendation: 'Service Workerの実装を確認してください'
        });
      }
    } else {
      requirements.push({
        id: 'service-worker-unsupported',
        name: 'Service Worker',
        description: 'Service Workerが登録され、オフライン機能を提供している',
        status: 'non-compliant',
        score: 0,
        details: '✗ このブラウザはService Workerをサポートしていません',
        recommendation: 'モダンブラウザでアクセスしてください'
      });
    }

    // HTTPS接続の確認
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
    requirements.push({
      id: 'https',
      name: 'セキュア接続 (HTTPS)',
      description: 'PWAはHTTPS接続で提供されている必要がある',
      status: isSecure ? 'compliant' : 'non-compliant',
      score: isSecure ? 100 : 0,
      details: isSecure ? '✓ セキュアな接続を使用しています' : '✗ HTTPSを使用していません',
      recommendation: isSecure ? undefined : 'HTTPSでアプリを提供してください'
    });

    // レスポンシブデザインの確認
    const viewport = document.querySelector('meta[name="viewport"]');
    requirements.push({
      id: 'responsive',
      name: 'レスポンシブデザイン',
      description: 'アプリが複数のデバイスサイズに対応している',
      status: viewport ? 'compliant' : 'non-compliant',
      score: viewport ? 100 : 0,
      details: viewport ? '✓ ビューポートが適切に設定されています' : '✗ ビューポートが設定されていません',
      recommendation: viewport ? undefined : 'ビューポートメタタグを追加してください'
    });

    // オフライン機能の確認
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        requirements.push({
          id: 'offline',
          name: 'オフライン機能',
          description: 'アプリがオフラインでも動作する',
          status: cacheNames.length > 0 ? 'compliant' : 'non-compliant',
          score: cacheNames.length > 0 ? 100 : 0,
          details: cacheNames.length > 0 ? 
            `✓ ${cacheNames.length}個のキャッシュが設定されています` : 
            '✗ キャッシュが設定されていません',
          recommendation: cacheNames.length > 0 ? undefined : 'キャッシュ戦略を実装してください'
        });
      } catch (error) {
        requirements.push({
          id: 'offline-error',
          name: 'オフライン機能',
          description: 'アプリがオフラインでも動作する',
          status: 'unknown',
          score: 0,
          details: '? キャッシュの確認中にエラーが発生しました',
          recommendation: 'キャッシュ機能を確認してください'
        });
      }
    } else {
      requirements.push({
        id: 'offline-unsupported',
        name: 'オフライン機能',
        description: 'アプリがオフラインでも動作する',
        status: 'non-compliant',
        score: 0,
        details: '✗ このブラウザはCache APIをサポートしていません',
        recommendation: 'モダンブラウザでアクセスしてください'
      });
    }

    return requirements;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getStatusIcon = (status: PWARequirement['status']) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'non-compliant':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'unknown':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  useEffect(() => {
    // コンポーネントマウント時に監査を実行
    runLighthouseAudit();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">PWA Lighthouse 監査</h1>
        <p className="text-gray-600 mb-6">
          Google Lighthouseスタイルの包括的なPWA監査を実行し、改善点を特定します。
        </p>
        
        <Button
          onClick={runLighthouseAudit}
          disabled={isRunning}
          className="flex items-center gap-2 mx-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? '監査実行中...' : '監査を再実行'}
        </Button>
      </div>

      {/* タブナビゲーション */}
      <div className="flex justify-center">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { key: 'overview', label: '概要', icon: <Monitor className="h-4 w-4" /> },
            { key: 'requirements', label: 'PWA要件', icon: <CheckCircle className="h-4 w-4" /> },
            { key: 'suggestions', label: '改善提案', icon: <Settings className="h-4 w-4" /> }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                selectedTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 概要タブ */}
      {selectedTab === 'overview' && auditResults && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(auditResults).map(([key, metric]) => (
            <Card key={key} className={`p-6 text-center ${getScoreBackground(metric.score)}`}>
              <div className={`text-3xl font-bold ${getScoreColor(metric.score)} mb-2`}>
                {metric.score}
              </div>
              <div className="text-sm font-medium text-gray-700 mb-1 capitalize">
                {key === 'bestPractices' ? 'Best Practices' : 
                 key === 'seo' ? 'SEO' : 
                 key === 'pwa' ? 'PWA' : key}
              </div>
              <div className="text-xs text-gray-600">{metric.displayValue}</div>
            </Card>
          ))}
        </div>
      )}

      {/* PWA要件タブ */}
      {selectedTab === 'requirements' && (
        <div className="space-y-4">
          {pwaRequirements.map((requirement) => (
            <Card key={requirement.id} className="p-6">
              <div className="flex items-start gap-4">
                {getStatusIcon(requirement.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{requirement.name}</h3>
                    {requirement.score !== undefined && (
                      <span className={`text-sm font-medium ${getScoreColor(requirement.score)}`}>
                        {requirement.score}/100
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{requirement.description}</p>
                  <p className="text-sm text-gray-700 mb-2">{requirement.details}</p>
                  {requirement.recommendation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
                        <strong>推奨事項:</strong> {requirement.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 改善提案タブ */}
      {selectedTab === 'suggestions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Download className="h-5 w-5" />
              インストール最適化
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>カスタムインストールプロンプトを実装</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>アプリアイコンを複数サイズで提供</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>スプラッシュスクリーン画像を追加</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              オフライン機能強化
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>重要なページのプリキャッシュ</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>オフライン状態の通知機能</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>データ同期機能の実装</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              パフォーマンス向上
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>リソースの圧縮とminify</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>重要でないリソースの遅延読み込み</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>CDNの活用</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              ユーザー体験向上
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>プッシュ通知機能の実装</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>バックグラウンド同期</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>アプリ更新通知</span>
              </li>
            </ul>
          </Card>
        </div>
      )}

      {isRunning && (
        <Card className="p-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Lighthouse監査を実行中...</p>
            <p className="text-sm text-gray-500 mt-2">
              パフォーマンス、アクセシビリティ、PWA要件などを総合的に分析しています
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PWALighthouseAudit;

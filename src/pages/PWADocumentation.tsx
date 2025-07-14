import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  ExternalLink, 
  Book, 
  Settings, 
  CheckCircle, 
  Download,
  Code,
  Smartphone,
  Zap
} from 'lucide-react';

const PWADocumentation: React.FC = () => {
  const features = [
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: 'ホーム画面への追加',
      description: 'ネイティブアプリのようにホーム画面からアクセス可能',
      status: 'completed'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'オフライン機能',
      description: 'インターネット接続がなくても基本機能を利用可能',
      status: 'completed'
    },
    {
      icon: <Download className="w-8 h-8" />,
      title: '自動更新',
      description: '新しいバージョンを自動で検出・更新',
      status: 'completed'
    }
  ];

  const quickCommands = [
    {
      title: 'PWAビルド実行',
      command: 'npm run build:pwa',
      description: 'PWA最適化付きでプロダクションビルドを実行'
    },
    {
      title: 'キャッシュクリア',
      command: 'npm run pwa:clear-cache',
      description: 'Service Workerキャッシュクリア用スクリプトを生成'
    },
    {
      title: 'PWAデバッグ',
      command: 'npm run pwa:debug',
      description: 'PWAデバッグ情報取得スクリプトを生成'
    },
    {
      title: 'チェックリスト',
      command: 'npm run pwa:checklist',
      description: 'PWA実装チェックリストを生成'
    }
  ];

  const resources = [
    {
      title: 'PWA実装ガイド（完全版）',
      url: '/pwa-implementation-guide',
      description: 'コード例付きの詳細な実装ガイド',
      internal: true
    },
    {
      title: 'PWA設定ガイド',
      url: '/pwa-setup-guide',
      description: '既存のPWA機能管理ガイド',
      internal: true
    },
    {
      title: 'Google PWAドキュメント',
      url: 'https://web.dev/progressive-web-apps/',
      description: 'PWAの公式ガイドライン',
      internal: false
    },
    {
      title: 'MDN PWAガイド',
      url: 'https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps',
      description: 'Mozilla開発者向けPWAドキュメント',
      internal: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Helmet>
        <title>PWAドキュメント - ドッグパークJP</title>
        <meta name="description" content="ドッグパークJPのPWA（プログレッシブ・ウェブ・アプリ）機能の総合ドキュメント" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            PWA ドキュメント
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            ドッグパークJPのプログレッシブ・ウェブ・アプリ（PWA）機能の総合ガイド
          </p>
        </motion.div>

        {/* PWA状態 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8"
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">PWA機能の状態</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start space-x-4 p-4 rounded-lg bg-gray-50"
              >
                <div className="flex-shrink-0 text-blue-500">
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">{feature.title}</h3>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-gray-600 mt-1">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* クイックコマンド */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8"
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <Code className="w-6 h-6 mr-2" />
            クイックコマンド
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {quickCommands.map((cmd, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">{cmd.title}</h3>
                <code className="block bg-gray-900 text-gray-100 p-2 rounded text-sm mb-2">
                  {cmd.command}
                </code>
                <p className="text-gray-600 text-sm">{cmd.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ファイル構造 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8"
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <Settings className="w-6 h-6 mr-2" />
            PWA ファイル構造
          </h2>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-gray-100 text-sm">
{`project3/
├── public/
│   ├── manifest.json          # PWAマニフェスト（完成）
│   ├── sw.js                  # Service Worker（完成）
│   ├── offline.html           # オフラインページ（完成）
│   └── icons/                 # PWAアイコン（完成）
│       ├── icon-192x192.png
│       └── icon-512x512.png
├── src/
│   ├── components/
│   │   └── PWAManager.tsx     # PWA管理コンポーネント（新規）
│   ├── pages/
│   │   ├── PWASetupGuide.tsx            # PWA設定ガイド（既存）
│   │   └── PWAImplementationGuide.tsx   # PWA実装ガイド（新規）
│   ├── utils/
│   │   └── pwa.ts             # PWAユーティリティ（既存）
│   └── main.tsx               # Service Worker登録（完成）
├── scripts/
│   ├── build-pwa.js           # PWAビルドスクリプト（新規）
│   └── pwa-dev-helper.js      # PWA開発ヘルパー（新規）
├── vite.config.ts             # PWA最適化設定（更新済み）
└── package.json               # PWAスクリプト追加（更新済み）`}
            </pre>
          </div>
        </motion.div>

        {/* リソース */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8"
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <Book className="w-6 h-6 mr-2" />
            関連リソース
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {resources.map((resource, index) => (
              <a
                key={index}
                href={resource.url}
                target={resource.internal ? '_self' : '_blank'}
                rel={resource.internal ? undefined : 'noopener noreferrer'}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{resource.title}</h3>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-gray-600 mt-1">{resource.description}</p>
              </a>
            ))}
          </div>
        </motion.div>

        {/* 開発フロー */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-6"
        >
          <h2 className="text-xl font-semibold text-blue-900 mb-4">PWA開発フロー</h2>
          <div className="space-y-3 text-blue-800">
            <div className="flex items-center space-x-2">
              <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-sm font-medium">1</span>
              <span>開発: <code>npm run dev</code> でローカル開発</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-sm font-medium">2</span>
              <span>テスト: Chrome DevTools でPWA機能をテスト</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-sm font-medium">3</span>
              <span>ビルド: <code>npm run build:pwa</code> でPWA最適化ビルド</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-sm font-medium">4</span>
              <span>デプロイ: Netlify/Vercel等のHTTPS環境にデプロイ</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-sm font-medium">5</span>
              <span>監査: Lighthouse PWAスコアで品質確認</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PWADocumentation;

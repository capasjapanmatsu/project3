#!/usr/bin/env node

/**
 * PWA開発ヘルパースクリプト
 * 開発中のPWA機能テストと管理を支援
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ログ出力ユーティリティ
const log = {
  info: (msg) => console.log(`ℹ️ ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`)
};

// Service Worker キャッシュのクリア
function clearServiceWorkerCache() {
  log.info('Service Worker キャッシュクリア用のスクリプトを生成中...');
  
  const clearCacheScript = `
// Service Worker キャッシュクリア用のスクリプト
// Chrome DevTools Console で実行してください

async function clearAllCaches() {
  try {
    // すべてのキャッシュ名を取得
    const cacheNames = await caches.keys();
    console.log('発見されたキャッシュ:', cacheNames);
    
    // すべてのキャッシュを削除
    const deletePromises = cacheNames.map(cacheName => {
      console.log('キャッシュを削除中:', cacheName);
      return caches.delete(cacheName);
    });
    
    await Promise.all(deletePromises);
    console.log('✅ すべてのキャッシュが削除されました');
    
    // Service Worker の登録解除
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of registrations) {
      console.log('Service Worker を登録解除中:', registration.scope);
      await registration.unregister();
    }
    
    console.log('✅ Service Worker の登録が解除されました');
    console.log('ページをリロードしてください');
    
  } catch (error) {
    console.error('❌ キャッシュクリアでエラー:', error);
  }
}

// 実行
clearAllCaches();
`;

  fs.writeFileSync('clear-pwa-cache.js', clearCacheScript);
  log.success('clear-pwa-cache.js を作成しました');
  log.info('使用方法: Chrome DevTools Console でこのファイルの内容をコピー&ペーストして実行');
}

// PWA アイコン生成
function generatePWAIcons() {
  log.info('PWAアイコン生成ガイドを表示中...');
  
  const iconGuide = `
🖼️  PWA アイコン生成ガイド

必要なアイコンサイズ:
- 192x192px (最小要件)
- 512x512px (最小要件)
- 180x180px (Apple Touch Icon)
- 144x144px (Windows タイル)
- 96x96px (Android Chrome)
- 72x72px (Android Chrome)
- 48x48px (Android Chrome)

推奨ツール:
1. PWA Asset Generator
   https://github.com/pwa-builder/PWABuilder

2. Favicon Generator
   https://favicon.io/

3. ImageMagick (コマンドライン)
   convert source.png -resize 192x192 icon-192x192.png
   convert source.png -resize 512x512 icon-512x512.png

配置場所:
- public/icons/ ディレクトリ
- manifest.json での参照を忘れずに更新

デザインガイドライン:
- シンプルで認識しやすいデザイン
- 背景は透明または単色
- 十分なコントラスト
- ブランドカラーの活用
`;

  console.log(iconGuide);
  
  // アイコンディレクトリの作成
  const iconsDir = path.join('public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
    log.success(`${iconsDir} ディレクトリを作成しました`);
  }
}

// PWA テスト用のローカルHTTPSサーバー起動
function startHTTPSServer() {
  log.info('PWAテスト用のHTTPSサーバー設定ガイドを表示中...');
  
  const httpsGuide = `
🔒 PWA HTTPS テスト環境のセットアップ

方法1: mkcert を使用（推奨）
1. mkcert のインストール:
   - Windows: choco install mkcert
   - macOS: brew install mkcert
   - Linux: sudo apt install mkcert

2. ローカルCA の作成:
   mkcert -install

3. 証明書の生成:
   mkcert localhost 127.0.0.1 ::1

4. Vite の HTTPS 設定:
   // vite.config.ts
   export default defineConfig({
     server: {
       https: {
         key: fs.readFileSync('./localhost-key.pem'),
         cert: fs.readFileSync('./localhost.pem')
       }
     }
   });

方法2: Netlify Dev を使用
1. Netlify CLI のインストール:
   npm install -g netlify-cli

2. プロジェクトの初期化:
   netlify init

3. 開発サーバーの起動:
   netlify dev

方法3: ngrok を使用
1. ngrok のインストール:
   https://ngrok.com/

2. 開発サーバーの起動:
   npm run dev

3. 別ターミナルで ngrok 実行:
   ngrok http 3000

注意: PWA の多くの機能は HTTPS 環境でのみ動作します
`;

  console.log(httpsGuide);
}

// PWA デバッグ情報の表示
function showPWADebugInfo() {
  log.info('PWAデバッグ情報を表示中...');
  
  const debugScript = `
// PWA デバッグ情報取得スクリプト
// Chrome DevTools Console で実行してください

async function getPWADebugInfo() {
  console.log('🔍 PWA デバッグ情報');
  console.log('==================');
  
  // Service Worker 情報
  console.log('\\n📊 Service Worker 情報:');
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('登録済み Service Worker 数:', registrations.length);
    
    registrations.forEach((reg, index) => {
      console.log(\`Service Worker \${index + 1}:\`);
      console.log('  スコープ:', reg.scope);
      console.log('  状態:', reg.active?.state || 'なし');
      console.log('  スクリプトURL:', reg.active?.scriptURL || 'なし');
    });
  } else {
    console.log('❌ Service Worker はサポートされていません');
  }
  
  // キャッシュ情報
  console.log('\\n💾 キャッシュ情報:');
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    console.log('キャッシュ数:', cacheNames.length);
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      console.log(\`キャッシュ "\${cacheName}": \${keys.length} アイテム\`);
    }
  } else {
    console.log('❌ Cache API はサポートされていません');
  }
  
  // PWA インストール状態
  console.log('\\n📱 PWA インストール状態:');
  console.log('スタンドアローンモード:', window.matchMedia('(display-mode: standalone)').matches);
  console.log('iOS スタンドアローン:', (window.navigator as any).standalone === true);
  
  // ネットワーク状態
  console.log('\\n🌐 ネットワーク情報:');
  console.log('オンライン状態:', navigator.onLine);
  console.log('接続タイプ:', (navigator as any).connection?.effectiveType || '不明');
  
  // 通知権限
  console.log('\\n🔔 通知権限:');
  if ('Notification' in window) {
    console.log('通知権限:', Notification.permission);
  } else {
    console.log('❌ 通知 API はサポートされていません');
  }
  
  // Manifest 情報
  console.log('\\n📋 Manifest 情報:');
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    console.log('Manifest URL:', manifestLink.href);
    try {
      const response = await fetch(manifestLink.href);
      const manifest = await response.json();
      console.log('アプリ名:', manifest.name);
      console.log('短縮名:', manifest.short_name);
      console.log('開始URL:', manifest.start_url);
      console.log('表示モード:', manifest.display);
      console.log('アイコン数:', manifest.icons?.length || 0);
    } catch (error) {
      console.log('❌ Manifest の読み込みに失敗:', error);
    }
  } else {
    console.log('❌ Manifest リンクが見つかりません');
  }
}

// 実行
getPWADebugInfo();
`;

  fs.writeFileSync('pwa-debug.js', debugScript);
  log.success('pwa-debug.js を作成しました');
  log.info('使用方法: Chrome DevTools Console でこのファイルの内容をコピー&ペーストして実行');
}

// PWA チェックリスト生成
function generatePWAChecklist() {
  log.info('PWA チェックリストを生成中...');
  
  const checklist = `
# PWA 実装チェックリスト

## 📋 基本要件
- [ ] manifest.json の配置と設定
- [ ] Service Worker の実装
- [ ] HTTPS での配信
- [ ] レスポンシブデザイン
- [ ] オフライン機能

## 🔧 manifest.json
- [ ] name フィールドの設定
- [ ] short_name フィールドの設定
- [ ] start_url フィールドの設定
- [ ] display: "standalone" の設定
- [ ] theme_color の設定
- [ ] background_color の設定
- [ ] 192x192px アイコンの配置
- [ ] 512x512px アイコンの配置
- [ ] アイコンの purpose: "maskable any" 設定

## ⚙️ Service Worker
- [ ] install イベントリスナーの実装
- [ ] activate イベントリスナーの実装
- [ ] fetch イベントリスナーの実装
- [ ] キャッシュ戦略の実装
- [ ] オフライン フォールバックの実装
- [ ] キャッシュバージョニング

## 🌐 HTML設定
- [ ] <link rel="manifest"> の追加
- [ ] <meta name="theme-color"> の追加
- [ ] Apple Touch Icon の設定
- [ ] viewport meta タグの設定

## 🔍 テスト項目
- [ ] Chrome DevTools Application タブでの確認
- [ ] Lighthouse PWA監査 (90点以上)
- [ ] オフライン動作テスト
- [ ] インストール可能性テスト
- [ ] 複数デバイスでのテスト

## 🚀 最適化項目
- [ ] プリロード戦略の実装
- [ ] 重要リソースの事前キャッシュ
- [ ] 動的コンテンツのキャッシュ戦略
- [ ] 更新通知の実装
- [ ] プッシュ通知の実装（オプション）

## 📱 プラットフォーム対応
- [ ] Android Chrome でのテスト
- [ ] iOS Safari でのテスト
- [ ] Windows Edge でのテスト
- [ ] ホーム画面追加の動作確認

## 🎯 パフォーマンス
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Time to Interactive < 3.5s

## 🔐 セキュリティ
- [ ] HTTPS での配信
- [ ] CSP ヘッダーの設定
- [ ] セキュアなヘッダーの設定
- [ ] 外部リソースの検証

## 📊 分析・監視
- [ ] PWA使用状況の計測
- [ ] インストール率の監視
- [ ] オフライン使用状況の分析
- [ ] エラー監視の設定

使用方法: 各項目を確認しながら ✅ チェックを付けてください
`;

  fs.writeFileSync('PWA-CHECKLIST.md', checklist);
  log.success('PWA-CHECKLIST.md を作成しました');
}

// メイン機能の実行
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'clear-cache':
      clearServiceWorkerCache();
      break;
    case 'generate-icons':
      generatePWAIcons();
      break;
    case 'https-setup':
      startHTTPSServer();
      break;
    case 'debug':
      showPWADebugInfo();
      break;
    case 'checklist':
      generatePWAChecklist();
      break;
    case 'all':
      log.info('すべてのPWA開発ヘルパーを実行中...');
      clearServiceWorkerCache();
      generatePWAIcons();
      showPWADebugInfo();
      generatePWAChecklist();
      break;
    default:
      console.log(`
🛠️  PWA 開発ヘルパー

使用可能なコマンド:
  clear-cache    - Service Worker キャッシュクリア用スクリプト生成
  generate-icons - PWA アイコン生成ガイド表示
  https-setup    - HTTPS テスト環境セットアップガイド
  debug         - PWA デバッグ情報取得スクリプト生成
  checklist     - PWA 実装チェックリスト生成
  all           - すべてのヘルパーを実行

使用例:
  node scripts/pwa-dev-helper.js clear-cache
  node scripts/pwa-dev-helper.js all
`);
      break;
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  clearServiceWorkerCache,
  generatePWAIcons,
  startHTTPSServer,
  showPWADebugInfo,
  generatePWAChecklist
};

#!/usr/bin/env node

/**
 * PWA ビルド最適化スクリプト
 * ドッグパークJP PWA対応のための追加最適化を実行
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定
const config = {
  distDir: 'dist',
  manifestPath: 'public/manifest.json',
  swPath: 'public/sw.js',
  iconsDir: 'public/icons',
  offlinePagePath: 'public/offline.html'
};

// ログ出力ユーティリティ
const log = {
  info: (msg) => console.log(`ℹ️ ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`)
};

// PWA必須ファイルの存在確認
function checkPWAFiles() {
  log.info('PWA必須ファイルの確認中...');
  
  const requiredFiles = [
    config.manifestPath,
    config.swPath,
    config.offlinePagePath,
    path.join(config.iconsDir, 'icon-192x192.png'),
    path.join(config.iconsDir, 'icon-512x512.png')
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    log.error('以下のPWA必須ファイルが見つかりません:');
    missingFiles.forEach(file => log.error(`  ${file}`));
    return false;
  }
  
  log.success('すべてのPWA必須ファイルが確認できました');
  return true;
}

// manifest.json の検証
function validateManifest() {
  log.info('manifest.json の検証中...');
  
  try {
    const manifestContent = fs.readFileSync(config.manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      log.error('manifest.json に以下の必須フィールドがありません:');
      missingFields.forEach(field => log.error(`  ${field}`));
      return false;
    }
    
    // アイコンの検証
    if (!manifest.icons || manifest.icons.length === 0) {
      log.error('manifest.json にアイコンが定義されていません');
      return false;
    }
    
    const hasRequiredIcons = manifest.icons.some(icon => 
      icon.sizes === '192x192' || icon.sizes === '512x512'
    );
    
    if (!hasRequiredIcons) {
      log.warn('推奨サイズ（192x192、512x512）のアイコンが見つかりません');
    }
    
    log.success('manifest.json の検証が完了しました');
    return true;
    
  } catch (error) {
    log.error(`manifest.json の検証でエラー: ${error.message}`);
    return false;
  }
}

// Service Worker の検証
function validateServiceWorker() {
  log.info('Service Worker の検証中...');
  
  try {
    const swContent = fs.readFileSync(config.swPath, 'utf8');
    
    const requiredEvents = ['install', 'activate', 'fetch'];
    const missingEvents = requiredEvents.filter(event => 
      !swContent.includes(`addEventListener('${event}'`)
    );
    
    if (missingEvents.length > 0) {
      log.error('Service Worker に以下の必須イベントリスナーがありません:');
      missingEvents.forEach(event => log.error(`  ${event}`));
      return false;
    }
    
    // キャッシュ戦略の確認
    if (!swContent.includes('caches.open') || !swContent.includes('cache.addAll')) {
      log.warn('基本的なキャッシュ戦略が実装されていない可能性があります');
    }
    
    log.success('Service Worker の検証が完了しました');
    return true;
    
  } catch (error) {
    log.error(`Service Worker の検証でエラー: ${error.message}`);
    return false;
  }
}

// ビルド後のファイル最適化
function optimizeBuildFiles() {
  log.info('ビルドファイルの最適化中...');
  
  if (!fs.existsSync(config.distDir)) {
    log.error('distディレクトリが見つかりません。先にビルドを実行してください。');
    return false;
  }
  
  try {
    // PWA必須ファイルをdistディレクトリにコピー
    const filesToCopy = [
      { src: config.manifestPath, dest: path.join(config.distDir, 'manifest.json') },
      { src: config.swPath, dest: path.join(config.distDir, 'sw.js') },
      { src: config.offlinePagePath, dest: path.join(config.distDir, 'offline.html') }
    ];
    
    filesToCopy.forEach(({ src, dest }) => {
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        log.success(`${src} を ${dest} にコピーしました`);
      }
    });
    
    // アイコンディレクトリのコピー
    if (fs.existsSync(config.iconsDir)) {
      const distIconsDir = path.join(config.distDir, 'icons');
      if (!fs.existsSync(distIconsDir)) {
        fs.mkdirSync(distIconsDir, { recursive: true });
      }
      
      const iconFiles = fs.readdirSync(config.iconsDir);
      iconFiles.forEach(file => {
        const srcPath = path.join(config.iconsDir, file);
        const destPath = path.join(distIconsDir, file);
        fs.copyFileSync(srcPath, destPath);
      });
      
      log.success(`アイコンファイルを ${distIconsDir} にコピーしました`);
    }
    
    // Service Worker のキャッシュバージョンを更新
    updateServiceWorkerVersion();
    
    log.success('ビルドファイルの最適化が完了しました');
    return true;
    
  } catch (error) {
    log.error(`ビルドファイル最適化でエラー: ${error.message}`);
    return false;
  }
}

// Service Worker のバージョン更新
function updateServiceWorkerVersion() {
  const swDistPath = path.join(config.distDir, 'sw.js');
  
  if (!fs.existsSync(swDistPath)) return;
  
  try {
    let swContent = fs.readFileSync(swDistPath, 'utf8');
    
    // タイムスタンプベースのバージョン生成
    const version = new Date().toISOString().replace(/[:.]/g, '-');
    
    // キャッシュ名を更新
    swContent = swContent.replace(
      /const CACHE_NAME = ['"][^'"]+['"]/,
      `const CACHE_NAME = 'dogpark-jp-v${version}'`
    );
    
    fs.writeFileSync(swDistPath, swContent);
    log.success(`Service Worker のバージョンを v${version} に更新しました`);
    
  } catch (error) {
    log.warn(`Service Worker バージョン更新でエラー: ${error.message}`);
  }
}

// PWA Lighthouse監査の実行
function runLighthouseAudit() {
  log.info('Lighthouse PWA監査を実行中...');
  
  try {
    // Lighthouseがインストールされているかチェック
    execSync('lighthouse --version', { stdio: 'ignore' });
    
    // PWA監査の実行
    const command = 'lighthouse http://localhost:3000 --only-categories=pwa --output=json --output-path=lighthouse-pwa-report.json --chrome-flags="--headless"';
    
    log.info('注意: この監査にはローカルサーバーの起動が必要です');
    log.info('実行コマンド: npm run preview');
    
    execSync(command, { stdio: 'inherit' });
    log.success('Lighthouse PWA監査が完了しました。lighthouse-pwa-report.json を確認してください。');
    
  } catch (error) {
    log.warn('Lighthouse PWA監査をスキップしました（Lighthouseがインストールされていない可能性があります）');
    log.info('手動でのインストール: npm install -g lighthouse');
  }
}

// PWAビルドの実行
function buildPWA() {
  log.info('PWAビルドを開始します...');
  
  try {
    // 1. PWAファイルの検証
    if (!checkPWAFiles()) {
      process.exit(1);
    }
    
    if (!validateManifest()) {
      process.exit(1);
    }
    
    if (!validateServiceWorker()) {
      process.exit(1);
    }
    
    // 2. 通常のビルド実行
    log.info('通常のビルドを実行中...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // 3. PWA最適化
    if (!optimizeBuildFiles()) {
      process.exit(1);
    }
    
    // 4. 品質チェック
    log.info('PWAビルドが完了しました！');
    log.info('');
    log.info('📋 次のステップ:');
    log.info('1. npm run preview でローカルサーバーを起動');
    log.info('2. Chrome DevTools の Application タブで PWA の動作を確認');
    log.info('3. Lighthouse でPWAスコアを測定');
    log.info('4. HTTPS環境でのデプロイとテスト');
    log.info('');
    log.success('🎉 PWAビルドが正常に完了しました！');
    
  } catch (error) {
    log.error(`PWAビルドでエラーが発生しました: ${error.message}`);
    process.exit(1);
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  buildPWA();
}

export {
  buildPWA,
  checkPWAFiles,
  validateManifest,
  validateServiceWorker,
  optimizeBuildFiles
};

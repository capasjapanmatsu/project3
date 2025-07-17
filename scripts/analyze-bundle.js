#!/usr/bin/env node

/**
 * バンドル分析スクリプト
 * 使用方法: npm run analyze:build
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 バンドル分析を開始します...\n');

// 1. ビルド実行（分析モード）
console.log('📦 プロダクションビルドを実行中...');
try {
  execSync('ANALYZE=true npm run build', { 
    stdio: 'inherit',
    env: { ...process.env, ANALYZE: 'true' }
  });
} catch (error) {
  console.error('❌ ビルドに失敗しました:', error.message);
  process.exit(1);
}

// 2. バンドルサイズ情報を収集
console.log('\n📊 バンドルサイズを分析中...');

const distPath = path.join(process.cwd(), 'dist');
const assetsPath = path.join(distPath, 'assets');

if (!fs.existsSync(distPath)) {
  console.error('❌ distディレクトリが見つかりません');
  process.exit(1);
}

// ファイルサイズを取得する関数
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

// ファイルサイズを人間が読みやすい形式に変換
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// アセットファイルを分析
const assetFiles = fs.readdirSync(assetsPath);
const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
const cssFiles = assetFiles.filter(file => file.endsWith('.css'));
const imageFiles = assetFiles.filter(file => /\.(png|jpg|jpeg|gif|svg|webp)$/.test(file));

console.log('\n📈 バンドルサイズレポート:');
console.log('=' .repeat(50));

// JavaScript ファイル
console.log('\n🟨 JavaScript ファイル:');
let totalJsSize = 0;
jsFiles.forEach(file => {
  const filePath = path.join(assetsPath, file);
  const size = getFileSize(filePath);
  totalJsSize += size;
  
  // ファイルタイプを判定
  let type = '📄';
  if (file.includes('vendor')) type = '📦';
  if (file.includes('admin')) type = '🔐';
  if (file.includes('index')) type = '🚀';
  
  console.log(`  ${type} ${file}: ${formatBytes(size)}`);
});

// CSS ファイル
console.log('\n🟦 CSS ファイル:');
let totalCssSize = 0;
cssFiles.forEach(file => {
  const filePath = path.join(assetsPath, file);
  const size = getFileSize(filePath);
  totalCssSize += size;
  console.log(`  🎨 ${file}: ${formatBytes(size)}`);
});

// 画像ファイル
if (imageFiles.length > 0) {
  console.log('\n🟩 画像ファイル:');
  let totalImageSize = 0;
  imageFiles.forEach(file => {
    const filePath = path.join(assetsPath, file);
    const size = getFileSize(filePath);
    totalImageSize += size;
    console.log(`  🖼️  ${file}: ${formatBytes(size)}`);
  });
}

// サマリー
console.log('\n📊 サマリー:');
console.log('=' .repeat(30));
console.log(`JavaScript合計: ${formatBytes(totalJsSize)}`);
console.log(`CSS合計: ${formatBytes(totalCssSize)}`);

// 推奨事項
console.log('\n💡 最適化の推奨事項:');
console.log('=' .repeat(30));

if (totalJsSize > 300 * 1024) { // 300KB
  console.log('⚠️  JavaScriptサイズが300KBを超えています');
  console.log('   - 不要なライブラリを削除してください');
  console.log('   - コード分割を検討してください');
}

if (totalCssSize > 100 * 1024) { // 100KB
  console.log('⚠️  CSSサイズが100KBを超えています');
  console.log('   - 未使用のCSSを削除してください');
  console.log('   - CSS-in-JSを検討してください');
}

// 最大のファイルを特定
const allFiles = [...jsFiles, ...cssFiles].map(file => ({
  name: file,
  size: getFileSize(path.join(assetsPath, file)),
  type: file.endsWith('.js') ? 'JS' : 'CSS'
}));

allFiles.sort((a, b) => b.size - a.size);
const largestFile = allFiles[0];

if (largestFile && largestFile.size > 200 * 1024) { // 200KB
  console.log(`⚠️  最大ファイル: ${largestFile.name} (${formatBytes(largestFile.size)})`);
  console.log('   - このファイルの分割を検討してください');
}

console.log('\n✅ 分析完了');
console.log('📊 詳細な分析結果は dist/stats.html で確認できます');

// 分析結果をJSONで保存
const analysisResult = {
  timestamp: new Date().toISOString(),
  totalJsSize,
  totalCssSize,
  jsFiles: jsFiles.map(file => ({
    name: file,
    size: getFileSize(path.join(assetsPath, file))
  })),
  cssFiles: cssFiles.map(file => ({
    name: file,
    size: getFileSize(path.join(assetsPath, file))
  }))
};

fs.writeFileSync(
  path.join(distPath, 'bundle-analysis.json'), 
  JSON.stringify(analysisResult, null, 2)
);

console.log('💾 分析結果をbundle-analysis.jsonに保存しました');

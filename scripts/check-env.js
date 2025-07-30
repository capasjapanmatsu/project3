#!/usr/bin/env node

// 環境変数チェックスクリプト
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

console.log('🔍 環境変数をチェック中...');

let missingVars = [];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingVars.push(varName);
    console.error(`❌ ${varName} が設定されていません`);
  } else {
    // 秘密情報を隠して表示
    const maskedValue = value.length > 10 ? 
      value.substring(0, 10) + '***' : 
      '***';
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

if (missingVars.length > 0) {
  console.error('\n❌ 必要な環境変数が設定されていません:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nNetlifyの環境変数設定を確認してください。');
  process.exit(1);
}

console.log('\n✅ 全ての環境変数が設定されています'); 
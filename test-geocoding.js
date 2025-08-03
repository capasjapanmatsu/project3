// Google Maps APIキーとGeocoding APIの動作確認スクリプト
require('dotenv').config();

const testAddresses = [
  '熊本県熊本市北区龍田2丁目14－12',
  '〒861-8006 熊本県熊本市北区龍田2丁目14－12',
  '熊本市北区龍田2丁目14-12',
  '東京都渋谷区1-1-1' // 比較用
];

async function testGeocoding() {
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
  
  console.log('🔍 Google Maps APIキー動作確認テスト開始\n');
  console.log(`APIキー: ${apiKey ? `${apiKey.substring(0, 10)}...` : '❌ 未設定'}`);
  
  if (!apiKey) {
    console.error('❌ VITE_GOOGLE_MAPS_API_KEY が設定されていません');
    console.log('\n.envファイルに以下を追加してください:');
    console.log('VITE_GOOGLE_MAPS_API_KEY=あなたのAPIキー');
    return;
  }

  console.log('\n📍 テスト住所での検索開始...\n');

  for (const address of testAddresses) {
    console.log(`🔍 テスト中: "${address}"`);
    
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=jp&language=ja&components=country:JP`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log(`📡 HTTPステータス: ${response.status}`);
      console.log(`📋 APIステータス: ${data.status}`);
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        console.log(`✅ 成功: ${location.lat}, ${location.lng}`);
        console.log(`📍 正規化住所: ${result.formatted_address}`);
      } else {
        console.log(`❌ 失敗: ${data.status}`);
        if (data.error_message) {
          console.log(`💬 エラーメッセージ: ${data.error_message}`);
        }
        
        // 詳細なエラー情報
        switch (data.status) {
          case 'REQUEST_DENIED':
            console.log('🚫 リクエストが拒否されました。APIキーの権限を確認してください。');
            console.log('   - Geocoding APIが有効になっているか確認');
            console.log('   - APIキーの制限設定を確認');
            break;
          case 'OVER_QUERY_LIMIT':
            console.log('📊 クエリ制限に達しました。');
            break;
          case 'ZERO_RESULTS':
            console.log('🔍 該当する住所が見つかりませんでした。');
            break;
        }
      }
      
    } catch (error) {
      console.log(`💥 ネットワークエラー: ${error.message}`);
    }
    
    console.log(''); // 空行
  }

  console.log('🔧 問題解決のチェックリスト:');
  console.log('1. Google Cloud ConsoleでGeocoding APIが有効になっているか');
  console.log('2. APIキーに適切な権限があるか');
  console.log('3. APIキーに地理的制限やIP制限がかかっていないか');
  console.log('4. 請求アカウントが設定されているか（無料枠内でも必要）');
}

// Node.jsで実行する場合のfetch polyfill
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testGeocoding().catch(console.error); 
/**
 * 既存のpet_facilities住所データをジオコーディングして
 * 正確な緯度・経度を設定するスクリプト
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const googleMapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !supabaseKey || !googleMapsApiKey) {
  console.error('❌ 環境変数が設定されていません');
  console.error('必要な環境変数: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GOOGLE_MAPS_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Google Maps Geocoding APIを使用して住所から座標を取得
 */
async function geocodeAddress(address) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleMapsApiKey}&region=jp&language=ja`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: data.results[0].formatted_address
      };
    } else {
      console.error(`❌ ジオコーディング失敗: ${address} - Status: ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ ジオコーディングエラー: ${address}`, error);
    return null;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 施設データのジオコーディングを開始します...');

  try {
    // 座標が設定されていない施設を取得
    const { data: facilities, error } = await supabase
      .from('pet_facilities')
      .select('id, name, address, latitude, longitude')
      .or('latitude.is.null,longitude.is.null');

    if (error) {
      throw error;
    }

    console.log(`📍 処理対象施設: ${facilities.length}件`);

    let successCount = 0;
    let errorCount = 0;

    for (const facility of facilities) {
      console.log(`\n処理中: ${facility.name} (${facility.address})`);
      
      // ジオコーディング実行
      const coordinates = await geocodeAddress(facility.address);
      
      if (coordinates) {
        // 座標をデータベースに更新
        const { error: updateError } = await supabase
          .from('pet_facilities')
          .update({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          })
          .eq('id', facility.id);

        if (updateError) {
          console.error(`❌ 更新エラー: ${facility.name}`, updateError);
          errorCount++;
        } else {
          console.log(`✅ 更新成功: ${facility.name}`);
          console.log(`   座標: ${coordinates.latitude}, ${coordinates.longitude}`);
          console.log(`   正規化住所: ${coordinates.formatted_address}`);
          successCount++;
        }
      } else {
        console.error(`❌ ジオコーディング失敗: ${facility.name}`);
        errorCount++;
      }

      // API制限を避けるため少し待機
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n🎉 ジオコーディング処理完了！');
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`❌ 失敗: ${errorCount}件`);

  } catch (error) {
    console.error('❌ 処理エラー:', error);
  }
}

// 特定の住所のジオコーディングテスト用関数
async function testGeocode(testAddress = '熊本県熊本市北区龍田2丁目14－16') {
  console.log(`🧪 テスト用ジオコーディング: ${testAddress}`);
  const result = await geocodeAddress(testAddress);
  if (result) {
    console.log(`✅ 緯度: ${result.latitude}`);
    console.log(`✅ 経度: ${result.longitude}`);
    console.log(`✅ 正規化住所: ${result.formatted_address}`);
  }
}

// コマンドライン引数をチェック
const args = process.argv.slice(2);
if (args.includes('--test')) {
  testGeocode();
} else {
  main();
} 
 * 既存のpet_facilities住所データをジオコーディングして
 * 正確な緯度・経度を設定するスクリプト
 */


dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const googleMapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !supabaseKey || !googleMapsApiKey) {
  console.error('❌ 環境変数が設定されていません');
  console.error('必要な環境変数: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GOOGLE_MAPS_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Google Maps Geocoding APIを使用して住所から座標を取得
 */
async function geocodeAddress(address) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleMapsApiKey}&region=jp&language=ja`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: data.results[0].formatted_address
      };
    } else {
      console.error(`❌ ジオコーディング失敗: ${address} - Status: ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ ジオコーディングエラー: ${address}`, error);
    return null;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 施設データのジオコーディングを開始します...');

  try {
    // 座標が設定されていない施設を取得
    const { data: facilities, error } = await supabase
      .from('pet_facilities')
      .select('id, name, address, latitude, longitude')
      .or('latitude.is.null,longitude.is.null');

    if (error) {
      throw error;
    }

    console.log(`📍 処理対象施設: ${facilities.length}件`);

    let successCount = 0;
    let errorCount = 0;

    for (const facility of facilities) {
      console.log(`\n処理中: ${facility.name} (${facility.address})`);
      
      // ジオコーディング実行
      const coordinates = await geocodeAddress(facility.address);
      
      if (coordinates) {
        // 座標をデータベースに更新
        const { error: updateError } = await supabase
          .from('pet_facilities')
          .update({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          })
          .eq('id', facility.id);

        if (updateError) {
          console.error(`❌ 更新エラー: ${facility.name}`, updateError);
          errorCount++;
        } else {
          console.log(`✅ 更新成功: ${facility.name}`);
          console.log(`   座標: ${coordinates.latitude}, ${coordinates.longitude}`);
          console.log(`   正規化住所: ${coordinates.formatted_address}`);
          successCount++;
        }
      } else {
        console.error(`❌ ジオコーディング失敗: ${facility.name}`);
        errorCount++;
      }

      // API制限を避けるため少し待機
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n🎉 ジオコーディング処理完了！');
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`❌ 失敗: ${errorCount}件`);

  } catch (error) {
    console.error('❌ 処理エラー:', error);
  }
}

// 特定の住所のジオコーディングテスト用関数
async function testGeocode(testAddress = '熊本県熊本市北区龍田2丁目14－16') {
  console.log(`🧪 テスト用ジオコーディング: ${testAddress}`);
  const result = await geocodeAddress(testAddress);
  if (result) {
    console.log(`✅ 緯度: ${result.latitude}`);
    console.log(`✅ 経度: ${result.longitude}`);
    console.log(`✅ 正規化住所: ${result.formatted_address}`);
  }
}

// コマンドライン引数をチェック
const args = process.argv.slice(2);
if (args.includes('--test')) {
  testGeocode();
} else {
  main();
} 
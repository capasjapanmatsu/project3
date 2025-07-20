// データベース接続テスト用スクリプト
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'Set' : 'Not set');

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('\n=== データベース接続テスト ===');
  
  try {
    // 1. dog_parks テーブルの確認
    console.log('\n1. dog_parks テーブルの確認:');
    const { data: parks, error: parksError } = await supabase
      .from('dog_parks')
      .select('id, name, status')
      .limit(5);
    
    if (parksError) {
      console.error('dog_parks テーブルエラー:', parksError);
    } else {
      console.log('dog_parks レコード数:', parks?.length || 0);
      if (parks && parks.length > 0) {
        console.log('サンプルデータ:', parks[0]);
      }
    }

    // 2. pet_facilities テーブルの確認
    console.log('\n2. pet_facilities テーブルの確認:');
    const { data: facilities, error: facilitiesError } = await supabase
      .from('pet_facilities')
      .select('id, name, category_id, status')
      .limit(5);
    
    if (facilitiesError) {
      console.error('pet_facilities テーブルエラー:', facilitiesError);
    } else {
      console.log('pet_facilities レコード数:', facilities?.length || 0);
      if (facilities && facilities.length > 0) {
        console.log('サンプルデータ:', facilities[0]);
      }
    }

    // 3. profiles テーブルの確認
    console.log('\n3. profiles テーブルの確認:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .limit(3);
    
    if (profilesError) {
      console.error('profiles テーブルエラー:', profilesError);
    } else {
      console.log('profiles レコード数:', profiles?.length || 0);
    }

    // 4. 利用可能なテーブルの確認
    console.log('\n4. 利用可能なテーブルの確認:');
    
    // まず、dog_parks テーブルの構造を確認
    const { data: dogParksSchema, error: dogParksSchemaError } = await supabase
      .from('dog_parks')
      .select('*')
      .limit(1);
    
    if (!dogParksSchemaError && dogParksSchema && dogParksSchema.length > 0) {
      console.log('dog_parks テーブルのカラム:', Object.keys(dogParksSchema[0]));
    }

    // pet_facilities テーブルの構造を確認
    const { data: facilitiesSchema, error: facilitiesSchemaError } = await supabase
      .from('pet_facilities')
      .select('*')
      .limit(1);
    
    if (!facilitiesSchemaError && facilitiesSchema && facilitiesSchema.length > 0) {
      console.log('pet_facilities テーブルのカラム:', Object.keys(facilitiesSchema[0]));
    }

    // facility_categories テーブルがあるか確認
    const { data: categories, error: categoriesError } = await supabase
      .from('facility_categories')
      .select('*')
      .limit(5);
    
    if (categoriesError) {
      console.log('facility_categories テーブルは存在しないか、アクセスできません');
    } else {
      console.log('facility_categories レコード数:', categories?.length || 0);
      if (categories && categories.length > 0) {
        console.log('facility_categories サンプル:', categories[0]);
      }
    }

  } catch (error) {
    console.error('データベーステスト中にエラーが発生:', error);
  }
}

// テスト実行
testDatabase().then(() => {
  console.log('\n=== データベーステスト完了 ===');
}).catch(error => {
  console.error('テスト実行エラー:', error);
});

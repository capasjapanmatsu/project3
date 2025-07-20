// データベースカラム確認用テストスクリプト
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMicrochipColumn() {
  console.log('🔍 dogsテーブルのスキーマを確認中...');
  
  // まず、dogsテーブルの構造を確認
  const { data: tableInfo, error: schemaError } = await supabase
    .from('dogs')
    .select('*')
    .limit(1);
  
  if (schemaError) {
    console.error('❌ スキーマ確認エラー:', schemaError);
    return;
  }
  
  console.log('✅ dogsテーブルへのアクセス成功');
  
  if (tableInfo && tableInfo.length > 0) {
    const columns = Object.keys(tableInfo[0]);
    console.log('📋 利用可能なカラム:', columns);
    
    if (columns.includes('microchip_number')) {
      console.log('✅ microchip_numberカラムが存在します！');
    } else {
      console.log('❌ microchip_numberカラムが見つかりません');
      console.log('🔧 以下のSQLを手動でSupabaseダッシュボードで実行してください:');
      console.log('   ALTER TABLE dogs ADD COLUMN microchip_number TEXT;');
    }
  } else {
    console.log('📝 dogsテーブルにデータがありません');
  }
}

checkMicrochipColumn()
  .then(() => {
    console.log('🏁 チェック完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });

import { supabase } from './supabase';

// Supabaseの接続テスト
export const testSupabaseConnection = async () => {
  console.log('🔍 Supabaseの接続テストを開始...');
  
  try {
    // 1. 基本的な接続テスト
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('✅ Supabase接続テスト成功');
    console.log('セッション情報:', session ? 'あり' : 'なし');
    
    // 2. publicスキーマへの接続テスト
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);
    
    if (tablesError) {
      console.warn('⚠️ テーブル情報取得エラー:', tablesError);
    } else {
      console.log('✅ テーブル情報取得成功:', tables);
    }
    
    // 3. dogsテーブルのテスト
    console.log('🐕 dogsテーブルのテスト...');
    const { data: dogsData, error: dogsError } = await supabase
      .from('dogs')
      .select('id, name, breed, image_url, created_at')
      .limit(3);
    
    if (dogsError) {
      console.error('❌ dogsテーブルエラー:', dogsError);
    } else {
      console.log('✅ dogsテーブル取得成功:', dogsData?.length || 0, '件');
      console.log('データ例:', dogsData?.[0]);
    }
    
    // 4. news_announcementsテーブルのテスト
    console.log('📰 news_announcementsテーブルのテスト...');
    const { data: newsData, error: newsError } = await supabase
      .from('news_announcements')
      .select('id, title, content, created_at')
      .limit(3);
    
    if (newsError) {
      console.error('❌ news_announcementsテーブルエラー:', newsError);
    } else {
      console.log('✅ news_announcementsテーブル取得成功:', newsData?.length || 0, '件');
      console.log('データ例:', newsData?.[0]);
    }
    
    // 5. RLSの状態確認
    console.log('🔐 RLSの状態確認...');
    const { data: rlsData, error: rlsError } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .in('relname', ['dogs', 'news_announcements']);
    
    if (rlsError) {
      console.warn('⚠️ RLS状態取得エラー:', rlsError);
    } else {
      console.log('✅ RLS状態:', rlsData);
    }
    
    return {
      success: true,
      dogsCount: dogsData?.length || 0,
      newsCount: newsData?.length || 0,
      errors: {
        dogs: dogsError,
        news: newsError,
        session: sessionError
      }
    };
    
  } catch (error) {
    console.error('❌ Supabase接続テスト失敗:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// テストデータの作成
export const createTestData = async () => {
  console.log('🔧 テストデータの作成...');
  
  try {
    // テスト用のワンちゃんデータ
    const testDogs = [
      {
        name: 'ポチ',
        breed: 'ゴールデンレトリバー',
        birth_date: '2023-01-15',
        gender: 'オス',
        image_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=300&fit=crop',
        owner_id: '00000000-0000-0000-0000-000000000000'
      },
      {
        name: 'ハナ',
        breed: '柴犬',
        birth_date: '2023-03-10',
        gender: 'メス',
        image_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=300&fit=crop',
        owner_id: '00000000-0000-0000-0000-000000000000'
      },
      {
        name: 'チョコ',
        breed: 'ダックスフント',
        birth_date: '2023-05-20',
        gender: 'オス',
        image_url: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&h=300&fit=crop',
        owner_id: '00000000-0000-0000-0000-000000000000'
      }
    ];
    
    // テスト用の新着情報
    const testNews = [
      {
        title: 'ドッグパークJPサービス開始！',
        content: 'ついにドッグパークJPのサービスが開始されました。多くのワンちゃんたちにお会いできることを楽しみにしています。',
        priority: 'high',
        is_active: true
      },
      {
        title: '新しいパートナーパーク追加',
        content: '東京都内に新しいパートナーパークが3カ所追加されました。詳細は各パークのページをご確認ください。',
        priority: 'medium',
        is_active: true
      },
      {
        title: 'メンテナンスのお知らせ',
        content: '2025年1月20日(月) 02:00-04:00の間、システムメンテナンスを実施いたします。',
        priority: 'low',
        is_active: true
      }
    ];
    
    // dogsテーブルに挿入
    const { data: dogsResult, error: dogsError } = await supabase
      .from('dogs')
      .insert(testDogs)
      .select();
    
    if (dogsError) {
      console.error('❌ テスト用ワンちゃんデータ挿入エラー:', dogsError);
    } else {
      console.log('✅ テスト用ワンちゃんデータ挿入成功:', dogsResult?.length || 0, '件');
    }
    
    // news_announcementsテーブルに挿入
    const { data: newsResult, error: newsError } = await supabase
      .from('news_announcements')
      .insert(testNews)
      .select();
    
    if (newsError) {
      console.error('❌ テスト用新着情報データ挿入エラー:', newsError);
    } else {
      console.log('✅ テスト用新着情報データ挿入成功:', newsResult?.length || 0, '件');
    }
    
    return {
      success: true,
      dogsCreated: dogsResult?.length || 0,
      newsCreated: newsResult?.length || 0,
      errors: {
        dogs: dogsError,
        news: newsError
      }
    };
    
  } catch (error) {
    console.error('❌ テストデータ作成エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// 開発環境でのみ実行
if (import.meta.env.DEV) {
  (window as any).testSupabase = testSupabaseConnection;
  (window as any).createTestData = createTestData;
} 
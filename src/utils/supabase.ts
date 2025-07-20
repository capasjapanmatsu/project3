import { createClient } from '@supabase/supabase-js';

// 環境変数を取得
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// エラーハンドリング
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', !!supabaseKey);
  throw new Error('Supabase環境変数が見つかりません');
}

// 開発環境でのみデバッグ情報を表示
if (import.meta.env.DEV) {
  console.log('✅ Supabase Configuration Loaded:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    environment: import.meta.env.MODE
  });
}

// Supabaseクライアント作成
export const supabase = createClient(supabaseUrl, supabaseKey);

// 開発環境かどうかを判定
export const isDevelopment = () => {
  return import.meta.env.DEV;
}; 
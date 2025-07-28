import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase環境変数が設定されていません');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// ワクチン画像の公開URLを安全に取得する関数
export const getVaccineImageUrl = (imagePath: string | null): string | null => {
  if (!imagePath) return null;
  
  try {
    const { data } = supabase.storage.from('vaccine-certs').getPublicUrl(imagePath);
    return data.publicUrl;
  } catch (error) {
    return null;
  }
};

export default supabase;

// Supabaseエラーハンドラー
export const handleSupabaseError = (error: any): string => {
  if (!error) return '不明なエラーが発生しました';
  
  // PostgreSQL/Supabaseエラーコード処理
  switch (error.code) {
    case '23505': // unique_violation
      return 'このデータは既に存在しています';
    case '23503': // foreign_key_violation
      return '関連するデータが存在しません';
    case '23502': // not_null_violation
      return '必須項目が入力されていません';
    case '42501': // insufficient_privilege
      return '操作する権限がありません';
    case '42703': // undefined_column
      return 'データベースの構造に問題があります';
    case 'PGRST116': // no_rows
      return 'データが見つかりません';
    case 'PGRST301': // invalid_body
      return '送信されたデータが無効です';
    default:
      // メッセージがある場合はそれを使用
      if (error.message) {
        // 英語メッセージを日本語に翻訳
        const message = error.message.toLowerCase();
        if (message.includes('duplicate key')) return 'このデータは既に存在しています';
        if (message.includes('foreign key')) return '関連するデータが存在しません';
        if (message.includes('not null')) return '必須項目が入力されていません';
        if (message.includes('permission')) return '操作する権限がありません';
        if (message.includes('authentication')) return '認証に失敗しました';
        if (message.includes('network')) return 'ネットワークエラーが発生しました';
        return error.message;
      }
      return 'データベース処理中にエラーが発生しました';
  }
}; 
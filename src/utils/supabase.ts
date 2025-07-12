import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Storage utility functions
export const getVaccineImageUrl = (imagePath: string | null): string | null => {
  if (!imagePath) return null;
  
  // 既にHTTPで始まる場合はそのまま返す
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // パスをそのまま使用（temp/を強制追加しない）
  const normalizedPath = imagePath;
  
  // 公開URLを生成
  const { data } = supabase.storage
    .from('vaccine-certs')
    .getPublicUrl(normalizedPath);
  
  return data.publicUrl;
};

// 管理者かどうかをチェック
export const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Admin check error:', error);
      return false;
    }
    
    return data?.user_type === 'admin';
  } catch (error) {
    console.error('Admin check exception:', error);
    return false;
  }
};

// Supabaseエラーハンドリング関数
export const handleSupabaseError = (error: unknown): string => {
  console.error('Supabase error:', error);
  
  if (error instanceof Error) {
    // リフレッシュトークンエラー
    if (error.message.includes('refresh_token_not_found')) {
      console.warn('Invalid refresh token detected, signing out user');
      supabase.auth.signOut();
      return 'セッションが期限切れです。再度ログインしてください。';
    }
    
    // ネットワーク接続エラー
    if (
      error.message.includes('NetworkError') ||
      error.message.includes('Failed to fetch') ||
      (error.name === 'TypeError' && error.message.includes('fetch'))
    ) {
      return 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
    }
    
    // タイムアウトエラー
    if (
      error.message.includes('timed out') ||
      error.name === 'AbortError' ||
      error.message.includes('timeout')
    ) {
      return 'リクエストがタイムアウトしました。もう一度お試しください。';
    }
    
    // CORS エラー
    if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
      return 'CORS設定に問題があります。';
    }
    
    // 認証エラー
    if (error.message.includes('JWT')) {
      return '認証に問題があります。再度ログインしてください。';
    }
    
    if (error.message) {
      return error.message;
    }
  }
  
  return '予期しないエラーが発生しました。';
};

// Supabase接続テスト関数
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
};

// 安全なSupabaseクエリ実行関数
export const safeSupabaseQuery = async <T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>
): Promise<{ data: T | null; error: unknown; isOffline: boolean }> => {
  try {
    const result = await queryFn();
    return { ...result, isOffline: false };
  } catch (retryError) {
    console.error('Query error:', retryError);
    return { data: null, error: retryError, isOffline: true };
  }
};

// デバッグ用：現在の認証状態を表示
export const debugAuth = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();
  
  console.log('🔍 Auth Debug:', {
    session: session ? 'Present' : 'Missing',
    user: user ? 'Present' : 'Missing',
    userId: user?.id,
    userEmail: user?.email,
    error: error?.message
  });
  
  return { session, user, error };
};

// 開発環境かどうかを判定
export const isDevelopment = () => {
  return import.meta.env.DEV;
};
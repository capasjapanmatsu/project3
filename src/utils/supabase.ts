import { createClient } from '@supabase/supabase-js';

// Netlify Supabase Extension 対応の環境変数
// フォールバック機能付きで既存の環境変数も使用可能
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                   import.meta.env.VITE_SUPABASE_DATABASE_URL || 
                   import.meta.env.SUPABASE_DATABASE_URL as string;

const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                   import.meta.env.SUPABASE_ANON_KEY as string;

// サービスロールキー（管理者機能用）
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                              import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string;

// JWT シークレット（必要に応じて）
const supabaseJwtSecret = import.meta.env.VITE_SUPABASE_JWT_SECRET || 
                         import.meta.env.SUPABASE_JWT_SECRET as string;

// 開発環境でのみ詳細なログを出力
if (import.meta.env.DEV) {
  console.log('🔗 Supabase Netlify Extension 設定:', {
    // 基本設定
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    hasServiceRoleKey: !!supabaseServiceRoleKey,
    hasJwtSecret: !!supabaseJwtSecret,
    
    // 環境変数の状態
    netlifyExtensionActive: !!(import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_DATABASE_URL),
    environment: import.meta.env.MODE || 'unknown',
    
    // 安全な URL 表示
    url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
    timestamp: new Date().toISOString(),
    
    // 使用中の環境変数ソース
    urlSource: import.meta.env.VITE_SUPABASE_URL ? 'VITE_SUPABASE_URL' : 
               import.meta.env.VITE_SUPABASE_DATABASE_URL ? 'VITE_SUPABASE_DATABASE_URL' :
               import.meta.env.SUPABASE_DATABASE_URL ? 'SUPABASE_DATABASE_URL' : 'none',
    
    keySource: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'VITE_SUPABASE_ANON_KEY' : 
               import.meta.env.SUPABASE_ANON_KEY ? 'SUPABASE_ANON_KEY' : 'none'
  });
}

// エラーハンドリングの改善
if (!supabaseUrl || !supabaseKey) {
  const error = new Error('Supabase 環境変数が見つかりません');
  const errorDetails = {
    supabaseUrl: !!supabaseUrl ? 'present' : 'missing',
    supabaseKey: !!supabaseKey ? 'present' : 'missing',
    environment: import.meta.env.MODE || 'unknown',
    availableEnvVars: {
      VITE_SUPABASE_URL: !!import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_DATABASE_URL: !!import.meta.env.VITE_SUPABASE_DATABASE_URL,
      SUPABASE_DATABASE_URL: !!import.meta.env.SUPABASE_DATABASE_URL,
      VITE_SUPABASE_ANON_KEY: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      SUPABASE_ANON_KEY: !!import.meta.env.SUPABASE_ANON_KEY,
    }
  };
  
  console.error('❌ Supabase 初期化エラー:', errorDetails);
  console.error('💡 Netlify Supabase Extension の設定を確認してください：');
  console.error('   1. Netlify ダッシュボード → Site settings → Environment variables');
  console.error('   2. 以下の環境変数が設定されているか確認:');
  console.error('      - VITE_SUPABASE_URL=${SUPABASE_DATABASE_URL}');
  console.error('      - VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}');
  
  throw error;
}

// メインの Supabase クライアント（一般用）
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // より安全で高速
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // セッション永続化の改善
    storageKey: 'sb-dogpark-auth-token',
    // セッション更新の設定
    debug: import.meta.env.DEV, // 開発環境でのみデバッグ
  },
  realtime: {
    params: {
      eventsPerSecond: import.meta.env.PROD ? 5 : 10,
    },
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'dogpark-jp-web-netlify',
      'X-Environment': import.meta.env.MODE || 'unknown',
    },
  },
});

// 管理者用の Supabase クライアント（Service Role Key 使用）
export const supabaseAdmin = supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'dogpark-jp-admin-netlify',
    },
  },
}) : null;

// 管理者クライアントの利用可否をチェック
export const isAdminClientAvailable = (): boolean => {
  return !!supabaseAdmin;
};

// 開発環境でのみ認証状態の変化をログ出力
if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session ? 'session exists' : 'no session');
  });
}

// Storage utility functions
export const getVaccineImageUrl = (imagePath: string | null): string | null => {
  if (!imagePath) return null;
  
  // 既に完全なURLの場合はそのまま返す
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Supabase Storage の公開URL を生成
  const { data } = supabase.storage.from('vaccine-certificates').getPublicUrl(imagePath);
  return data?.publicUrl || null;
};

// 管理者かどうかをチェック
export const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('管理者権限チェックエラー:', error);
      return false;
    }
    
    return data?.role === 'admin';
  } catch (error) {
    console.error('管理者権限チェック中にエラーが発生しました:', error);
    return false;
  }
};

// Supabaseエラーハンドリング関数
export const handleSupabaseError = (error: unknown): string => {
  if (!error) return '不明なエラーが発生しました';
  
  if (typeof error === 'string') return error;
  
  if (error && typeof error === 'object' && 'message' in error) {
    const err = error as { message: string; code?: string };
    
    // Netlify Supabase Extension 特有のエラーハンドリング
    if (err.code === 'PGRST116') {
      return 'データが見つかりません。Netlify の環境変数設定を確認してください。';
    }
    
    if (err.code === 'PGRST301') {
      return 'データベース接続エラー。Netlify Supabase Extension の設定を確認してください。';
    }
    
    // 一般的なエラーメッセージの日本語化
    switch (err.message) {
      case 'Invalid API key':
        return 'API キーが無効です。Netlify の環境変数 VITE_SUPABASE_ANON_KEY を確認してください。';
      case 'Invalid URL':
        return 'データベース URL が無効です。Netlify の環境変数 VITE_SUPABASE_URL を確認してください。';
      case 'Network error':
        return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      case 'Authentication required':
        return '認証が必要です。ログインしてください。';
      default:
        return err.message || '不明なエラーが発生しました';
    }
  }
  
  return '不明なエラーが発生しました';
};

// Supabase接続テスト関数
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      console.error('🔴 Supabase 接続テスト失敗:', error);
      console.error('💡 Netlify Supabase Extension の設定を確認してください');
      return false;
    }
    
    console.log('🟢 Supabase 接続テスト成功');
    return true;
  } catch (error) {
    console.error('🔴 Supabase 接続テスト中にエラー:', error);
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
  } catch (error) {
    // ネットワークエラーの場合はオフライン状態として扱う
    const isNetworkError = error instanceof Error && 
                          (error.message.includes('Network') || 
                           error.message.includes('fetch'));
    
    console.error('Supabase クエリエラー:', error);
    return {
      data: null,
      error: error,
      isOffline: isNetworkError
    };
  }
};

// デバッグ用：現在の認証状態を表示
export const debugAuth = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  console.log('🔐 認証デバッグ情報:', {
    user: user ? {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    } : null,
    error: error,
    session: await supabase.auth.getSession(),
    netlifyExtension: {
      url: !!import.meta.env.VITE_SUPABASE_URL,
      key: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      serviceRole: !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    }
  });
};

// 開発環境かどうかを判定
export const isDevelopment = () => {
  return import.meta.env.DEV;
};

// Netlify Supabase Extension 専用のユーティリティ関数
export const getNetlifySupabaseConfig = () => {
  return {
    url: supabaseUrl,
    anonKey: supabaseKey,
    serviceRoleKey: supabaseServiceRoleKey,
    jwtSecret: supabaseJwtSecret,
    isNetlifyExtensionActive: !!(import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_DATABASE_URL),
    environment: import.meta.env.MODE || 'unknown',
  };
};

// デバッグ用の環境変数チェック関数
export const checkNetlifySupabaseEnv = () => {
  const config = getNetlifySupabaseConfig();
  
  console.log('🔍 Netlify Supabase Extension 環境変数チェック:', {
    '✅ URL 設定': !!config.url,
    '✅ Anon Key 設定': !!config.anonKey,
    '✅ Service Role Key 設定': !!config.serviceRoleKey,
    '✅ JWT Secret 設定': !!config.jwtSecret,
    '🔗 Extension アクティブ': config.isNetlifyExtensionActive,
    '🌍 環境': config.environment,
    '📊 設定詳細': {
      url: config.url ? config.url.substring(0, 30) + '...' : 'なし',
      anonKey: config.anonKey ? config.anonKey.substring(0, 20) + '...' : 'なし',
      serviceRoleKey: config.serviceRoleKey ? config.serviceRoleKey.substring(0, 20) + '...' : 'なし',
    }
  });
  
  return config;
};

// 初期化時にチェック実行（開発環境のみ）
if (import.meta.env.DEV) {
  checkNetlifySupabaseEnv();
}
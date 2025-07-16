import { supabase } from './supabase';

// ===============================
// エラーハンドリング共通機能
// ===============================

export interface ErrorInfo {
  type: 'network' | 'auth' | 'validation' | 'database' | 'unknown';
  severity: 'low' | 'medium' | 'high';
  message: string;
  originalError?: unknown;
  userMessage: string;
  recoverable: boolean;
  retryable: boolean;
}

/**
 * Supabase エラーを統一的に処理
 */
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

/**
 * エラーを分類して適切な ErrorInfo を生成
 */
export const classifyError = (error: unknown): ErrorInfo => {
  if (typeof error === 'string') {
    return {
      type: 'unknown',
      severity: 'medium',
      message: error,
      userMessage: error,
      recoverable: true,
      retryable: false,
    };
  }

  if (error instanceof Error) {
    // ネットワークエラーの検出
    if (error.message.includes('fetch') || error.message.includes('Network')) {
      return {
        type: 'network',
        severity: 'medium',
        message: error.message,
        originalError: error,
        userMessage: 'ネットワークエラーが発生しました。接続を確認してください。',
        recoverable: true,
        retryable: true,
      };
    }

    // 認証エラーの検出
    if (error.message.includes('auth') || error.message.includes('Unauthorized')) {
      return {
        type: 'auth',
        severity: 'high',
        message: error.message,
        originalError: error,
        userMessage: '認証エラーが発生しました。再ログインしてください。',
        recoverable: true,
        retryable: false,
      };
    }

    // バリデーションエラーの検出
    if (error.message.includes('validation') || error.message.includes('Invalid')) {
      return {
        type: 'validation',
        severity: 'low',
        message: error.message,
        originalError: error,
        userMessage: '入力内容を確認してください。',
        recoverable: true,
        retryable: false,
      };
    }
  }

  // Supabaseエラーの処理
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const supabaseMessage = handleSupabaseError(error);
    return {
      type: 'database',
      severity: 'medium',
      message: supabaseMessage,
      originalError: error,
      userMessage: supabaseMessage,
      recoverable: true,
      retryable: true,
    };
  }

  // デフォルトエラー
  return {
    type: 'unknown',
    severity: 'medium',
    message: error instanceof Error ? error.message : String(error),
    originalError: error,
    userMessage: '予期しないエラーが発生しました。',
    recoverable: true,
    retryable: true,
  };
};

// ===============================
// API呼び出し共通機能
// ===============================

export interface QueryOptions {
  retries?: number;
  timeout?: number;
  useCache?: boolean;
  cacheKey?: string;
}

/**
 * 安全なSupabaseクエリ実行
 */
export const safeSupabaseQuery = async <T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  options: QueryOptions = {}
): Promise<{ data: T | null; error: unknown; isOffline: boolean }> => {
  const { retries = 0, timeout = 5000 } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const result = await queryFn();
      clearTimeout(timeoutId);

      return { ...result, isOffline: false };
    } catch (error) {
      console.warn(`Query attempt ${attempt + 1} failed:`, error);

      if (attempt === retries) {
        const isNetworkError = error instanceof Error &&
          (error.message.includes('Network') ||
           error.message.includes('fetch') ||
           error.message.includes('AbortError'));

        return {
          data: null,
          error: error,
          isOffline: isNetworkError
        };
      }

      // 再試行前の待機時間（指数バックオフ）
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return {
    data: null,
    error: new Error('Max retries exceeded'),
    isOffline: false
  };
};

/**
 * 複数のSupabaseクエリを並列実行
 */
export const parallelSupabaseQueries = async <T extends Record<string, any>>(
  queries: Record<keyof T, () => Promise<{ data: any; error: unknown }>>
): Promise<T> => {
  const results = await Promise.allSettled(
    Object.entries(queries).map(async ([key, queryFn]) => ({
      key,
      result: await queryFn()
    }))
  );

  const finalResult = {} as T;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { key, result: queryResult } = result.value;
      finalResult[key as keyof T] = queryResult.data || null;
    } else {
      console.warn(`Query ${Object.keys(queries)[index]} failed:`, result.reason);
      finalResult[Object.keys(queries)[index] as keyof T] = null;
    }
  });

  return finalResult;
};

// ===============================
// キャッシュ機能
// ===============================

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

const cache = new Map<string, CacheItem<any>>();

/**
 * キャッシュからデータを取得
 */
export const getCachedData = <T>(key: string): T | null => {
  try {
    const item = cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }

    return item.data;
  } catch (error) {
    console.warn('キャッシュ取得エラー:', error);
    return null;
  }
};

/**
 * データをキャッシュに保存
 */
export const setCachedData = <T>(key: string, data: T, ttl: number = 300000): void => {
  try {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  } catch (error) {
    console.warn('キャッシュ保存エラー:', error);
  }
};

/**
 * キャッシュをクリア
 */
export const clearCache = (pattern?: string): void => {
  if (pattern) {
    const regex = new RegExp(pattern);
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

// ===============================
// データバリデーション機能
// ===============================

/**
 * メールアドレスの検証
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * ファイル形式の検証
 */
export const isValidImageFile = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return allowedTypes.includes(file.type);
};

/**
 * ファイルサイズの検証
 */
export const isValidFileSize = (file: File, maxSizeInMB: number = 10): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

/**
 * 日付の検証
 */
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

// ===============================
// データフォーマット機能
// ===============================

/**
 * 日付を日本語形式でフォーマット
 */
export const formatJapaneseDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
};

/**
 * 相対時間を日本語で表示
 */
export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return '先ほど';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}日前`;
  
  return formatJapaneseDate(d);
};

/**
 * 価格を日本円でフォーマット
 */
export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
};

// ===============================
// ストレージユーティリティ
// ===============================

/**
 * Supabase Storage からの安全な画像URL取得
 */
export const getImageUrl = (bucket: string, path: string | null): string | null => {
  if (!path) return null;

  // 既に完全なURLの場合はそのまま返す
  if (path.startsWith('http')) {
    return path;
  }

  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.warn('画像URL取得エラー:', error);
    return null;
  }
};

/**
 * ファイルアップロードの共通処理
 */
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options: {
    upsert?: boolean;
    cacheControl?: string;
    contentType?: string;
  } = {}
): Promise<{ success: boolean; path?: string; url?: string; error?: string }> => {
  try {
    // ファイル検証
    if (!isValidImageFile(file)) {
      return { success: false, error: 'サポートされていないファイル形式です' };
    }

    if (!isValidFileSize(file)) {
      return { success: false, error: 'ファイルサイズが大きすぎます（最大10MB）' };
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: options.upsert ?? true,
        cacheControl: options.cacheControl ?? '3600',
        contentType: options.contentType ?? file.type,
      });

    if (error) {
      return { success: false, error: handleSupabaseError(error) };
    }

    const url = getImageUrl(bucket, data.path);

    return {
      success: true,
      path: data.path,
      url: url || undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: handleSupabaseError(error),
    };
  }
};

// ===============================
// ログ機能
// ===============================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

/**
 * 統一されたログ出力
 */
export const log = (level: LogLevel, message: string, context?: Record<string, any>): void => {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  const prefix = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  }[level];

  const logMessage = `${prefix} ${message}`;

  switch (level) {
    case 'debug':
      if (import.meta.env.DEV) {
        console.log(logMessage, context);
      }
      break;
    case 'info':
      console.log(logMessage, context);
      break;
    case 'warn':
      console.warn(logMessage, context);
      break;
    case 'error':
      console.error(logMessage, context);
      break;
  }
};

// ===============================
// デバウンス・スロットル機能
// ===============================

/**
 * デバウンス関数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * スロットル関数
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// ===============================
// ユーティリティ関数
// ===============================

/**
 * 安全なJSON解析
 */
export const safeJSONParse = <T>(str: string, fallback: T): T => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

/**
 * 安全なローカルストレージ操作
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  
  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * URLからファイル名を生成
 */
export const generateFileName = (prefix: string, extension: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.${extension}`;
};

/**
 * 配列を安全にシャッフル
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * 重複を除去
 */
export const unique = <T>(array: T[], keyFn?: (item: T) => any): T[] => {
  if (!keyFn) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/**
 * オブジェクトから空の値を除去
 */
export const removeEmptyValues = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => 
      value !== null && value !== undefined && value !== ''
    )
  ) as Partial<T>;
};

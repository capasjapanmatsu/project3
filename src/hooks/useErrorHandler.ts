import { useState, useCallback } from 'react';
import { handleSupabaseError } from '../utils/supabase';

export type ErrorType = 
  | 'network' 
  | 'validation' 
  | 'authentication' 
  | 'authorization' 
  | 'not_found' 
  | 'server' 
  | 'storage' 
  | 'payment' 
  | 'timeout' 
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorDetails {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: unknown;
  userMessage: string;
  recoverable: boolean;
  retryable: boolean;
  timestamp: Date;
  context?: Record<string, unknown>;
}

interface UseErrorHandlerReturn {
  error: ErrorDetails | null;
  isLoading: boolean;
  clearError: () => void;
  handleError: (error: unknown, context?: Record<string, unknown>) => void;
  retryAction: (() => Promise<void>) | null;
  executeWithErrorHandling: <T>(
    action: () => Promise<T>,
    context?: Record<string, unknown>
  ) => Promise<T | null>;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryAction, setRetryAction] = useState<(() => Promise<void>) | null>(null);

  const clearError = useCallback(() => {
    setError(null);
    setRetryAction(null);
  }, []);

  const classifyError = useCallback((error: unknown): Omit<ErrorDetails, 'timestamp' | 'context'> => {
    // ネットワークエラー
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // ネットワーク関連エラー
      if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
        return {
          type: 'network',
          severity: 'medium',
          message: error.message,
          originalError: error,
          userMessage: 'ネットワーク接続に問題があります。インターネット接続を確認してください。',
          recoverable: true,
          retryable: true,
        };
      }

      // タイムアウトエラー
      if (message.includes('timeout') || message.includes('timed out') || error.name === 'AbortError') {
        return {
          type: 'timeout',
          severity: 'medium',
          message: error.message,
          originalError: error,
          userMessage: 'リクエストがタイムアウトしました。もう一度お試しください。',
          recoverable: true,
          retryable: true,
        };
      }

      // 認証エラー
      if (message.includes('jwt') || message.includes('unauthorized') || message.includes('refresh_token')) {
        return {
          type: 'authentication',
          severity: 'high',
          message: error.message,
          originalError: error,
          userMessage: 'セッションが期限切れです。再度ログインしてください。',
          recoverable: true,
          retryable: false,
        };
      }

      // 権限エラー
      if (message.includes('forbidden') || message.includes('permission') || message.includes('row-level security')) {
        return {
          type: 'authorization',
          severity: 'high',
          message: error.message,
          originalError: error,
          userMessage: 'この操作を実行する権限がありません。',
          recoverable: false,
          retryable: false,
        };
      }

      // バリデーションエラー
      if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
        return {
          type: 'validation',
          severity: 'low',
          message: error.message,
          originalError: error,
          userMessage: '入力内容に問題があります。確認してください。',
          recoverable: true,
          retryable: false,
        };
      }

      // ストレージエラー
      if (message.includes('storage') || message.includes('bucket') || message.includes('file')) {
        return {
          type: 'storage',
          severity: 'medium',
          message: error.message,
          originalError: error,
          userMessage: 'ファイルの処理中にエラーが発生しました。しばらく待ってから再度お試しください。',
          recoverable: true,
          retryable: true,
        };
      }

      // 決済エラー
      if (message.includes('payment') || message.includes('stripe') || message.includes('subscription')) {
        return {
          type: 'payment',
          severity: 'high',
          message: error.message,
          originalError: error,
          userMessage: '決済処理中にエラーが発生しました。カード情報を確認してください。',
          recoverable: true,
          retryable: true,
        };
      }

      // サーバーエラー（5xx）
      if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('520')) {
        return {
          type: 'server',
          severity: 'high',
          message: error.message,
          originalError: error,
          userMessage: 'サーバーで一時的な問題が発生しています。しばらく待ってから再度お試しください。',
          recoverable: true,
          retryable: true,
        };
      }

      // 404エラー
      if (message.includes('404') || message.includes('not found')) {
        return {
          type: 'not_found',
          severity: 'medium',
          message: error.message,
          originalError: error,
          userMessage: '要求されたリソースが見つかりません。',
          recoverable: false,
          retryable: false,
        };
      }
    }

    // Supabaseエラーの処理
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const supabaseMessage = handleSupabaseError(error);
      return {
        type: 'server',
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
      userMessage: '予期しないエラーが発生しました。しばらく待ってから再度お試しください。',
      recoverable: true,
      retryable: true,
    };
  }, []);

  const logError = useCallback((errorDetails: ErrorDetails) => {
    // 開発環境では詳細ログを出力
    if (import.meta.env.DEV) {
      console.group(`🚨 Error [${errorDetails.severity.toUpperCase()}] - ${errorDetails.type}`);
      console.warn('User Message:', errorDetails.userMessage);
      console.warn('Technical Message:', errorDetails.message);
      console.warn('Original Error:', errorDetails.originalError);
      console.warn('Context:', errorDetails.context);
      console.warn('Recoverable:', errorDetails.recoverable);
      console.warn('Retryable:', errorDetails.retryable);
      console.groupEnd();
    }

    // 本番環境では重要なエラーのみログ
    if (import.meta.env.PROD && errorDetails.severity === 'critical') {
      // ここで外部のエラートラッキングサービス（Sentry等）に送信
      console.error('Critical Error:', {
        type: errorDetails.type,
        message: errorDetails.message,
        timestamp: errorDetails.timestamp,
        context: errorDetails.context,
      });
    }
  }, []);

  const handleError = useCallback((error: unknown, context?: Record<string, unknown>) => {
    const errorDetails: ErrorDetails = {
      ...classifyError(error),
      timestamp: new Date(),
      ...(context && { context }),
    };

    logError(errorDetails);
    setError(errorDetails);
  }, [classifyError, logError]);

  const executeWithErrorHandling = useCallback(async <T>(
    action: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T | null> => {
    setIsLoading(true);
    clearError();

    try {
      const result = await action();
      setIsLoading(false);
      return result;
    } catch (error) {
      handleError(error, context);
      setIsLoading(false);
      
      // リトライ可能な場合はリトライ関数を設定
      const errorDetails = classifyError(error);
      if (errorDetails.retryable) {
        setRetryAction(() => async () => {
          await executeWithErrorHandling(action, context);
        });
      }
      
      return null;
    }
  }, [handleError, clearError, classifyError]);

  return {
    error,
    isLoading,
    clearError,
    handleError,
    retryAction,
    executeWithErrorHandling,
  };
} 
import { useState, useCallback, useRef } from 'react';
import type { ErrorType } from './useErrorHandler';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: ErrorType[];
  autoRetry: boolean;
}

interface RetryState {
  attempts: number;
  isRetrying: boolean;
  lastError: Error | null;
  nextRetryIn: number;
}

interface UseRetryWithRecoveryReturn {
  execute: <T>(fn: () => Promise<T>) => Promise<T>;
  state: RetryState;
  reset: () => void;
  cancelRetry: () => void;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableErrors: ['network', 'timeout', 'server', 'storage'],
  autoRetry: true,
};

export function useRetryWithRecovery(config: Partial<RetryConfig> = {}): UseRetryWithRecoveryReturn {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [state, setState] = useState<RetryState>({
    attempts: 0,
    isRetrying: false,
    lastError: null,
    nextRetryIn: 0,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();

  const reset = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setState({
      attempts: 0,
      isRetrying: false,
      lastError: null,
      nextRetryIn: 0,
    });
  }, []);

  const cancelRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setState(prev => ({
      ...prev,
      isRetrying: false,
      nextRetryIn: 0,
    }));
  }, []);

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt);
    return Math.min(delay, finalConfig.maxDelay);
  }, [finalConfig]);

  const isRetryableError = useCallback((error: Error): boolean => {
    const message = error.message.toLowerCase();
    
    // ネットワークエラー
    if (finalConfig.retryableErrors.includes('network') &&
        (message.includes('network') || message.includes('fetch') || message.includes('connection'))) {
      return true;
    }

    // タイムアウトエラー
    if (finalConfig.retryableErrors.includes('timeout') &&
        (message.includes('timeout') || message.includes('timed out') || error.name === 'AbortError')) {
      return true;
    }

    // サーバーエラー
    if (finalConfig.retryableErrors.includes('server') &&
        (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('520'))) {
      return true;
    }

    // ストレージエラー
    if (finalConfig.retryableErrors.includes('storage') &&
        (message.includes('storage') || message.includes('bucket'))) {
      return true;
    }

    return false;
  }, [finalConfig.retryableErrors]);

  const startCountdown = useCallback((delay: number, onComplete: () => void) => {
    let remaining = Math.ceil(delay / 1000);
    setState(prev => ({ ...prev, nextRetryIn: remaining }));

    countdownIntervalRef.current = setInterval(() => {
      remaining--;
      setState(prev => ({ ...prev, nextRetryIn: remaining }));
      
      if (remaining <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        onComplete();
      }
    }, 1000);
  }, []);

  const executeWithRetry = useCallback(async <T>(
    fn: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> => {
    try {
      setState(prev => ({ ...prev, attempts: attempt, lastError: null }));
      const result = await fn();
      reset();
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, lastError: errorObj }));

      // 最大試行回数に達した場合
      if (attempt >= finalConfig.maxAttempts - 1) {
        setState(prev => ({ ...prev, isRetrying: false }));
        throw errorObj;
      }

      // リトライ不可能なエラーの場合
      if (!isRetryableError(errorObj)) {
        setState(prev => ({ ...prev, isRetrying: false }));
        throw errorObj;
      }

      // 自動リトライが無効の場合
      if (!finalConfig.autoRetry) {
        setState(prev => ({ ...prev, isRetrying: false }));
        throw errorObj;
      }

      // リトライの準備
      const delay = calculateDelay(attempt);
      setState(prev => ({ ...prev, isRetrying: true }));

      return new Promise((resolve, reject) => {
        // ユーザーにカウントダウンを表示
        startCountdown(delay, () => {
          // リトライの実行
          retryTimeoutRef.current = setTimeout(() => {
            executeWithRetry(fn, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, 0);
        });
      });
    }
  }, [finalConfig, isRetryableError, calculateDelay, reset, startCountdown]);

  const execute = useCallback(<T>(fn: () => Promise<T>): Promise<T> => {
    return executeWithRetry(fn, 0);
  }, [executeWithRetry]);

  return {
    execute,
    state,
    reset,
    cancelRetry,
  };
}

// プリセット設定
export const retryConfigs = {
  // ネットワーク操作用（ファイルアップロードなど）
  network: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 8000,
    backoffFactor: 2,
    retryableErrors: ['network', 'timeout'] as ErrorType[],
    autoRetry: true,
  },

  // APIコール用
  api: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 1.5,
    retryableErrors: ['network', 'timeout', 'server'] as ErrorType[],
    autoRetry: true,
  },

  // クリティカル操作用（決済など）
  critical: {
    maxAttempts: 5,
    baseDelay: 3000,
    maxDelay: 15000,
    backoffFactor: 2,
    retryableErrors: ['network', 'timeout', 'server'] as ErrorType[],
    autoRetry: false, // 手動リトライ
  },

  // ストレージ操作用
  storage: {
    maxAttempts: 4,
    baseDelay: 1500,
    maxDelay: 10000,
    backoffFactor: 2,
    retryableErrors: ['network', 'timeout', 'storage'] as ErrorType[],
    autoRetry: true,
  },
} as const; 
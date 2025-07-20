// エラーハンドリングユーティリティ（Best Practices対応）

interface ErrorLog {
    timestamp: Date;
    error: Error;
    context?: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    resolved?: boolean;
}

export class ErrorHandler {
    private static errorLogs: ErrorLog[] = [];
    private static maxLogs = 100;

    // エラーの記録
    static logError(error: Error, context?: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
        const errorLog: ErrorLog = {
            timestamp: new Date(),
            error,
            context,
            severity,
            resolved: false
        };

        this.errorLogs.push(errorLog);

        // ログサイズの制限
        if (this.errorLogs.length > this.maxLogs) {
            this.errorLogs.shift();
        }

        // 本番環境では外部サービスに送信
        if (import.meta.env.PROD) {
            this.sendToExternalService(errorLog);
        } else {
            console.error('🚨 Error logged:', errorLog);
        }

        // 重要なエラーの場合はユーザーに通知
        if (severity === 'high' || severity === 'critical') {
            this.showUserNotification(error, severity);
        }
    }

    // ユーザーフレンドリーなエラー通知
    static showUserNotification(error: Error, severity: 'low' | 'medium' | 'high' | 'critical'): void {
        const errorMap = {
            'NetworkError': {
                title: '通信エラー',
                message: 'インターネット接続を確認してください。',
                action: '再試行',
                icon: '🌐'
            },
            'TypeError': {
                title: 'システムエラー',
                message: 'システムで問題が発生しました。',
                action: '再読み込み',
                icon: '⚠️'
            },
            'ReferenceError': {
                title: 'システムエラー',
                message: 'システムで問題が発生しました。',
                action: '再読み込み',
                icon: '⚠️'
            },
            'SyntaxError': {
                title: 'システムエラー',
                message: 'システムで問題が発生しました。',
                action: '再読み込み',
                icon: '⚠️'
            },
            'AuthError': {
                title: '認証エラー',
                message: 'ログインし直してください。',
                action: 'ログイン',
                icon: '🔐'
            },
            'ValidationError': {
                title: '入力エラー',
                message: '入力内容を確認してください。',
                action: '確認',
                icon: '📝'
            },
            'default': {
                title: 'エラー',
                message: '予期しないエラーが発生しました。',
                action: '再読み込み',
                icon: '❌'
            }
        };

        const errorType = error.constructor.name;
        const errorInfo = errorMap[errorType as keyof typeof errorMap] || errorMap.default;

        const severityColors = {
            low: '#fbbf24',
            medium: '#f59e0b',
            high: '#ef4444',
            critical: '#dc2626'
        };

        const notification = document.createElement('div');
        notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-left: 4px solid ${severityColors[severity]};
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        padding: 1rem;
        max-width: 400px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideIn 0.3s ease-out;
      ">
        <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
          <span style="font-size: 1.5rem;">${errorInfo.icon}</span>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 0.5rem 0; color: #1f2937; font-size: 1rem; font-weight: 600;">
              ${errorInfo.title}
            </h4>
            <p style="margin: 0 0 1rem 0; color: #6b7280; font-size: 0.9rem; line-height: 1.4;">
              ${errorInfo.message}
            </p>
            <div style="display: flex; gap: 0.5rem;">
              <button onclick="handleErrorAction('${errorType}')" style="
                background: ${severityColors[severity]};
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.85rem;
                font-weight: 500;
              ">
                ${errorInfo.action}
              </button>
              <button onclick="this.closest('div').remove()" style="
                background: #e5e7eb;
                color: #6b7280;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.85rem;
              ">
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(notification);

        // 自動削除タイマー
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 7000);

        // スタイル追加
        if (!document.getElementById('error-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'error-notification-styles';
            style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
            document.head.appendChild(style);
        }
    }

    // エラーアクションハンドラー
    static handleErrorAction(errorType: string): void {
        switch (errorType) {
            case 'NetworkError':
                window.location.reload();
                break;
            case 'AuthError':
                window.location.href = '/login';
                break;
            case 'TypeError':
            case 'ReferenceError':
            case 'SyntaxError':
            default:
                window.location.reload();
                break;
        }
    }

    // 外部サービスへの送信（例：Sentry、LogRocket等）
    private static sendToExternalService(errorLog: ErrorLog): void {
        // 実際の実装では、適切な外部サービスのAPIを使用

        // 例: Sentry
        // Sentry.captureException(errorLog.error, {
        //   extra: errorLog.context,
        //   level: errorLog.severity
        // });
    }

    // Supabase エラーの処理
    static handleSupabaseError(error: any): string {
        const errorMap = {
            'invalid_grant': 'ログイン情報が正しくありません',
            'email_not_confirmed': 'メールアドレスの確認が必要です',
            'invalid_credentials': 'ログイン情報が正しくありません',
            'signup_disabled': '新規登録は現在無効です',
            'email_rate_limit_exceeded': 'メール送信の制限に達しました',
            'captcha_failed': 'reCAPTCHA認証に失敗しました',
            'invalid_api_key': 'APIキーが無効です',
            'insufficient_permissions': '権限が不足しています',
            'request_timeout': 'リクエストがタイムアウトしました',
            'service_unavailable': 'サービスが一時的に利用できません'
        };

        const errorCode = error?.error?.code || error?.code || 'unknown';
        const userMessage = errorMap[errorCode as keyof typeof errorMap] || 'エラーが発生しました';

        this.logError(new Error(userMessage), { supabaseError: error }, 'medium');

        return userMessage;
    }

    // ネットワークエラーの処理
    static handleNetworkError(error: Error): string {
        let message = 'ネットワークエラーが発生しました';

        if (!navigator.onLine) {
            message = 'インターネット接続がありません';
        } else if (error.message.includes('timeout')) {
            message = '接続がタイムアウトしました';
        } else if (error.message.includes('404')) {
            message = 'リソースが見つかりませんでした';
        } else if (error.message.includes('500')) {
            message = 'サーバーでエラーが発生しました';
        }

        this.logError(error, { networkError: true }, 'high');

        return message;
    }

    // フォームバリデーションエラーの処理
    static handleValidationError(errors: Record<string, string>): void {
        Object.entries(errors).forEach(([field, message]) => {
            const input = document.querySelector(`[name="${field}"]`) as HTMLInputElement;

            if (input) {
                // 入力フィールドのスタイルを変更
                input.style.borderColor = '#ef4444';
                input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

                // エラーメッセージを表示
                let errorElement = input.parentElement?.querySelector('.error-message') as HTMLElement;

                if (!errorElement) {
                    errorElement = document.createElement('div');
                    errorElement.className = 'error-message';
                    errorElement.style.cssText = `
            color: #ef4444;
            font-size: 0.875rem;
            margin-top: 0.25rem;
            display: block;
          `;
                    input.parentElement?.appendChild(errorElement);
                }

                errorElement.textContent = message;

                // フォーカス時にエラーをクリア
                input.addEventListener('focus', () => {
                    input.style.borderColor = '';
                    input.style.boxShadow = '';
                    if (errorElement) {
                        errorElement.remove();
                    }
                }, { once: true });
            }
        });
    }

    // エラーログの取得
    static getErrorLogs(): ErrorLog[] {
        return [...this.errorLogs];
    }

    // エラーログのクリア
    static clearErrorLogs(): void {
        this.errorLogs = [];
    }

    // エラー統計の取得
    static getErrorStats(): {
        total: number;
        by_severity: Record<string, number>;
        by_type: Record<string, number>;
        recent: ErrorLog[];
    } {
        const stats = {
            total: this.errorLogs.length,
            by_severity: {} as Record<string, number>,
            by_type: {} as Record<string, number>,
            recent: this.errorLogs.slice(-10)
        };

        this.errorLogs.forEach(log => {
            stats.by_severity[log.severity] = (stats.by_severity[log.severity] || 0) + 1;
            stats.by_type[log.error.constructor.name] = (stats.by_type[log.error.constructor.name] || 0) + 1;
        });

        return stats;
    }
}

// グローバルエラーハンドラーの設定
export const setupGlobalErrorHandlers = (): void => {
    // JavaScript エラー
    window.addEventListener('error', (event) => {
        ErrorHandler.logError(event.error, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        }, 'high');
    });

    // Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
        ErrorHandler.logError(
            new Error(event.reason),
            { type: 'unhandledrejection' },
            'high'
        );
    });

    // リソース読み込みエラー
    window.addEventListener('error', (event) => {
        if (event.target !== window) {
            const target = event.target as HTMLElement;
            ErrorHandler.logError(
                new Error(`Resource loading failed: ${target.tagName}`),
                {
                    src: (target as any).src || (target as any).href,
                    tagName: target.tagName
                },
                'medium'
            );
        }
    }, true);
};

// グローバルアクションハンドラー（エラー通知用）
(window as any).handleErrorAction = ErrorHandler.handleErrorAction;

export default ErrorHandler; 

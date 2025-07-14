import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, PhoneCall } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isReloading: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  private reloadTimeouts: NodeJS.Timeout[] = [];

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isReloading: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // エラーが発生した場合の状態更新
    return {
      hasError: true,
      error,
      errorInfo: null,
      isReloading: false
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    // 本番環境でも詳細なエラー情報をログに出力
    console.error('Error Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // エラーを外部ログサービスに送信（将来の実装用）
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // 本番環境でのエラー情報の保存
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        environment: import.meta.env.PROD ? 'production' : 'development'
      };
      
      // localStorage に保存（将来的には外部サービスに送信）
      const existingErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      existingErrors.push(errorData);
      
      // 最大10件のエラーを保持
      if (existingErrors.length > 10) {
        existingErrors.shift();
      }
      
      localStorage.setItem('app_errors', JSON.stringify(existingErrors));
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  };

  private handleReload = () => {
    this.setState({ isReloading: true });
    
    // ローカルストレージをクリア
    try {
      const keysToRemove = [
        'sb-onmcivwxtzqajcovptgf-auth-token',
        'supabase.auth.token',
        'lastUsedEmail',
        'isTrustedDevice',
        'maintenance_last_check',
        'maintenance_status'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
    
    // 3秒後にリロード
    const timeout = setTimeout(() => {
      window.location.reload();
    }, 3000);
    
    this.reloadTimeouts.push(timeout);
  };

  private handleGoHome = () => {
    try {
      window.location.href = '/';
    } catch (e) {
      window.location.reload();
    }
  };

  private handleCopyError = () => {
    const errorText = `
Error: ${this.state.error?.message || 'Unknown error'}
Stack: ${this.state.error?.stack || 'No stack trace'}
Component Stack: ${this.state.errorInfo?.componentStack || 'No component stack'}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      alert('エラー情報をクリップボードにコピーしました');
    }).catch(() => {
      prompt('エラー情報をコピーしてください:', errorText);
    });
  };

  componentWillUnmount() {
    // タイムアウトをクリア
    this.reloadTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                エラーが発生しました
              </h1>
              <p className="text-gray-600 text-sm">
                申し訳ございません。アプリケーションでエラーが発生しました。
              </p>
            </div>

            {/* 本番環境でもエラー詳細を表示 */}
            {this.state.error && (
              <div className="mb-6 p-3 bg-red-50 rounded border text-xs">
                <p className="font-medium text-red-800 mb-1">エラー詳細:</p>
                <p className="text-red-700 break-words">
                  {this.state.error.message}
                </p>
                {import.meta.env.DEV && this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-red-600">
                      スタックトレース
                    </summary>
                    <pre className="mt-1 text-xs text-red-600 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                disabled={this.state.isReloading}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {this.state.isReloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    リロード中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    ページをリロード
                  </>
                )}
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Home className="w-4 h-4 mr-2" />
                ホームページに戻る
              </button>

              <button
                onClick={this.handleCopyError}
                className="w-full flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                <PhoneCall className="w-4 h-4 mr-2" />
                エラー情報をコピー
              </button>
            </div>

            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-xs text-gray-500">
                問題が続く場合は、ブラウザのキャッシュを削除するか、
                <br />
                シークレットモードでお試しください。
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
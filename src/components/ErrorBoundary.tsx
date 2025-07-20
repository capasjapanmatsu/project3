import { AlertTriangle, Copy, Home, RefreshCw } from 'lucide-react';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isReloading: boolean;
  copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isReloading: false,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isReloading: false,
      copied: false
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for developers
    console.error('🚨 アプリケーションエラー:', error);
    console.error('エラー詳細:', errorInfo);
    
    // Store error for potential support
    this.logErrorForSupport(error, errorInfo);
  }

  private logErrorForSupport = (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorData = {
        message: error.message,
        timestamp: new Date().toLocaleString('ja-JP'),
        page: window.location.pathname,
        userAgent: navigator.userAgent
      };
      
      localStorage.setItem('last_error', JSON.stringify(errorData));
    } catch (e) {
      console.warn('エラーの保存に失敗しました');
    }
  };

  private handleReload = () => {
    this.setState({ isReloading: true });
    
    // Clear potentially corrupted data
    try {
      localStorage.removeItem('cached_data');
      sessionStorage.clear();
    } catch (e) {
      console.warn('キャッシュクリアに失敗しました');
    }
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleCopyError = () => {
    const errorText = `
エラーが発生しました
時間: ${new Date().toLocaleString('ja-JP')}
ページ: ${window.location.pathname}
エラー: ${this.state.error?.message || '不明なエラー'}

この情報をサポートにお送りください。
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
            {/* Error Icon */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                おっと！
              </h1>
              <p className="text-gray-600">
                予期しないエラーが発生しました。<br />
                心配しないでください、すぐに解決できます。
              </p>
            </div>

            {/* Simple Error Display */}
            {this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm text-red-700 font-medium mb-1">
                  エラーの詳細:
                </p>
                <p className="text-sm text-red-600">
                  {this.state.error.message || 'システムエラーが発生しました'}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                disabled={this.state.isReloading}
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
              >
                {this.state.isReloading ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    画面を更新中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    画面を更新する
                  </>
                )}
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                <Home className="w-5 h-5 mr-2" />
                ホームに戻る
              </button>

              <button
                onClick={this.handleCopyError}
                className={`w-full flex items-center justify-center px-6 py-3 rounded-xl transition-all duration-200 font-medium ${
                  this.state.copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                <Copy className="w-5 h-5 mr-2" />
                {this.state.copied ? 'コピーしました！' : 'エラー情報をコピー'}
              </button>
            </div>

            {/* Help Message */}
            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-gray-500 leading-relaxed">
                💡 <strong>解決のヒント:</strong><br />
                ・ページを更新してみてください<br />
                ・ブラウザを再起動してください<br />
                ・問題が続く場合は、エラー情報をコピーしてサポートにお問い合わせください
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

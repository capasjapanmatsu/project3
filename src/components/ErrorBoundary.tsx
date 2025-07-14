import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 本番環境でのエラー詳細をログに出力
    if (process.env.NODE_ENV === 'production') {
      console.error('Production Error Details:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            
            <h1 className="text-xl font-bold text-center text-gray-800 mb-4">
              アプリケーションエラー
            </h1>
            
            <p className="text-gray-600 text-center mb-6">
              申し訳ございません。予期しないエラーが発生しました。
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                <h3 className="font-semibold text-red-800 mb-2">エラー詳細:</h3>
                <pre className="text-xs text-red-700 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-red-800 font-medium">
                      スタックトレース
                    </summary>
                    <pre className="text-xs text-red-700 overflow-auto max-h-40 mt-1">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            
            {process.env.NODE_ENV === 'production' && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-2">デバッグ情報:</h3>
                <div className="text-sm text-blue-700">
                  <p>エラー: {this.state.error?.message || 'Unknown error'}</p>
                  <p>時刻: {new Date().toLocaleString('ja-JP')}</p>
                  <p>URL: {window.location.href}</p>
                  <p>Browser: {navigator.userAgent}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                ページをリロード
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
              >
                ホームに戻る
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
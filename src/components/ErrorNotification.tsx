import { useEffect } from 'react';
import { 
  AlertTriangle, 
  WifiOff, 
  Shield, 
  ShieldAlert, 
  Clock, 
  Server, 
  FileX, 
  CreditCard, 
  X, 
  RefreshCw,
  Home,
  LogIn
} from 'lucide-react';
import Button from './Button';
import Card from './Card';
import type { ErrorDetails, ErrorType } from '../hooks/useErrorHandler';

interface ErrorNotificationProps {
  error: ErrorDetails | null;
  onClear: () => void;
  onRetry?: () => Promise<void>;
  className?: string;
  showAsModal?: boolean;
}

const ErrorIcon: React.FC<{ type: ErrorType; className?: string }> = ({ type, className = "w-6 h-6" }) => {
  switch (type) {
    case 'network':
      return <WifiOff className={`${className} text-orange-600`} />;
    case 'authentication':
      return <Shield className={`${className} text-red-600`} />;
    case 'authorization':
      return <ShieldAlert className={`${className} text-red-600`} />;
    case 'validation':
      return <AlertTriangle className={`${className} text-yellow-600`} />;
    case 'timeout':
      return <Clock className={`${className} text-blue-600`} />;
    case 'server':
      return <Server className={`${className} text-red-600`} />;
    case 'not_found':
      return <FileX className={`${className} text-gray-600`} />;
    case 'storage':
      return <FileX className={`${className} text-orange-600`} />;
    case 'payment':
      return <CreditCard className={`${className} text-purple-600`} />;
    default:
      return <AlertTriangle className={`${className} text-gray-600`} />;
  }
};

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onClear,
  onRetry,
  className = '',
  showAsModal = false,
}) => {
  // 自動で一部のエラーをクリア（validation エラーなど）
  useEffect(() => {
    if (error && error.severity === 'low' && error.type === 'validation') {
      const timer = setTimeout(() => {
        onClear();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, onClear]);

  if (!error) return null;

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'low':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          button: 'bg-yellow-600 hover:bg-yellow-700',
        };
      case 'medium':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-800',
          button: 'bg-orange-600 hover:bg-orange-700',
        };
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          button: 'bg-red-600 hover:bg-red-700',
        };
      case 'critical':
        return {
          bg: 'bg-red-100',
          border: 'border-red-300',
          text: 'text-red-900',
          button: 'bg-red-700 hover:bg-red-800',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          button: 'bg-gray-600 hover:bg-gray-700',
        };
    }
  };

  const colors = getSeverityColors(error.severity);

  const getActionButtons = () => {
    const buttons = [];

    // リトライボタン
    if (error.retryable && onRetry) {
      buttons.push(
        <Button
          key="retry"
          size="sm"
          onClick={onRetry}
          className={colors.button}
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          再試行
        </Button>
      );
    }

    // 認証エラーの場合はログインボタン
    if (error.type === 'authentication') {
      buttons.push(
        <Button
          key="login"
          size="sm"
          onClick={() => window.location.href = '/login'}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <LogIn className="w-4 h-4 mr-1" />
          ログイン
        </Button>
      );
    }

    // ホームに戻るボタン（重要なエラーの場合）
    if (error.severity === 'high' || error.severity === 'critical') {
      buttons.push(
        <Button
          key="home"
          size="sm"
          variant="secondary"
          onClick={() => window.location.href = '/'}
        >
          <Home className="w-4 h-4 mr-1" />
          ホームに戻る
        </Button>
      );
    }

    // 閉じるボタン
    buttons.push(
      <Button
        key="close"
        size="sm"
        variant="secondary"
        onClick={onClear}
      >
        <X className="w-4 h-4 mr-1" />
        閉じる
      </Button>
    );

    return buttons;
  };

  const content = (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <ErrorIcon type={error.type} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`text-sm font-medium ${colors.text} mb-1`}>
                エラーが発生しました
              </h3>
              <p className={`text-sm ${colors.text} mb-3`}>
                {error.userMessage}
              </p>
              
              {/* 開発環境でのみ技術的詳細を表示 */}
              {import.meta.env.DEV && (
                <details className="mt-2">
                  <summary className={`text-xs ${colors.text} cursor-pointer hover:underline`}>
                    技術的詳細を表示
                  </summary>
                  <div className={`mt-2 p-2 bg-white bg-opacity-50 rounded text-xs ${colors.text} font-mono`}>
                    <p><strong>Type:</strong> {error.type}</p>
                    <p><strong>Severity:</strong> {error.severity}</p>
                    <p><strong>Message:</strong> {error.message}</p>
                    <p><strong>Timestamp:</strong> {error.timestamp.toISOString()}</p>
                    {error.context && (
                      <p><strong>Context:</strong> {JSON.stringify(error.context, null, 2)}</p>
                    )}
                  </div>
                </details>
              )}
            </div>
            {!showAsModal && (
              <button
                onClick={onClear}
                className={`ml-2 ${colors.text} hover:opacity-75`}
                aria-label="エラーを閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex flex-wrap gap-2 mt-3">
            {getActionButtons()}
          </div>
        </div>
      </div>
    </div>
  );

  // モーダル表示の場合
  if (showAsModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="max-w-md w-full">
          {content}
        </Card>
      </div>
    );
  }

  return content;
};

export default ErrorNotification; 
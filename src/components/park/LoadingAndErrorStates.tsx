import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '../Button';

interface LoadingStateProps {
  message?: string;
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function LoadingState({ message = 'データを読み込み中...' }: LoadingStateProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">エラーが発生しました</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={onRetry} className="inline-flex items-center">
          <RefreshCw className="w-4 h-4 mr-2" />
          再試行
        </Button>
      </div>
    </div>
  );
} 
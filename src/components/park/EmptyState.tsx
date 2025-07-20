// EmptyState.tsx - 空の状態を表示するコンポーネント
import { AlertCircle, MapPin, Search } from 'lucide-react';
import { ReactNode } from 'react';
import Button from '../Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className = '' 
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="mb-4 text-gray-400">
        {icon || <Search className="w-16 h-16" />}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-600 max-w-md mb-6">
          {description}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// よく使用される事前定義された EmptyState コンポーネント
export function NoParksFound({ onReset }: { onReset?: () => void }) {
  return (
    <EmptyState
      icon={<MapPin className="w-16 h-16" />}
      title="ドッグパークが見つかりません"
      description="検索条件を変更するか、フィルターをリセットしてもう一度お試しください。"
      action={onReset ? {
        label: "フィルターをリセット",
        onClick: onReset
      } : undefined}
    />
  );
}

export function NoFacilitiesFound({ onReset }: { onReset?: () => void }) {
  return (
    <EmptyState
      icon={<Search className="w-16 h-16" />}
      title="施設が見つかりません"
      description="検索条件に一致する施設がありません。別のキーワードで検索してみてください。"
      action={onReset ? {
        label: "検索をリセット",
        onClick: onReset
      } : undefined}
    />
  );
}

export function LoadingError({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<AlertCircle className="w-16 h-16 text-red-400" />}
      title="データの読み込みに失敗しました"
      description="ネットワーク接続を確認してから、もう一度お試しください。"
      action={onRetry ? {
        label: "再試行",
        onClick: onRetry
      } : undefined}
    />
  );
}

export default EmptyState;

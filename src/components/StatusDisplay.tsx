import React from 'react';
import { AccessLog } from '../types/pinCode';
import { 
  Lock, 
  LogIn, 
  LogOut, 
  CheckCircle, 
  RotateCw,
  Clock,
  AlertCircle
} from 'lucide-react';

interface StatusDisplayProps {
  status: AccessLog['status'] | null;
  pinType?: 'entry' | 'exit';
  className?: string;
  showDetails?: boolean;
  usedAt?: Date;
  expiresAt?: Date;
}

/**
 * AccessLogのステータスを表示するコンポーネント
 */
export const StatusDisplay: React.FC<StatusDisplayProps> = ({ 
  status, 
  pinType,
  className = '',
  showDetails = false,
  usedAt,
  expiresAt
}) => {
  // ステータスごとの表示設定
  const statusConfig = {
    issued: {
      text: 'まだ使われていません',
      icon: Lock,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      iconColor: 'text-gray-400'
    },
    entered: {
      text: '入場中',
      icon: LogIn,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600'
    },
    exit_requested: {
      text: '退場PINを使用してください',
      icon: RotateCw,
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600'
    },
    exited: {
      text: '退場完了しました',
      icon: CheckCircle,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600'
    }
  };

  // ステータスが設定されていない場合
  if (!status) {
    return (
      <div className={`flex items-center p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <AlertCircle className="w-5 h-5 text-gray-400 mr-3" />
        <span className="text-gray-500">ステータス情報がありません</span>
      </div>
    );
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div 
      className={`
        p-4 rounded-lg border-2 transition-all
        ${config.bgColor} ${config.borderColor}
        ${className}
      `}
    >
      <div className="flex items-center">
        <div className={`p-2 rounded-full ${config.bgColor} mr-3`}>
          <Icon className={`w-6 h-6 ${config.iconColor}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center">
            <span className={`font-semibold ${config.color}`}>
              {config.text}
            </span>
            {pinType && (
              <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                pinType === 'entry' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {pinType === 'entry' ? '入場用' : '退場用'}
              </span>
            )}
          </div>
          
          {showDetails && (
            <div className="mt-2 space-y-1">
              {usedAt && (
                <div className="flex items-center text-xs text-gray-600">
                  <Clock className="w-3 h-3 mr-1" />
                  使用日時: {new Date(usedAt).toLocaleString('ja-JP')}
                </div>
              )}
              {expiresAt && status === 'issued' && (
                <div className="flex items-center text-xs text-gray-600">
                  <Clock className="w-3 h-3 mr-1" />
                  有効期限: {new Date(expiresAt).toLocaleString('ja-JP')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 簡易版ステータス表示（インライン表示用）
 */
export const StatusBadge: React.FC<{ status: AccessLog['status'] | null }> = ({ status }) => {
  const statusMap = {
    issued: { text: '未使用', color: 'bg-gray-100 text-gray-700' },
    entered: { text: '入場中', color: 'bg-blue-100 text-blue-700' },
    exit_requested: { text: '退場待ち', color: 'bg-yellow-100 text-yellow-700' },
    exited: { text: '退場済', color: 'bg-green-100 text-green-700' }
  };

  if (!status) {
    return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500">不明</span>;
  }

  const config = statusMap[status];
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.text}
    </span>
  );
};

export default StatusDisplay;

import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Clock, History, ArrowRight } from 'lucide-react';
import { useAccessLog } from '../../hooks/useAccessLog';
import { StatusDisplay, StatusBadge } from '../StatusDisplay';
import Card from '../Card';
import Button from '../Button';

/**
 * ダッシュボードに表示するアクセスステータスカード
 */
export const AccessStatusCard: React.FC = () => {
  const { currentLog, recentLogs, isLoading, error } = useAccessLog();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="p-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <div className="p-6">
          <div className="flex items-center text-red-600 mb-2">
            <Shield className="w-5 h-5 mr-2" />
            <h3 className="font-semibold">エラー</h3>
          </div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              スマートロック状態
            </h3>
          </div>
          {import.meta.env.DEV && (
            <Link to="/test-pin-generator">
              <Button size="sm" variant="outline">
                テスト画面
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>

        {/* 現在のステータス */}
        {currentLog ? (
          <div className="space-y-4">
            <StatusDisplay
              status={currentLog.status}
              pinType={currentLog.pin_type}
              showDetails={true}
              usedAt={currentLog.used_at ? new Date(currentLog.used_at) : undefined}
              expiresAt={currentLog.expires_at ? new Date(currentLog.expires_at) : undefined}
            />

            {/* アクションボタン */}
            {currentLog.status === 'entered' && (
              <div className="pt-2">
                <p className="text-sm text-gray-600 mb-2">
                  退場する際は、退場用のPINを発行してください
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              まだPINを発行していません
            </p>
            <p className="text-sm text-gray-400 mt-1">
              ドッグランをご利用の際はPINを発行してください
            </p>
          </div>
        )}

        {/* 最近の履歴 */}
        {recentLogs.length > 1 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center mb-3">
              <History className="w-4 h-4 text-gray-500 mr-2" />
              <h4 className="text-sm font-medium text-gray-700">
                最近の利用履歴
              </h4>
            </div>
            <div className="space-y-2">
              {recentLogs.slice(1, 4).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <StatusBadge status={log.status} />
                    <span className="text-xs text-gray-600">
                      {log.pin_type === 'entry' ? '入場' : '退場'}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(log.issued_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AccessStatusCard;

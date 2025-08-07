import { AlertCircle, Clock, Key, LogIn, LogOut, RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { CreatePinParams, CreatePinResponse } from '../types/pinCode';
import { createSmartLockPin, createMockPin, generateRandomPin } from '../utils/scienerApi';
import { useAccessLog, createAccessLog } from '../hooks/useAccessLog';
import { StatusDisplay } from './StatusDisplay';
import Button from './Button';
import Card from './Card';

interface PinGeneratorProps {
  lockId: string;
  lockName: string;
  userId: string;
  dogId?: string;
  dogRunId?: string;
}

export const PinGenerator: React.FC<PinGeneratorProps> = ({ lockId, lockName, userId, dogId, dogRunId }) => {
  const [pinType, setPinType] = useState<'entry' | 'exit'>('entry');
  const [currentPin, setCurrentPin] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  // AccessLogの取得
  const { currentLog, isLoading: isLoadingLog, refetch: refetchLogs } = useAccessLog(lockId);

  // カウントダウンタイマーの更新
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      
      setRemainingTime(remaining);
      
      if (remaining === 0) {
        setIsExpired(true);
        setCurrentPin('');
      }
    };

    updateTimer(); // 初回実行
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // PIN生成処理（開発環境ではモック、本番環境では実際のSciener API）
  const generatePin = async (type: 'entry' | 'exit'): Promise<CreatePinResponse> => {
    // 6桁のランダムPINを生成
    const pin = generateRandomPin();
    
    // 有効期限の設定（現在時刻から5分後）
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMinutes(endDate.getMinutes() + 5);

    // APIパラメータの構築
    const params: CreatePinParams = {
      clientId: import.meta.env.VITE_SCIENER_CLIENT_ID || 'mock_client_id',
      accessToken: import.meta.env.VITE_SCIENER_ACCESS_TOKEN || 'mock_access_token',
      lockId: lockId, // プロパティから受け取ったlockId
      keyboardPwd: pin,
      startDate,
      endDate,
      pinType: type
    };

    // 開発環境ではモックAPI、本番環境では実際のSciener APIを使用
    if (import.meta.env.DEV || !import.meta.env.VITE_SCIENER_CLIENT_ID) {
      console.log('📝 Using mock PIN generation (development mode)');
      return await createMockPin(params);
    } else {
      console.log('🔐 Using Sciener API for PIN generation');
      return await createSmartLockPin(params);
    }
  };

  // PIN発行処理
  const handleGeneratePin = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setIsExpired(false);

    try {
      // PIN生成API呼び出し
      const response = await generatePin(pinType);

      if (response.success && response.keyboardPwd && response.endDate) {
        setCurrentPin(response.keyboardPwd);
        setExpiresAt(response.endDate);
        
        // AccessLogを作成
        const logData = {
          user_id: userId,
          lock_id: lockId,
          pin: response.keyboardPwd,
          pin_type: pinType,
          status: pinType === 'entry' ? 'issued' as const : 'exit_requested' as const,
          issued_at: new Date(),
          expires_at: response.endDate,
          keyboard_pwd_id: response.keyboardPwdId,
          dog_id: dogId,
          dog_run_id: dogRunId
        };
        
        const createdLog = await createAccessLog(logData);
        if (createdLog) {
          console.log('✅ AccessLog created:', createdLog);
          // ログを再取得して表示を更新
          await refetchLogs();
        }
        
        // 成功ログ
        console.log('✅ PIN generated successfully:', {
          pin: response.keyboardPwd,
          keyboardPwdId: response.keyboardPwdId,
          expiresAt: response.endDate
        });
      } else {
        setError(response.error || response.message || 'PIN発行に失敗しました');
      }
    } catch (err) {
      setError('PIN発行中にエラーが発生しました');
      console.error('PIN generation error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pinType, refetchLogs]);

  // 時間フォーマット（MM:SS形式）
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 入場中かどうかを判定
  const isEntered = currentLog?.status === 'entered';
  
  // PINタイプを自動設定（入場中なら退場、そうでなければ入場）
  useEffect(() => {
    if (isEntered && pinType === 'entry') {
      setPinType('exit');
    } else if (!isEntered && pinType === 'exit') {
      setPinType('entry');
    }
  }, [isEntered]);

  return (
    <Card className="max-w-md mx-auto">
      <div className="p-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <Key className="w-6 h-6 mr-2 text-blue-600" />
            スマートロック PIN発行
          </h2>
          <p className="text-sm text-gray-600">
            ロック名: {lockName}
          </p>
        </div>

        {/* 現在のステータス表示 */}
        {!isLoadingLog && currentLog && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">現在の状態</h3>
            <StatusDisplay 
              status={currentLog.status} 
              pinType={currentLog.pin_type}
              showDetails={true}
              usedAt={currentLog.used_at ? new Date(currentLog.used_at) : undefined}
              expiresAt={currentLog.expires_at ? new Date(currentLog.expires_at) : undefined}
            />
          </div>
        )}

        {/* 入場/退場切り替えタブ */}
        <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setPinType('entry')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-all ${
              pinType === 'entry'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <LogIn className="w-4 h-4 mr-2" />
            入場用PIN
          </button>
          <button
            onClick={() => setPinType('exit')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-all ${
              pinType === 'exit'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <LogOut className="w-4 h-4 mr-2" />
            退場用PIN
          </button>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* PIN表示エリア */}
        {currentPin && !isExpired ? (
          <div className="mb-6">
            {/* PINコード表示 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  {pinType === 'entry' ? '入場用' : '退場用'}PINコード
                </p>
                <div className="text-4xl font-bold text-blue-900 tracking-wider">
                  {currentPin.split('').map((digit, index) => (
                    <span key={index} className="inline-block mx-1">
                      {digit}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* カウントダウンタイマー */}
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="text-sm font-medium text-yellow-800">
                    有効期限
                  </span>
                </div>
                <span className={`text-lg font-bold ${
                  remainingTime < 60 ? 'text-red-600' : 'text-yellow-800'
                }`}>
                  残り {formatTime(remainingTime)}
                </span>
              </div>
              {remainingTime < 60 && (
                <p className="text-xs text-red-600 mt-2">
                  まもなく有効期限が切れます
                </p>
              )}
            </div>

            {/* 使用方法 */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">使用方法：</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. スマートロックのキーパッドをタッチして起動</li>
                <li>2. 上記の6桁のPINコードを入力</li>
                <li>3. #（シャープ）キーを押して確定</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            {/* PIN未発行または期限切れの状態 */}
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-1">
                {isExpired ? 'PINの有効期限が切れました' : 'PINが発行されていません'}
              </p>
              <p className="text-sm text-gray-500">
                ボタンを押してPINを{isExpired ? '再' : ''}発行してください
              </p>
            </div>
          </div>
        )}

        {/* 発行/再発行ボタン */}
        <Button
          onClick={handleGeneratePin}
          disabled={isLoading || (!!currentPin && !isExpired)}
          className={`w-full ${
            isExpired 
              ? 'bg-orange-600 hover:bg-orange-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              発行中...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              {isExpired || !currentPin ? (
                <>
                  <Key className="w-5 h-5 mr-2" />
                  {isExpired ? 'PINを再発行' : 'PINを発行'}
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  発行済み（{formatTime(remainingTime)}）
                </>
              )}
            </span>
          )}
        </Button>

        {/* 注意事項 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">注意事項：</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• PINコードは1回限り有効です</li>
            <li>• 有効期限は発行から5分間です</li>
            <li>• 他の人にPINを教えないでください</li>
            <li>• 入場と退場で異なるPINが必要です</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default PinGenerator;

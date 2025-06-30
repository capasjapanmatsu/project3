import { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { Clock, Key, Copy, CheckCircle, AlertTriangle, RefreshCw, QrCode, CreditCard, Calendar } from 'lucide-react';
import type { Reservation } from '../types';

interface PinCodeGeneratorProps {
  lockId: string;
  parkName?: string;
  purpose?: 'entry' | 'exit';
  className?: string;
  onSuccess?: (pin: string) => void;
  onError?: (error: string) => void;
  reservationId?: string;
}

export function PinCodeGenerator({
  lockId,
  parkName = 'ドッグパーク',
  purpose = 'entry',
  className = '',
  onSuccess,
  onError,
  reservationId
}: PinCodeGeneratorProps) {
  const { user } = useAuth();
  const [pin, setPin] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showPaymentRequired, setShowPaymentRequired] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string>('');

  // PINコードの有効期限（5分）
  const PIN_EXPIRATION_MINUTES = 5;

  // 予約情報を取得する関数
  const getReservationInfo = async (reservationId: string): Promise<Reservation | null> => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          dog_park:dog_parks(*),
          dog:dogs(*)
        `)
        .eq('id', reservationId)
        .single();

      if (error) {
        console.error('Error fetching reservation:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error fetching reservation:', err);
      return null;
    }
  };

  // 予約の終了時刻を計算する関数
  const calculateReservationEndTime = (reservation: Reservation): Date | null => {
    try {
      const reservationDate = new Date(reservation.date);
      const [startHour, startMinute] = reservation.start_time.split(':').map(Number);
      
      // 予約日の開始時刻を設定
      reservationDate.setHours(startHour, startMinute, 0, 0);
      
      // 予約時間を加算して終了時刻を計算
      const endTime = new Date(reservationDate.getTime() + (reservation.duration * 60 * 60 * 1000));
      
      return endTime;
    } catch (err) {
      console.error('Error calculating reservation end time:', err);
      return null;
    }
  };

  useEffect(() => {
    // PINコードの残り時間を計算
    if (pin && expiresAt) {
      const timer = setInterval(() => {
        const now = new Date();
        const diffMs = expiresAt.getTime() - now.getTime();
        
        if (diffMs <= 0) {
          // 有効期限切れ
          setTimeLeft('期限切れ');
          setPin(null);
          setExpiresAt(null);
          clearInterval(timer);
        } else {
          // 残り時間を分:秒形式で表示
          const diffMins = Math.floor(diffMs / 60000);
          const diffSecs = Math.floor((diffMs % 60000) / 1000);
          setTimeLeft(`${diffMins}:${diffSecs.toString().padStart(2, '0')}`);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [pin, expiresAt]);

  const generatePin = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('認証が必要です');
      }

      // 予約情報を取得してPINの有効期間を決定
      let expiryMinutes = PIN_EXPIRATION_MINUTES;
      let reservationEndTime: Date | null = null;

      if (reservationId) {
        const reservation = await getReservationInfo(reservationId);
        if (reservation && reservation.reservation_type === 'whole_facility') {
          // 貸し切り予約の場合は予約時間いっぱい有効にする
          reservationEndTime = calculateReservationEndTime(reservation);
          if (reservationEndTime) {
            const now = new Date();
            const diffMs = reservationEndTime.getTime() - now.getTime();
            expiryMinutes = Math.max(1, Math.ceil(diffMs / (1000 * 60))); // 最低1分
          }
        }
      }

      // Edge Functionを呼び出してPINを生成
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lock_id: lockId,
          purpose: purpose,
          expiry_minutes: expiryMinutes,
          reservation_id: reservationId || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PINコードの生成に失敗しました');
      }

      const { pin: newPin, expires_at } = await response.json();
      
      setPin(newPin);
      setExpiresAt(new Date(expires_at));
      setShowSuccessMessage(true);
      
      // 成功コールバック
      if (onSuccess) onSuccess(newPin);
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error generating PIN:', err);
      
      // 決済が必要な場合の特別なハンドリング
      if (err.message && err.message.startsWith('PAYMENT_REQUIRED:')) {
        const message = err.message.replace('PAYMENT_REQUIRED:', '').trim();
        setPaymentMessage(message);
        setShowPaymentRequired(true);
        setError(null);
      } else {
        setError(err.message || 'PINコードの生成に失敗しました');
        setShowPaymentRequired(false);
      }
      
      // エラーコールバック
      if (onError) onError(err.message || 'PINコードの生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPin = () => {
    if (!pin) return;
    
    navigator.clipboard.writeText(pin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4 flex items-center justify-center">
          <Key className="w-5 h-5 text-blue-600 mr-2" />
          {parkName}の{purpose === 'entry' ? '入口' : '出口'}
        </h3>
        
        {pin ? (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 mx-auto">
              <p className="text-sm text-blue-800 mb-1">PINコード:</p>
              <div className="flex items-center justify-center space-x-2">
                <p className="text-3xl font-bold tracking-widest text-blue-700">{pin}</p>
                <button 
                  onClick={copyPin}
                  className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                  title="コピー"
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-2 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-yellow-800">
                <Clock className="w-4 h-4" />
                <span className="font-medium">有効期限: {timeLeft}</span>
              </div>
            </div>
            
            <div className="flex justify-center space-x-3">
              <Button
                onClick={generatePin}
                variant="secondary"
                size="sm"
                isLoading={isGenerating}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                再生成
              </Button>
            </div>
            
            <p className="text-xs text-gray-500">
              {purpose === 'entry' ? '入場' : '退場'}時にスマートロックのキーパッドに上記のPINコードを入力してください
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              {purpose === 'entry' ? '入場' : '退場'}用のPINコードを生成します。<br />
              生成されたPINコードは5分間有効です。
            </p>
            
            {error && (
              <div className="bg-red-50 p-3 rounded-lg flex items-center justify-center text-red-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                <span>{error}</span>
              </div>
            )}
            
            {showPaymentRequired && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3 mb-4">
                  <CreditCard className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">決済が必要です</h3>
                    <p className="text-sm text-blue-800 mb-4">{paymentMessage}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Button
                    onClick={() => window.location.href = '/subscription'}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    サブスクリプションに加入（¥3,800/月）
                  </Button>
                  
                  <Button
                    onClick={() => window.location.href = '/parks'}
                    variant="secondary"
                    className="w-full"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    1日券を購入（¥800）
                  </Button>
                </div>
                
                <p className="text-xs text-blue-700 mt-3">
                  • サブスクリプション：全国のドッグランが使い放題<br/>
                  • 1日券：選択したドッグランで24時間利用可能
                </p>
              </div>
            )}
            
            {showSuccessMessage && (
              <div className="bg-green-50 p-3 rounded-lg flex items-center justify-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span>PINコードを生成しました</span>
              </div>
            )}
            
            <Button
              onClick={generatePin}
              isLoading={isGenerating}
              className="w-full"
            >
              <Key className="w-4 h-4 mr-2" />
              {purpose === 'entry' ? '入場' : '退場'}用PINを生成
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
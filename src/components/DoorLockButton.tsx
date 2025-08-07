import { AlertTriangle, Calendar, CheckCircle, CreditCard, Key, Loader } from 'lucide-react';
import { useEffect, useState } from 'react';
import useAuth from '../context/AuthContext';
import type { Reservation } from '../types';
import { supabase } from '../utils/supabase';
import Button from './Button';

interface DoorLockButtonProps {
  lockId: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string;
  showStatus?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  reservationId?: string;
}

export function DoorLockButton({
  lockId,
  className = '',
  variant = 'primary',
  size = 'md',
  label = 'ドアを開ける',
  showStatus = true,
  onSuccess,
  onError,
  reservationId
}: DoorLockButtonProps) {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPaymentRequired, setShowPaymentRequired] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string>('');

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

      return data as Reservation;
    } catch (err) {
      console.error('Error fetching reservation:', err);
      return null;
    }
  };

  // 予約の終了時刻を計算する関数
  const calculateReservationEndTime = (reservation: Reservation): Date | null => {
    try {
      const reservationDate = new Date(reservation.date);
      const timeParts = reservation.start_time.split(':').map(Number);
      const startHour = timeParts[0] ?? 0;
      const startMinute = timeParts[1] ?? 0;
      
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
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error]);

  const handleOpenLock = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    
    try {
      // PINコードを生成するエンドポイントを呼び出す
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('認証が必要です');
      }

      // 予約情報を取得してPINの有効期間を決定
      let expiryMinutes = 5; // デフォルト5分
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

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lock_id: lockId,
          purpose: 'entry',
          expiry_minutes: expiryMinutes,
          reservation_id: reservationId || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'PINコードの生成に失敗しました');
      }

      const { pin } = await response.json() as { pin: string };
      
      // PINコードを表示
      alert(`PINコード: ${pin}\n\nこのPINコードをスマートロックのキーパッドに入力してください。`);
      
      setSuccess(pin);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error generating PIN:', err);
      // 決済が必要な場合の特別なハンドリング
      if ((err as Error).message && (err as Error).message.startsWith('PAYMENT_REQUIRED:')) {
        const message = (err as Error).message.replace('PAYMENT_REQUIRED:', '').trim();
        setPaymentMessage(message);
        setShowPaymentRequired(true);
        setError(null);
      } else {
        setError((err as Error).message || 'PINコードの生成に失敗しました');
        setShowPaymentRequired(false);
      }
      if (onError) onError((err as Error).message || 'PINコードの生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={() => void handleOpenLock()}
        isLoading={isGenerating}
        variant={variant}
        size={size}
        className={`flex items-center ${className}`}
      >
        {isGenerating ? (
          <Loader className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Key className="w-4 h-4 mr-2" />
        )}
        {label}
      </Button>
      
      {showStatus && (
        <>
          {success && (
            <div className="flex items-center text-green-600 text-sm mt-1">
              <CheckCircle className="w-4 h-4 mr-1" />
              <span>PINコードを生成しました</span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center text-red-600 text-sm mt-1">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span>{error}</span>
            </div>
          )}
          
          {showPaymentRequired && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-2">
              <div className="flex items-start space-x-2 mb-3">
                <CreditCard className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">決済が必要です</h4>
                  <p className="text-sm text-blue-800">{paymentMessage}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button
                  onClick={() => window.location.href = '/subscription-intro'}
                  size="sm"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  サブスク加入
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/parks'}
                  size="sm"
                  variant="secondary"
                  className="w-full"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  1Dayパス購入
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

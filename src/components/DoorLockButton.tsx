import { useState, useEffect } from 'react';
import Button from './Button';
import { useAuth } from '../context/AuthContext';
import { Unlock, AlertTriangle, CheckCircle, Loader, Key } from 'lucide-react';
import { supabase } from '../utils/supabase';
import type { Reservation } from '../types';

interface DoorLockButtonProps {
  lockId: string;
  authToken?: string;
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
  authToken,
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleOpenLock = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // PINコードを生成するエンドポイントを呼び出す
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'PINコードの生成に失敗しました');
      }

      const { pin } = await response.json();
      
      // PINコードを表示
      alert(`PINコード: ${pin}\n\nこのPINコードをスマートロックのキーパッドに入力してください。`);
      
      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error generating PIN:', err);
      setError(err.message || 'PINコードの生成に失敗しました');
      if (onError) onError(err.message || 'PINコードの生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleOpenLock}
        isLoading={loading}
        variant={variant}
        size={size}
        className={`flex items-center ${className}`}
      >
        {loading ? (
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
        </>
      )}
    </div>
  );
}
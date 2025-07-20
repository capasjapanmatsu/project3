import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Calendar, CheckCircle, Clock, Copy, CreditCard, Key, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import useAuth from '../context/AuthContext';
import type { Reservation } from '../types';
import {
    buttonVariants,
    errorShakeVariants,
    fadeInUp,
    mobileOptimizedVariants,
    pinSuccessVariants,
    scaleInVariants
} from '../utils/animations';
import { triggerNotificationHaptic, triggerPinGenerationHaptic } from '../utils/hapticFeedback';
import { supabase } from '../utils/supabase';
import Button from './Button';
import Card from './Card';

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
  const [justGenerated, setJustGenerated] = useState(false);

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
    
    return undefined;
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
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'PINコードの生成に失敗しました');
      }

      const { pin: newPin, expires_at } = await response.json() as { pin: string; expires_at: string };
      
      // 🔑 PIN発行成功時の演出開始
      setPin(newPin);
      setExpiresAt(new Date(expires_at));
      setJustGenerated(true);
      setShowSuccessMessage(true);
      
      // バイブレーション実行
      await triggerPinGenerationHaptic();
      
      // 成功コールバック
      if (onSuccess) onSuccess(newPin);
      
      // 3秒後に成功メッセージを消す & アニメーション状態をリセット
      setTimeout(() => {
        setShowSuccessMessage(false);
        setJustGenerated(false);
      }, 3000);
    } catch (err) {
      console.error('Error generating PIN:', err);
      const errorMessage = err instanceof Error ? err.message : 'PINコードの生成に失敗しました';
      
      // 決済が必要な場合の特別なハンドリング
      if (errorMessage.startsWith('PAYMENT_REQUIRED:')) {
        const message = errorMessage.replace('PAYMENT_REQUIRED:', '').trim();
        setPaymentMessage(message);
        setShowPaymentRequired(true);
        setError(null);
      } else {
        setError(errorMessage);
        setShowPaymentRequired(false);
      }
      // エラーコールバック
      if (onError) onError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPin = async () => {
    if (!pin) return;
    
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      
      // コピー時のソフトバイブレーション
      await triggerNotificationHaptic();
      
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed, but we don't need to show error for this
    }
  };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="p-4">
        <div className="text-center">
          <motion.h3 
            className="text-lg font-semibold mb-4 flex items-center justify-center"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <motion.div
              animate={justGenerated ? { rotate: [0, 15, -15, 0] } : {}}
              transition={{ duration: 0.6, repeat: 2 }}
            >
              <Key className="w-5 h-5 text-blue-600 mr-2" />
            </motion.div>
            {parkName}の{purpose === 'entry' ? '入口' : '出口'}
          </motion.h3>
          
          <AnimatePresence mode="wait">
            {pin ? (
              <motion.div 
                className="space-y-4"
                key="pin-display"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                {/* PINコード表示 */}
                <motion.div 
                  className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border-2 border-blue-200 mx-auto"
                  variants={pinSuccessVariants}
                  initial="initial"
                  animate={justGenerated ? "animate" : "initial"}
                >
                  <p className="text-sm text-blue-800 mb-1">PINコード:</p>
                  <div className="flex items-center justify-center space-x-2">
                    <motion.p 
                      className="text-3xl font-bold tracking-widest text-blue-700"
                      initial={{ scale: 1 }}
                      animate={justGenerated ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.6 }}
                    >
                      {pin}
                    </motion.p>
                    <motion.button 
                      onClick={copyPin}
                      className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                      title="コピー"
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <AnimatePresence mode="wait">
                        {copied ? (
                          <motion.div
                            key="copied"
                            variants={scaleInVariants}
                            initial="initial"
                            animate="animate"
                            exit={{ scale: 0, opacity: 0 }}
                          >
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="copy"
                            variants={scaleInVariants}
                            initial="initial"
                            animate="animate"
                            exit={{ scale: 0, opacity: 0 }}
                          >
                            <Copy className="w-5 h-5" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </motion.div>
                
                {/* 有効期限表示 */}
                <motion.div 
                  className="bg-yellow-50 p-2 rounded-lg"
                  variants={fadeInUp}
                >
                  <div className="flex items-center justify-center space-x-2 text-yellow-800">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Clock className="w-4 h-4" />
                    </motion.div>
                    <span className="font-medium">有効期限: {timeLeft}</span>
                  </div>
                </motion.div>
                
                {/* アクションボタン */}
                <div className="flex justify-center space-x-3">
                  <motion.div
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Button
                      onClick={() => void generatePin()}
                      variant="secondary"
                      size="sm"
                      isLoading={isGenerating}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      再生成
                    </Button>
                  </motion.div>
                </div>
                
                <motion.p 
                  className="text-xs text-gray-500"
                  variants={fadeInUp}
                >
                  {purpose === 'entry' ? '入場' : '退場'}時にスマートロックのキーパッドに上記のPINコードを入力してください
                </motion.p>
              </motion.div>
            ) : (
              <motion.div 
                className="space-y-4"
                key="pin-generate"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.p 
                  className="text-gray-600 mb-4"
                  variants={fadeInUp}
                >
                  {purpose === 'entry' ? '入場' : '退場'}用のPINコードを生成します。<br />
                  生成されたPINコードは5分間有効です。
                </motion.p>
                
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      className="bg-red-50 p-3 rounded-lg flex items-center justify-center text-red-600"
                      variants={errorShakeVariants}
                      initial="initial"
                      animate="shake"
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                  
                  {showPaymentRequired && (
                    <motion.div 
                      className="bg-blue-50 p-4 rounded-lg border border-blue-200"
                      variants={mobileOptimizedVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <div className="flex items-start space-x-3 mb-4">
                        <CreditCard className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                        <div>
                          <h3 className="font-semibold text-blue-900 mb-2">決済が必要です</h3>
                          <p className="text-sm text-blue-800 mb-4">{paymentMessage}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <motion.div
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <Button
                            onClick={() => window.location.href = '/subscription'}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            サブスクリプションに加入（¥3,800/月）
                          </Button>
                        </motion.div>
                        
                        <motion.div
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <Button
                            onClick={() => window.location.href = '/parks'}
                            variant="secondary"
                            className="w-full"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            1日券を購入（¥800）
                          </Button>
                        </motion.div>
                      </div>
                      
                      <p className="text-xs text-blue-700 mt-3">
                        • サブスクリプション：全国のドッグランが使い放題<br/>
                        • 1日券：選択したドッグランで24時間利用可能
                      </p>
                    </motion.div>
                  )}
                  
                  {showSuccessMessage && (
                    <motion.div 
                      className="bg-green-50 p-3 rounded-lg flex items-center justify-center text-green-600"
                      variants={scaleInVariants}
                      initial="initial"
                      animate="animate"
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      <span>🎉 PINコードを生成しました</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    onClick={() => void generatePin()}
                    isLoading={isGenerating}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    🚀 {purpose === 'entry' ? '入場' : '退場'}用PINを生成
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}
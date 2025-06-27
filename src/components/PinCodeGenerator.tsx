import { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { Clock, Key, Copy, CheckCircle, AlertTriangle, RefreshCw, QrCode } from 'lucide-react';

interface PinCodeGeneratorProps {
  lockId: string;
  parkName?: string;
  purpose?: 'entry' | 'exit';
  className?: string;
  onSuccess?: (pin: string) => void;
  onError?: (error: string) => void;
}

export function PinCodeGenerator({
  lockId,
  parkName = 'ドッグパーク',
  purpose = 'entry',
  className = '',
  onSuccess,
  onError
}: PinCodeGeneratorProps) {
  const { user } = useAuth();
  const [pin, setPin] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // PINコードの有効期限（5分）
  const PIN_EXPIRATION_MINUTES = 5;

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
          expiry_minutes: PIN_EXPIRATION_MINUTES
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
      setError(err.message || 'PINコードの生成に失敗しました');
      
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
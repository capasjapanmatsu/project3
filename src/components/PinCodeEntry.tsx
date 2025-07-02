import { useState } from 'react';
import Card from './Card';
import Button from './Button';
import { Key, CheckCircle, AlertTriangle, Loader } from 'lucide-react';

interface VerifyPinResult {
  success: boolean;
  message?: string;
  park_id?: string;
  occupancy?: unknown;
  error?: string;
}

interface PinCodeEntryProps {
  lockId: string;
  parkName?: string;
  purpose?: 'entry' | 'exit';
  className?: string;
  onSuccess?: (result: VerifyPinResult) => void;
  onError?: (error: string) => void;
}

export function PinCodeEntry({
  lockId,
  parkName = 'ドッグパーク',
  purpose = 'entry',
  className = '',
  onSuccess,
  onError
}: PinCodeEntryProps) {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 数字のみ許可
    const value = e.target.value.replace(/\D/g, '');
    // 最大6桁
    if (value.length <= 6) {
      setPin(value);
    }
  };

  const verifyPin = async () => {
    if (pin.length !== 6) {
      setError('PINコードは6桁で入力してください');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lock_id: lockId,
          pin,
          purpose
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PINコードの検証に失敗しました');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'PINコードが無効です');
      }
      
      setSuccess(result.message || 'PINコードが確認されました');
      setPin('');
      
      // 成功コールバック
      if (onSuccess) onSuccess(result);
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error verifying PIN:', err);
      const message = (err as Error).message || 'PINコードの検証に失敗しました';
      setError(message);
      // エラーコールバック
      if (onError) onError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4 flex items-center justify-center">
          <Key className="w-5 h-5 text-blue-600 mr-2" />
          {parkName}の{purpose === 'entry' ? '入口' : '出口'}
        </h3>
        
        <div className="space-y-4">
          <p className="text-gray-600 mb-4">
            {purpose === 'entry' ? '入場' : '退場'}用のPINコードを入力してください
          </p>
          
          <div className="flex justify-center">
            <input
              type="text"
              value={pin}
              onChange={handlePinChange}
              placeholder="6桁のPINコード"
              className="px-4 py-2 text-center text-2xl tracking-widest w-48 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>
          
          {error && (
            <div className="bg-red-50 p-3 rounded-lg flex items-center justify-center text-red-600">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 p-3 rounded-lg flex items-center justify-center text-green-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              <span>{success}</span>
            </div>
          )}
          
          <Button
            onClick={verifyPin}
            isLoading={isVerifying}
            disabled={pin.length !== 6}
            className="w-full"
          >
            <Key className="w-4 h-4 mr-2" />
            {isVerifying ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              'PINコードを確認'
            )}
          </Button>
          
          <p className="text-xs text-gray-500">
            {purpose === 'entry' ? '入場' : '退場'}時にスマートロックのキーパッドに上記のPINコードを入力してください
          </p>
        </div>
      </div>
    </Card>
  );
}
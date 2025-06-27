import { useState, useEffect } from 'react';
import { Button } from './Button';
import { useAuth } from '../context/AuthContext';
import { Unlock, AlertTriangle, CheckCircle, Loader, Key } from 'lucide-react';
import { supabase } from '../utils/supabase';

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
  onError
}: DoorLockButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lock_id: lockId,
          purpose: 'entry',
          expiry_minutes: 5
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
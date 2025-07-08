import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft,
  Key,
  PawPrint
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';

export function PaymentConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'processing'>('processing');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Check payment status from URL params
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');
    
    if (status === 'success' && sessionId) {
      setPaymentStatus('success');
    } else if (status === 'cancel') {
      setPaymentStatus('failed');
    } else {
      setPaymentStatus('processing');
    }
    
    setIsLoading(false);
  }, [searchParams]);

  useEffect(() => {
    if (paymentStatus === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (paymentStatus === 'success' && countdown === 0) {
      // Auto redirect to access control page after 5 seconds
      navigate('/access-control');
    }
  }, [paymentStatus, countdown, navigate]);

  const handleAccessControl = () => {
    navigate('/access-control');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(-1)}
          className="mr-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>
        <h1 className="text-2xl font-bold">決済確認</h1>
      </div>

      {paymentStatus === 'success' && (
        <Card className="text-center p-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-4">決済が完了しました！</h2>
          <p className="text-gray-600 mb-6">
            ありがとうございます。決済が正常に処理されました。
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Key className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">次のステップ</span>
            </div>
            <p className="text-sm text-blue-800">
              入場にはPINコードが必要です。下のボタンからPINコードを生成してください。
            </p>
          </div>

          <Button 
            onClick={handleAccessControl}
            className="w-full bg-blue-600 hover:bg-blue-700 mb-4"
          >
            <Key className="w-5 h-5 mr-2" />
            PINコードを生成する
          </Button>

          <p className="text-sm text-gray-500">
            {countdown > 0 && 
              `${countdown}秒後に自動的にPINコード生成画面に移動します...`
            }
          </p>
        </Card>
      )}

      {paymentStatus === 'failed' && (
        <Card className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-4">決済がキャンセルされました</h2>
          <p className="text-gray-600 mb-6">
            決済がキャンセルまたは失敗しました。再度お試しください。
          </p>
          
          <div className="bg-yellow-50 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <PawPrint className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-900">ドッグランを利用するには</span>
            </div>
            <p className="text-sm text-yellow-800">
              入場にはPINコードが必要です。決済完了後にPINコードを生成できます。
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/parks')}
              className="w-full"
            >
              ドッグラン一覧に戻る
            </Button>
            <Button 
              variant="secondary"
              onClick={() => navigate('/subscription')}
              className="w-full"
            >
              サブスクリプションを検討する
            </Button>
          </div>
        </Card>
      )}

      {paymentStatus === 'processing' && (
        <Card className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-4">決済を処理中...</h2>
          <p className="text-gray-600">
            しばらくお待ちください。決済の処理が完了するまでお時間をいただく場合があります。
          </p>
        </Card>
      )}
    </div>
  );
}
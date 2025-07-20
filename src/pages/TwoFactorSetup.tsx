import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';

export default function TwoFactorSetup() {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const enroll2FA = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('2FA enrollment を開始...');
        
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          issuer: 'DogParkJP',
          friendlyName: 'DogPark Device',
        });
        
        if (error) {
          console.error('MFA enrollment エラー:', error);
          throw new Error(`2FA登録に失敗しました: ${error.message}`);
        }
        
        console.log('MFA enrollment 成功:', data);
        
        if (!data || !data.totp || !data.totp.qr_code) {
          throw new Error('QRコードの生成に失敗しました');
        }
        
        setQrUrl(data.totp.qr_code);
        setFactorId(data.id);
        
      } catch (err: any) {
        console.error('2FA セットアップエラー:', err);
        setError(err.message || '2FAセットアップに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    
    enroll2FA();
  }, []);

  const handleNext = () => {
    if (factorId) {
      navigate(`/two-factor-verify?factorId=${factorId}`);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <div className="flex items-center mb-4">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => navigate('/profile-settings')}
          className="mr-3"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          戻る
        </Button>
        <h2 className="text-xl font-semibold">2ファクタ認証セットアップ</h2>
      </div>
      
      {isLoading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>2FAセットアップを準備中...</p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
          <Button 
            variant="secondary" 
            onClick={() => navigate('/profile-settings')}
            className="mt-3"
          >
            プロフィール設定に戻る
          </Button>
        </div>
      )}
      
      {qrUrl && !isLoading && !error && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 mb-2">
              <strong>手順：</strong>
            </p>
            <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
              <li>認証アプリ（Google Authenticator等）を開く</li>
              <li>「アカウント追加」→「QRコードをスキャン」を選択</li>
              <li>下のQRコードをスキャン</li>
              <li>「次へ」ボタンで認証コードを入力</li>
            </ol>
          </div>
          
          <div className="text-center">
            <p className="mb-3 font-medium">QRコードをスキャンしてください：</p>
            <div className="flex justify-center mb-4">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}`}
                alt="2FA QR Code"
                className="border border-gray-300 rounded"
              />
            </div>
            <p className="text-xs text-gray-600 mb-4">
              QRコードをスキャンできない場合は、手動でキーを入力してください
            </p>
            <Button onClick={handleNext} className="w-full">
              次へ（認証コード入力）
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 

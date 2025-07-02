import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import QRCode from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

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
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          issuer: 'DogParkJP',
          friendlyName: 'My Device',
        });
        if (error) throw error;
        setQrUrl(data?.totp?.qr_code || null);
        setFactorId(data?.id || null);
      } catch (err: any) {
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
      <h2 className="text-xl font-semibold mb-4">2ファクタ認証セットアップ</h2>
      {isLoading && <p>読み込み中...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {qrUrl && (
        <>
          <p className="mb-2">認証アプリでQRコードをスキャンしてください。</p>
          <div className="flex justify-center mb-4">
            <QRCode value={qrUrl} size={180} />
          </div>
          <Button onClick={handleNext}>次へ（認証コード入力）</Button>
        </>
      )}
    </div>
  );
} 
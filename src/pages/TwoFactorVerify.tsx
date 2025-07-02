import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import Button from '../components/Button';
import React from 'react';

export default function TwoFactorVerify() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengeReady, setChallengeReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // factorIdはクエリパラメータから取得
  const params = new URLSearchParams(location.search);
  const factorId = params.get('factorId');

  // チャレンジを作成
  React.useEffect(() => {
    const createChallenge = async () => {
      if (!factorId) return;
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.auth.mfa.challenge({ factorId });
        if (error) throw error;
        setChallengeId(data.id);
        setChallengeReady(true);
      } catch (err: any) {
        setError(err.message || 'チャレンジ作成に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    createChallenge();
  }, [factorId]);

  const handleVerify = async () => {
    if (!challengeId || !factorId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });
      if (error) throw error;
      // 認証成功後、ダッシュボードへ遷移
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || '認証に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <h2 className="text-xl font-semibold mb-4">2ファクタ認証コード入力</h2>
      <p className="mb-2">認証アプリで生成された6桁のコードを入力してください。</p>
      <input
        type="text"
        value={code}
        onChange={e => setCode(e.target.value)}
        maxLength={6}
        className="border px-2 py-1 mb-4 w-full text-center text-lg tracking-widest"
        placeholder="123456"
        autoFocus
        disabled={!challengeReady}
      />
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <Button onClick={handleVerify} disabled={isLoading || code.length !== 6 || !challengeReady}>
        認証する
      </Button>
    </div>
  );
} 
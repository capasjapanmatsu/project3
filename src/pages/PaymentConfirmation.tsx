import { CheckCircle2, XCircle, Home } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';

export default function PaymentConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(5);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isSuccess = params.get('success') === 'true';
  const isCanceled = params.get('canceled') === 'true';

  useEffect(() => {
    if (!isSuccess) return;
    // 自動でマイページへ戻るカウントダウン
    const timer = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    const to = setTimeout(() => navigate('/dashboard', { replace: true }), 5000);
    return () => { clearInterval(timer); clearTimeout(to); };
  }, [isSuccess, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border p-6 text-center">
        {isSuccess && (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
            <h1 className="mt-4 text-2xl font-semibold text-gray-900">お支払いが完了しました</h1>
            <p className="mt-2 text-gray-600">プレミアム会員機能がまもなく反映されます。</p>
            <p className="mt-1 text-sm text-gray-500">自動的にマイページへ戻ります（{seconds}秒）</p>
            <div className="mt-6">
              <Button onClick={() => navigate('/dashboard', { replace: true })} className="w-full">
                <Home className="w-4 h-4 mr-2" /> マイページへ戻る
              </Button>
            </div>
          </>
        )}

        {isCanceled && (
          <>
            <XCircle className="w-14 h-14 text-red-500 mx-auto" />
            <h1 className="mt-4 text-2xl font-semibold text-gray-900">お支払いがキャンセルされました</h1>
            <p className="mt-2 text-gray-600">手続きを再開する場合は、元の画面からもう一度お試しください。</p>
            <div className="mt-6">
              <Button onClick={() => navigate('/dashboard', { replace: true })} className="w-full">
                <Home className="w-4 h-4 mr-2" /> マイページへ戻る
              </Button>
            </div>
          </>
        )}

        {!isSuccess && !isCanceled && (
          <>
            <h1 className="mt-2 text-xl font-semibold text-gray-900">決済結果を確認しています...</h1>
            <div className="mt-6">
              <Button onClick={() => navigate('/dashboard', { replace: true })} className="w-full">
                <Home className="w-4 h-4 mr-2" /> マイページへ戻る
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

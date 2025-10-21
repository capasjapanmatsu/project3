import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function PaymentReturn() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const success = sp.get('success');
    const scheme = `dogparkjp://payment-confirmation?${success ? 'success=true' : 'canceled=true'}`;

    // Try to bounce back into the app
    try {
      window.location.replace(scheme);
    } catch {}

    // Fallback within webview after short delay
    const t = setTimeout(() => {
      navigate(`/payment-confirmation?${success ? 'success=true' : 'canceled=true'}`, { replace: true });
    }, 700);
    return () => clearTimeout(t);
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center text-gray-700">
        <h1 className="text-xl font-semibold mb-2">決済が完了しました</h1>
        <p className="text-sm">アプリへ戻っています...</p>
      </div>
    </div>
  );
}



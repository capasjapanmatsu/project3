import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { AlertTriangle } from 'lucide-react';

export function PayPayAuth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoBack = () => {
    navigate('/login');
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="text-center p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
            PP
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          PayPay認証
        </h2>
        <p className="text-gray-600 mb-6">
          PayPay認証機能は現在実装中です。もうしばらくお待ちください。
        </p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">エラー</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}
        
        <Button 
          onClick={handleGoBack}
          className="w-full"
        >
          通常のログインに戻る
        </Button>
      </Card>
    </div>
  );
}
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Smartphone } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';

export const MiniAppPayment: React.FC = () => {
  const navigate = useNavigate();

  const handlePayment = (method: string) => {
    // Handle payment logic here
    console.log(`Processing payment with ${method}`);
    // Navigate to confirmation or success page
    navigate('/payment-confirmation');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">お支払い</h1>
        </div>

        {/* Payment Amount */}
        <Card className="mb-6">
          <div className="p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¥800</h2>
            <p className="text-gray-600">ドッグラン利用料金</p>
          </div>
        </Card>

        {/* Payment Methods */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">お支払い方法を選択</h3>
          
          {/* Credit Card */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <div 
              className="p-4 flex items-center"
              onClick={() => handlePayment('credit-card')}
            >
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">クレジットカード</h4>
                <p className="text-sm text-gray-600">Visa, Mastercard, JCB</p>
              </div>
            </div>
          </Card>

          {/* PayPay */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <div 
              className="p-4 flex items-center"
              onClick={() => handlePayment('paypay')}
            >
              <div className="bg-red-100 p-3 rounded-full mr-4">
                <Smartphone className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">PayPay</h4>
                <p className="text-sm text-gray-600">スマホ決済</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Terms */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            お支払いを完了することで、
            <a href="/terms" className="text-blue-600 underline">利用規約</a>
            に同意したものとみなされます。
          </p>
        </div>
      </div>
    </div>
  );
};
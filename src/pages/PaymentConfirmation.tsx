import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  CheckCircle, 
  QrCode, 
  ArrowRight, 
  ShoppingBag, 
  Calendar, 
  MapPin,
  Building,
  PawPrint,
  Clock,
  AlertTriangle,
  X
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { supabase } from '../utils/supabase';

export function PaymentConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'shop' | 'reservation' | 'facility_rental'>('shop');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [countdown, setCountdown] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);

  useEffect(() => {
    // URLパラメータからセッションIDとステータスを取得
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    const orderNumber = urlParams.get('order_number');
    
    if (canceled === 'true') {
      setPaymentFailed(true);
      setError('支払いがキャンセルされました。もう一度お試しください。');
      setIsLoading(false);
      return;
    }
    
    if (success === 'true' || sessionId) {
      // 注文番号を設定
      if (orderNumber) {
        setOrderNumber(orderNumber);
      }
      
      // Stripeセッション情報を取得
      if (sessionId) {
        fetchSessionDetails(sessionId);
      } else {
        // セッションIDがない場合は、最新の注文を取得
        fetchLatestOrder();
      }
      
      // Auto redirect to QR code page after 5 seconds
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            if (orderType === 'shop') {
              navigate('/orders', { state: { orderSuccess: true, orderNumber } });
            } else {
              navigate('/entrance-qr');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      // If no order success, redirect to home
      navigate('/');
    }
  }, [location, navigate]);

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      setIsLoading(true);
      
      // Stripeセッション情報を取得するエンドポイントを呼び出す
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('認証が必要です');
      }
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-session-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      
      if (!response.ok) {
        throw new Error('セッション情報の取得に失敗しました');
      }
      
      const data = await response.json();
      
      if (data.mode === 'subscription') {
        setOrderType('reservation');
      } else if (data.custom_name && data.custom_name.includes('施設貸し切り')) {
        setOrderType('facility_rental');
        setOrderDetails({
          parkName: data.custom_name.split(' 施設貸し切り ')[0],
          date: data.custom_name.split(' 施設貸し切り ')[1].split(' ')[0],
          time: data.custom_name.split(' 施設貸し切り ')[1].split(' ')[1],
          totalPrice: data.amount_total / 100
        });
      } else {
        setOrderType('shop');
        setOrderNumber(data.client_reference_id || data.metadata?.order_number || 'DP' + Date.now());
      }
    } catch (error: any) {
      console.error('Error fetching session details:', error);
      setError('決済情報の取得に失敗しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLatestOrder = async () => {
    try {
      setIsLoading(true);
      
      // 最新の注文を取得
      const { data, error } = await supabase
        .from('orders')
        .select('order_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setOrderNumber(data.order_number);
        setOrderType('shop');
      }
    } catch (error: any) {
      console.error('Error fetching latest order:', error);
      setError('注文情報の取得に失敗しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQR = () => {
    navigate('/entrance-qr');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  // 支払い失敗時の表示
  if (paymentFailed || error) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <Card className="p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-12 h-12 text-red-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">支払いに失敗しました</h1>
          
          <div className="bg-red-50 p-6 rounded-lg mb-8 max-w-xl mx-auto">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
              <div className="text-left">
                <p className="text-red-800 font-medium mb-2">
                  {error || '支払い処理中にエラーが発生しました。'}
                </p>
                <p className="text-red-700 text-sm">
                  以下をご確認ください：
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside mt-1 space-y-1">
                  <li>カード情報が正しいか確認してください</li>
                  <li>別の支払い方法をお試しください</li>
                  <li>しばらく経ってから再度お試しください</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4">
            <Link to="/checkout">
              <Button>
                支払いをやり直す
              </Button>
            </Link>
            
            <Link to="/cart">
              <Button variant="secondary">
                カートに戻る
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card className="p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">決済が完了しました！</h1>
        
        {orderNumber && (
          <p className="text-lg text-gray-600 mb-6">
            注文番号: <span className="font-semibold">{orderNumber}</span>
          </p>
        )}
        
        <div className="bg-blue-50 p-6 rounded-lg mb-8 max-w-xl mx-auto">
          {orderType === 'shop' && (
            <div className="text-left">
              <div className="flex items-center mb-4">
                <ShoppingBag className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-blue-900">ショッピング注文</h2>
              </div>
              <p className="text-blue-800 mb-2">
                ご注文ありがとうございます。商品の発送準備を進めています。
              </p>
              <p className="text-blue-800">
                注文の詳細は「注文履歴」ページでご確認いただけます。
              </p>
            </div>
          )}
          
          {orderType === 'reservation' && (
            <div className="text-left">
              <div className="flex items-center mb-4">
                <Calendar className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-blue-900">ドッグラン予約</h2>
              </div>
              <p className="text-blue-800 mb-2">
                ご予約ありがとうございます。予約が確定しました。
              </p>
              <p className="text-blue-800">
                入場には入場QRコードが必要です。下のボタンから発行してください。
              </p>
            </div>
          )}
          
          {orderType === 'facility_rental' && orderDetails && (
            <div className="text-left">
              <div className="flex items-center mb-4">
                <Building className="w-6 h-6 text-orange-600 mr-3" />
                <h2 className="text-xl font-semibold text-orange-900">施設貸し切り予約</h2>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-orange-800">{orderDetails.parkName}</p>
                </div>
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-orange-800">{orderDetails.date}</p>
                </div>
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-orange-800">{orderDetails.time}</p>
                </div>
              </div>
              
              <p className="text-orange-800 font-medium">
                入場には入場QRコードが必要です。下のボタンから発行してください。
              </p>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {orderType !== 'shop' && (
            <Button 
              onClick={handleGenerateQR}
              className="bg-green-600 hover:bg-green-700 text-lg py-3 px-8"
            >
              <QrCode className="w-5 h-5 mr-2" />
              入場QRコードを発行する
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}
          
          <p className="text-sm text-gray-500">
            {orderType !== 'shop' ? (
              `${countdown}秒後に自動的に入場QRコード発行画面に移動します...`
            ) : (
              `${countdown}秒後に自動的に注文履歴画面に移動します...`
            )}
          </p>
          
          <div className="flex justify-center space-x-4 mt-6">
            <Link to="/dashboard">
              <Button variant="secondary">
                ダッシュボードに戻る
              </Button>
            </Link>
            
            {orderType === 'shop' && (
              <Link to="/orders">
                <Button variant="secondary">
                  注文履歴を見る
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
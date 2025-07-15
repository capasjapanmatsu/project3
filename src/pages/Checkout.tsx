import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  CreditCard, 
  Truck, 
  User, 
  MapPin, 
  Phone, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle,
  Shield,
  Info
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import { useStripe } from '../hooks/useStripe';
import type { CartItem } from '../types';

interface CheckoutLocationState {
  totals?: {
    subtotal: number;
    originalSubtotal: number;
    discountAmount: number;
    shippingFee: number;
    total: number;
  };
  cartItems?: string[];
}

export function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { createCheckoutSession, loading: checkoutLoading, error: checkoutError } = useStripe();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    postalCode: '',
    address: '',
    phoneNumber: '',
    email: '',
    notes: '',
  });

  // 支払い情報
  const [totals, setTotals] = useState({
    subtotal: 0,
    originalSubtotal: 0,
    discountAmount: 0,
    shippingFee: 0,
    total: 0
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // locationからカート情報を取得
    const state = location.state as CheckoutLocationState;
    if (!state) {
      navigate('/cart');
      return;
    }

    // 合計金額情報を設定
    if (state.totals) {
      setTotals(state.totals);
    }

    fetchData(state);
  }, [user, navigate, location]);

  const fetchData = async (state: CheckoutLocationState) => {
    try {
      setIsLoading(true);

      // プロフィール情報を取得
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;

      // フォームデータを初期化
      setFormData({
        name: profileData.name || '',
        postalCode: profileData.postal_code || '',
        address: profileData.address || '',
        phoneNumber: profileData.phone_number || '',
        email: user?.email || '',
        notes: '',
      });

      // カート情報を取得
      if (state.cartItems && state.cartItems.length > 0) {
        const { data: cartData, error: cartError } = await supabase
          .from('cart_items')
          .select('*, product:products(*)')
          .in('id', state.cartItems)
          .eq('user_id', user?.id);

        if (cartError) throw cartError;
        setCartItems(cartData || []);
      } else {
        // カートアイテムがない場合は全てのカートアイテムを取得
        const { data: cartData, error: cartError } = await supabase
          .from('cart_items')
          .select('*, product:products(*)')
          .eq('user_id', user?.id);

        if (cartError) throw cartError;
        setCartItems(cartData || []);
      }

      // URLパラメータをチェック
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success') === 'true') {
        setPaymentSuccess(true);
        setOrderNumber(urlParams.get('order_number') || generateOrderNumber());
      } else if (urlParams.get('canceled') === 'true') {
        setPaymentFailed(true);
        setError('決済がキャンセルされました。必要に応じて再度お試しください。');
        
        // 決済キャンセル後の認証状態を確認
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          console.warn('⚠️ User session lost after payment cancellation');
          // 認証状態を復元を試みる
          const prePaymentAuthState = localStorage.getItem('pre_payment_auth_state');
          if (prePaymentAuthState) {
            console.log('🔄 Attempting to restore authentication state');
            // メッセージを表示して、ログインページに遷移
            setError('セッションが切断されました。再度ログインしてください。');
            setTimeout(() => {
              navigate('/login');
            }, 3000);
          }
        }
        
        // キャンセル後、URLパラメータをクリア
        window.history.replaceState({}, document.title, window.location.pathname);
      }

    } catch (error) {
      console.error('Error fetching checkout data:', error);
      setError((error as Error).message || 'データの取得に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const generateOrderNumber = () => {
    return `DP${Date.now()}${Math.floor(Math.random() * 1000)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cartItems.length === 0) {
      setError('カートに商品がありません。');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // 入力値の検証
      if (!formData.name.trim()) {
        throw new Error('お名前を入力してください');
      }
      if (!formData.postalCode.trim()) {
        throw new Error('郵便番号を入力してください');
      }
      if (!formData.address.trim()) {
        throw new Error('住所を入力してください');
      }
      if (!formData.phoneNumber.trim()) {
        throw new Error('電話番号を入力してください');
      }

      // 注文番号を生成
      const orderNumber = generateOrderNumber();
      setOrderNumber(orderNumber);

      // Stripeチェックアウトを作成
      await createCheckoutSession({
        priceId: 'price_placeholder', // 実際には使用されない
        mode: 'payment',
        successUrl: `${window.location.origin}/payment-confirmation?success=true&order_number=${orderNumber}`,
        cancelUrl: `${window.location.origin}/checkout?canceled=true`,
        cartItems: cartItems.map(item => item.id),
        customParams: {
          shipping_name: formData.name,
          shipping_address: formData.address,
          shipping_postal_code: formData.postalCode,
          shipping_phone: formData.phoneNumber,
          notes: formData.notes,
          order_number: orderNumber
        }
      });
    } catch (err) {
      setError((err as Error).message || 'エラーが発生しました');
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // 支払い成功時の表示
  if (paymentSuccess && orderNumber) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">ご注文ありがとうございます！</h1>
          <p className="text-lg text-gray-600 mb-6">
            注文番号: <span className="font-semibold">{orderNumber}</span>
          </p>
          
          <div className="bg-blue-50 p-6 rounded-lg mb-8 max-w-xl mx-auto">
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
          </div>
          
          <div className="flex justify-center space-x-4">
            <Link to="/orders">
              <Button>
                注文履歴を見る
              </Button>
            </Link>
            
            <Link to="/shop">
              <Button variant="secondary">
                ショッピングを続ける
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <Link to="/cart" className="flex items-center text-gray-600 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          カートに戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-8 flex items-center">
        <ShoppingBag className="w-8 h-8 text-green-600 mr-3" />
        お支払い情報
      </h1>

      {/* エラーメッセージ */}
      {(error || checkoutError) && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">エラーが発生しました</p>
            <p className="text-red-700">{error || checkoutError}</p>
            {paymentFailed && (
              <div className="mt-2">
                <p className="text-sm text-red-700">
                  支払い処理に失敗しました。以下をご確認ください：
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                  <li>カード情報が正しいか確認してください</li>
                  <li>別の支払い方法をお試しください</li>
                  <li>しばらく経ってから再度お試しください</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 配送・支払い情報フォーム */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <form onSubmit={handleSubmit}>
              <h2 className="text-xl font-semibold mb-6">配送情報</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Input
                  label="お名前 *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  icon={<User className="w-4 h-4 text-gray-500" />}
                />
                
                <Input
                  label="電話番号 *"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  required
                  icon={<Phone className="w-4 h-4 text-gray-500" />}
                />
              </div>
              
              <div className="mb-6">
                <Input
                  label="郵便番号 *"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  required
                  icon={<MapPin className="w-4 h-4 text-gray-500" />}
                  placeholder="123-4567"
                />
              </div>
              
              <div className="mb-6">
                <Input
                  label="住所 *"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  icon={<MapPin className="w-4 h-4 text-gray-500" />}
                />
              </div>
              
              <div className="mb-6">
                <Input
                  label="メールアドレス *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled

                />
                <p className="text-xs text-gray-500 mt-1">
                  注文確認メールがこのアドレスに送信されます
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  備考
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="配送に関する特記事項があればご記入ください"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                />
              </div>
              
              <h2 className="text-xl font-semibold mb-4 mt-8">支払い方法</h2>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">クレジットカード</span>
                </div>
                <p className="text-sm text-gray-600 mt-1 ml-7">
                  VISA, Mastercard, JCB, AMEX
                </p>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg mb-6">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">支払い処理について</p>
                    <p>「注文を確定する」ボタンをクリックすると、選択した支払い方法の決済画面に移動します。決済が完了すると、自動的に注文が確定します。</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg mb-6">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">安全な決済</p>
                    <p>すべての支払い情報は暗号化されて安全に処理されます。当サイトでは実際のカード情報を保存しません。</p>
                  </div>
                </div>
              </div>
              
              <Button
                type="submit"
                isLoading={isProcessing || checkoutLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
                disabled={cartItems.length === 0}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                注文を確定する (¥{totals.total.toLocaleString()})
              </Button>
            </form>
          </Card>
        </div>

        {/* 注文サマリー */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">注文内容</h3>
            
            <div className="space-y-4 max-h-80 overflow-y-auto mb-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-3 pb-3 border-b border-gray-100 last:border-b-0">
                  <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.product.name}</h4>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">数量: {item.quantity}</span>
                      <span className="text-sm font-medium">¥{(item.product.price * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span>商品小計</span>
                <span>¥{totals.originalSubtotal.toLocaleString()}</span>
              </div>
              
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-purple-600">
                  <span>サブスク割引 (10%)</span>
                  <span>-¥{totals.discountAmount.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span>送料</span>
                <span>
                  {totals.shippingFee === 0 ? (
                    <span className="text-green-600">無料</span>
                  ) : (
                    `¥${totals.shippingFee.toLocaleString()}`
                  )}
                </span>
              </div>
              
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200 mt-2">
                <span>合計</span>
                <span className="text-green-600">¥{totals.total.toLocaleString()}</span>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <Truck className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">配送について</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• 平日14時までのご注文で翌日お届け</p>
                  <p>• 土日祝日も配送いたします</p>
                  <p>• 配送状況はメールでお知らせします</p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">セキュリティ</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>• SSL暗号化通信で個人情報を保護</p>
                  <p>• クレジットカード情報は保存されません</p>
                  <p>• 第三者認証のセキュリティ対策</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


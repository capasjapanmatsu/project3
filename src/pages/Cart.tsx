import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight,
  Crown,
  Truck,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import type { CartItem } from '../types';

export function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isActive: hasSubscription } = useSubscription();
  const [error, setError] = useState<string | null>(null);

  const MAX_DOGS = 3; // 最大3頭まで選択可能

  useEffect(() => {
    if (user) {
      fetchCartData();
    }
  }, [user]);

  const fetchCartData = async () => {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, product:products(*)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCartItems(data || []);
    } catch (error) {
      console.error('Error fetching cart data:', error);
      setError('カート情報の取得に失敗しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeItem(cartItemId);
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', cartItemId);

      if (error) throw error;
      await fetchCartData();
    } catch (error) {
      console.error('Error updating quantity:', error);
      setError('数量の更新に失敗しました。再度お試しください。');
    }
  };

  const removeItem = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;
      await fetchCartData();
    } catch (error) {
      console.error('Error removing item:', error);
      setError('商品の削除に失敗しました。再度お試しください。');
    }
  };

  const clearCart = async () => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;
      await fetchCartData();
    } catch (error) {
      console.error('Error clearing cart:', error);
      setError('カートの削除に失敗しました。再度お試しください。');
    }
  };

  const getDiscountedPrice = (price: number) => {
    return hasSubscription ? Math.round(price * 0.9) : price; // 10%割引
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      const discountedPrice = getDiscountedPrice(item.product.price);
      return sum + (discountedPrice * item.quantity);
    }, 0);

    const originalSubtotal = cartItems.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);

    const discountAmount = originalSubtotal - subtotal;
    
    // 送料計算（5,000円以上またはサブスク会員は無料、それ以外は690円）
    const shippingFee = (subtotal >= 5000 || hasSubscription) ? 0 : 690;
    
    const total = subtotal + shippingFee;

    return {
      subtotal,
      originalSubtotal,
      discountAmount,
      shippingFee,
      total
    };
  };

  const getSelectedDogNames = () => {
    return cartItems.map(item => {
      return item.product.name || '';
    }).filter(name => name).join('、');
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      setError('カートに商品がありません。');
      return;
    }

    // 決済ページに遷移（データをstateで渡す）
    navigate('/checkout', { 
      state: { 
        cartItems: cartItems.map(item => item.id),
        totals: calculateTotals()
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 flex items-center">
          <ShoppingCart className="w-8 h-8 text-green-600 mr-3" />
          ショッピングカート
        </h1>
        
        <Card className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">カートは空です</h2>
          <p className="text-gray-500 mb-6">お気に入りの商品をカートに追加してください</p>
          <Link to="/shop">
            <Button className="bg-green-600 hover:bg-green-700">
              ショッピングを続ける
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold flex items-center">
          <ShoppingCart className="w-8 h-8 text-green-600 mr-3" />
          ショッピングカート ({cartItems.length}点)
        </h1>
        <Button
          variant="secondary"
          onClick={clearCart}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          カートを空にする
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* カート商品一覧 */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => {
            const originalPrice = item.product.price;
            const discountedPrice = getDiscountedPrice(originalPrice);
            const hasDiscount = hasSubscription && discountedPrice < originalPrice;

            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-start space-x-4">
                  {/* 商品画像 */}
                  <div className="flex-shrink-0">
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-20 h-20 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg';
                      }}
                    />
                  </div>

                  {/* 商品情報 */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{item.product.name}</h3>
                        {item.product.brand && (
                          <p className="text-sm text-gray-500">{item.product.brand}</p>
                        )}
                        <div className="mt-1 space-y-1 text-xs text-gray-500">
                          {item.product.weight && (
                            <p>内容量: {item.product.weight}g</p>
                          )}
                          {item.product.size && (
                            <p>サイズ: {item.product.size}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 価格と数量 */}
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-green-600">
                            ¥{discountedPrice.toLocaleString()}
                          </span>
                          {hasDiscount && (
                            <span className="text-sm text-gray-500 line-through">
                              ¥{originalPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {hasSubscription && (
                          <p className="text-xs text-purple-600">サブスク会員価格</p>
                        )}
                      </div>

                      {/* 数量調整 */}
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 小計 */}
                    <div className="mt-2 text-right">
                      <span className="text-lg font-semibold">
                        小計: ¥{(discountedPrice * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* 注文サマリー */}
        <div className="space-y-6">
          {/* サブスクリプション特典 */}
          {hasSubscription ? (
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Crown className="w-5 h-5" />
                <span className="font-semibold">サブスク会員特典</span>
              </div>
              <p className="text-sm">全商品10%OFF + 送料無料</p>
            </Card>
          ) : (
            <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Crown className="w-5 h-5" />
                <span className="font-semibold">サブスクリプションでもっとお得に！</span>
              </div>
              <p className="text-sm mb-3">全商品10%OFF + 送料無料</p>
              <Link to="/subscription">
                <Button size="sm" className="bg-white text-purple-600 hover:bg-gray-100">
                  詳細を見る
                </Button>
              </Link>
            </Card>
          )}

          {/* 注文サマリー */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">注文サマリー</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>商品小計</span>
                <span>¥{calculateTotals().originalSubtotal.toLocaleString()}</span>
              </div>
              
              {calculateTotals().discountAmount > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>サブスク割引 (10%)</span>
                  <span>-¥{calculateTotals().discountAmount.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="flex items-center">
                  <Truck className="w-4 h-4 mr-1" />
                  送料
                </span>
                <span>
                  {calculateTotals().shippingFee === 0 ? (
                    <span className="text-green-600">無料</span>
                  ) : (
                    `¥${calculateTotals().shippingFee.toLocaleString()}`
                  )}
                </span>
              </div>
              
              <hr className="my-3" />
              
              <div className="flex justify-between text-lg font-bold">
                <span>合計</span>
                <span className="text-green-600">¥{calculateTotals().total.toLocaleString()}</span>
              </div>
            </div>

            {/* 送料無料まであといくら */}
            {!hasSubscription && calculateTotals().subtotal < 5000 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  あと¥{(5000 - calculateTotals().subtotal).toLocaleString()}で送料無料！
                </p>
              </div>
            )}

            <div className="space-y-3 mt-4">
              <Button
                onClick={handleCheckout}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                レジに進む
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Link to="/shop">
                <Button variant="secondary" className="w-full">
                  ショッピングを続ける
                </Button>
              </Link>
            </div>
          </Card>

          {/* 配送情報 */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <Truck className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">配送について</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• 送料：全国一律¥690</p>
                  <p>• ¥5,000以上のご注文で<span className="font-medium">送料無料</span></p>
                  <p>• サブスク会員は<span className="font-medium">常に送料無料</span></p>
                  <p>• 平日14時までのご注文で翌日お届け</p>
                  <p>• 土日祝日も配送いたします</p>
                  <p>• 時間指定配送も可能です</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
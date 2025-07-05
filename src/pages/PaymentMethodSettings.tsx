import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  CreditCard, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  Star,
  Lock,
  X,
  History,
  User,
  Package,
  ShoppingBag
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import type { PaymentCard } from '../types';

export function PaymentMethodSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    isDefault: false,
  });

  useEffect(() => {
    if (user) {
      fetchPaymentCards();
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  const fetchPaymentCards = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('payment_cards')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPaymentCards(data || []);
    } catch (error) {
      console.error('Error fetching payment cards:', error);
      setError('支払い方法の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const formatted = numbers.replace(/(.{4})/g, '$1 ').trim();
    return formatted.slice(0, 19); // 16桁 + 3つのスペース
  };

  const getCardBrand = (cardNumber: string) => {
    const number = cardNumber.replace(/\s/g, '');
    if (number.startsWith('4')) return 'visa';
    if (number.startsWith('5') || number.startsWith('2')) return 'mastercard';
    if (number.startsWith('3')) return 'amex';
    if (number.startsWith('35')) return 'jcb';
    return 'visa'; // デフォルト
  };

  const validateCard = () => {
    const cardNumber = formData.cardNumber.replace(/\s/g, '');
    
    if (cardNumber.length !== 16) {
      setError('カード番号は16桁で入力してください。');
      return false;
    }
    
    if (!formData.cardHolder.trim()) {
      setError('カード名義人を入力してください。');
      return false;
    }
    
    if (!formData.expiryMonth || !formData.expiryYear) {
      setError('有効期限を選択してください。');
      return false;
    }
    
    if (formData.cvv.length < 3) {
      setError('CVVを正しく入力してください。');
      return false;
    }
    
    // 有効期限チェック
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    const expYear = parseInt(formData.expiryYear);
    const expMonth = parseInt(formData.expiryMonth);
    
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      setError('有効期限が過去の日付です。');
      return false;
    }
    
    return true;
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateCard()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const cardNumber = formData.cardNumber.replace(/\s/g, '');
      const maskedNumber = '**** **** **** ' + cardNumber.slice(-4);
      const cardBrand = getCardBrand(cardNumber);
      
      // 実際の実装では、ここでStripeなどの決済サービスでカードを登録
      // この例では、マスクされた情報のみをデータベースに保存
      const { error } = await supabase
        .from('payment_cards')
        .insert([{
          user_id: user?.id,
          card_number_masked: maskedNumber,
          card_holder_name: formData.cardHolder,
          expiry_month: parseInt(formData.expiryMonth),
          expiry_year: parseInt(formData.expiryYear),
          card_brand: cardBrand,
          is_default: formData.isDefault || paymentCards.length === 0, // 最初のカードはデフォルトに
        }]);
      
      if (error) throw error;
      
      setSuccess('クレジットカードを登録しました');
      setShowAddCardForm(false);
      setFormData({
        cardNumber: '',
        cardHolder: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        isDefault: false,
      });
      
      // カード一覧を更新
      await fetchPaymentCards();
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error: unknown) {
      console.error('Error saving payment card:', error);
      setError('クレジットカードの登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (cardId: string) => {
    try {
      setError('');
      setSuccess('');
      
      // まず、すべてのカードのデフォルト設定を解除
      const { error: updateError } = await supabase
        .from('payment_cards')
        .update({ is_default: false })
        .eq('user_id', user?.id);
      
      if (updateError) throw updateError;
      
      // 選択したカードをデフォルトに設定
      const { error: setDefaultError } = await supabase
        .from('payment_cards')
        .update({ is_default: true })
        .eq('id', cardId);
      
      if (setDefaultError) throw setDefaultError;
      
      setSuccess('デフォルトの支払い方法を変更しました');
      
      // カード一覧を更新
      await fetchPaymentCards();
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error setting default card:', error);
      setError('デフォルト設定の変更に失敗しました。');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('このカードを削除してもよろしいですか？')) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');
      
      const { error } = await supabase
        .from('payment_cards')
        .delete()
        .eq('id', cardId);
      
      if (error) throw error;
      
      setSuccess('クレジットカードを削除しました');
      
      // カード一覧を更新
      await fetchPaymentCards();
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      setError((error as Error).message || '決済方法の削除に失敗しました');
    }
  };

  const getCardIcon = (brand: string) => {
    switch (brand) {
      case 'visa':
        return <span className="text-blue-600 font-bold">VISA</span>;
      case 'mastercard':
        return <span className="text-red-600 font-bold">Mastercard</span>;
      case 'amex':
        return <span className="text-blue-800 font-bold">AMEX</span>;
      case 'jcb':
        return <span className="text-green-600 font-bold">JCB</span>;
      default:
        return <CreditCard className="w-5 h-5 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/dashboard"
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ダッシュボードに戻る
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <CreditCard className="w-8 h-8 text-blue-600 mr-3" />
          支払い方法の管理
        </h1>
        <p className="text-lg text-gray-600">
          クレジットカード情報を管理します
        </p>
      </div>

      {/* クイックリンク */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <Link to="/profile-settings">
          <Button variant="secondary" size="sm">
            <User className="w-4 h-4 mr-2" />
            プロフィール編集
          </Button>
        </Link>
        <Link to="/dogpark-history">
          <Button variant="secondary" size="sm">
            <History className="w-4 h-4 mr-2" />
            利用履歴
          </Button>
        </Link>
        <Link to="/orders">
          <Button variant="secondary" size="sm">
            <Package className="w-4 h-4 mr-2" />
            注文履歴
          </Button>
        </Link>
        <Link to="/shop">
          <Button variant="secondary" size="sm">
            <ShoppingBag className="w-4 h-4 mr-2" />
            ショップ
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <CreditCard className="w-6 h-6 text-blue-600 mr-2" />
            登録済みのカード
          </h2>
          <Button 
            onClick={() => setShowAddCardForm(!showAddCardForm)}
            size="sm"
          >
            {showAddCardForm ? (
              <>
                <X className="w-4 h-4 mr-1" />
                キャンセル
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                カードを追加
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* カード追加フォーム */}
        {showAddCardForm && (
          <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-4">新しいカードを追加</h3>
            <form onSubmit={handleAddCard}>
              <div className="space-y-4">
                <Input
                  label="カード番号 *"
                  value={formData.cardNumber}
                  onChange={(e) => {
                    const formatted = formatCardNumber(e.target.value);
                    setFormData({ ...formData, cardNumber: formatted });
                  }}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  required
                />

                <Input
                  label="カード名義人 *"
                  value={formData.cardHolder}
                  onChange={(e) => setFormData({ ...formData, cardHolder: e.target.value.toUpperCase() })}
                  placeholder="TARO YAMADA"
                  required
                />

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      有効期限（月） *
                    </label>
                    <select
                      value={formData.expiryMonth}
                      onChange={(e) => setFormData({ ...formData, expiryMonth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">月</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                          {String(i + 1).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      有効期限（年） *
                    </label>
                    <select
                      value={formData.expiryYear}
                      onChange={(e) => setFormData({ ...formData, expiryYear: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">年</option>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() + i;
                        return (
                          <option key={year} value={String(year).slice(-2)}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <Input
                    label="CVV *"
                    value={formData.cvv}
                    onChange={(e) => setFormData({ ...formData, cvv: e.target.value.replace(/\D/g, '') })}
                    placeholder="123"
                    maxLength={4}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <label htmlFor="isDefault" className="text-sm text-gray-700">
                    デフォルトの支払い方法として設定
                  </label>
                </div>

                <div className="flex justify-end space-x-3 mt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddCardForm(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isSubmitting}
                  >
                    カードを追加
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* カード一覧 */}
        {paymentCards.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">登録されているカードはありません</p>
            <Button onClick={() => setShowAddCardForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              カードを追加する
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentCards.map((card) => (
              <div key={card.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-300">
                      {getCardIcon(card.card_brand)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{card.card_number_masked}</h3>
                        {card.is_default && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                            <Star className="w-3 h-3 mr-1" />
                            デフォルト
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{card.card_holder_name}</p>
                      <p className="text-xs text-gray-500">
                        有効期限: {card.expiry_month.toString().padStart(2, '0')}/{card.expiry_year.toString().padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {!card.is_default && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSetDefault(card.id)}
                      >
                        <Star className="w-4 h-4 mr-1" />
                        デフォルトに設定
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteCard(card.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Lock className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">セキュリティ情報</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• カード情報は暗号化して安全に保存されます</p>
              <p>• 実際のカード番号は保存されません</p>
              <p>• 決済処理はSSL暗号化通信で行われます</p>
              <p>• PCI DSS準拠のセキュリティ基準を満たしています</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
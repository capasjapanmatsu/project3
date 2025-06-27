import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  ArrowLeft, 
  Shield, 
  CheckCircle,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

export function PaymentSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    isDefault: true,
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateCard()) {
      return;
    }
    
    setIsLoading(true);
    
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
          is_default: formData.isDefault,
        }]);
      
      if (error) throw error;
      
      setSuccess(true);
      
      // 3秒後に入場QRページに戻る
      setTimeout(() => {
        navigate('/entrance-qr');
      }, 3000);
      
    } catch (error: any) {
      console.error('Error saving payment card:', error);
      setError('クレジットカードの登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            クレジットカードを登録しました
          </h2>
          <p className="text-gray-600 mb-4">
            入場QRページに戻ります...
          </p>
          <Button onClick={() => navigate('/entrance-qr')}>
            入場QRページへ
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate('/entrance-qr')}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          入場QRに戻る
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <CreditCard className="w-8 h-8 text-blue-600 mr-3" />
          クレジットカード登録
        </h1>
        <p className="text-gray-600">
          ドッグラン入場QRの発行にはクレジットカードの登録が必要です
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メインフォーム */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800 font-medium">エラー</span>
                  </div>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              )}

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

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">重要な注意事項</p>
                      <ul className="space-y-1 text-xs">
                        <li>• カード情報は暗号化して安全に保存されます</li>
                        <li>• 実際のカード番号は保存されません</li>
                        <li>• 入場QR発行時に自動で課金されます</li>
                        <li>• 不正利用防止のため、本人確認が必要な場合があります</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  クレジットカードを登録
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* サイドバー情報 */}
        <div className="space-y-6">
          {/* セキュリティ情報 */}
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center space-x-2 mb-3">
              <Shield className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900">セキュリティ</h3>
            </div>
            <div className="text-sm text-green-800 space-y-2">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>SSL暗号化通信</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>PCI DSS準拠</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>カード番号は保存されません</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>不正利用監視システム</span>
              </div>
            </div>
          </Card>

          {/* 対応カードブランド */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">対応カードブランド</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">VISA</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <CreditCard className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium">Mastercard</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <CreditCard className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">JCB</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <CreditCard className="w-5 h-5 text-blue-800" />
                <span className="text-sm font-medium">AMEX</span>
              </div>
            </div>
          </Card>

          {/* 課金について */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center space-x-2 mb-3">
              <Lock className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">課金について</h3>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• 入場QR発行時に自動課金</p>
              <p>• 単発利用: ¥800/日</p>
              <p>• サブスク会員は追加料金なし</p>
              <p>• 利用明細はメールで送信</p>
              <p>• 返金は利用前のみ可能</p>
            </div>
          </Card>

          {/* サポート情報 */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">サポート</h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p>カード登録でお困りの場合は、カスタマーサポートまでお問い合わせください。</p>
              <div className="mt-3 p-3 bg-gray-50 rounded">
                <p className="font-medium">カスタマーサポート</p>
                <p>📞 0120-XXX-XXX</p>
                <p>📧 support@dogparkjp.com</p>
                <p className="text-xs text-gray-500 mt-1">
                  平日 9:00-18:00
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
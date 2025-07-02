import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { supabase } from '../utils/supabase';
import { Shield, AlertTriangle, MapPin, Phone, Mail, User, Loader, Lock } from 'lucide-react';
import { lookupPostalCode, formatAddress } from '../utils/postalCodeLookup';
import { safeSetItem } from '../utils/safeStorage';

export function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLookingUpPostalCode, setIsLookingUpPostalCode] = useState(false);
  const [postalCodeError, setPostalCodeError] = useState('');
  const [isPasswordRegistration, setIsPasswordRegistration] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'user', // 'user' or 'owner'
    name: '',
    postalCode: '',
    address: '',
    phoneNumber: '',
  });

  // 郵便番号の自動フォーマット（123-4567）
  const formatPostalCode = (value: string) => {
    // 数字のみを抽出
    const numbers = value.replace(/\D/g, '');
    
    // 7桁まで制限
    if (numbers.length <= 7) {
      // 3桁目の後にハイフンを挿入
      if (numbers.length > 3) {
        return numbers.slice(0, 3) + '-' + numbers.slice(3);
      }
      return numbers;
    }
    
    return formData.postalCode; // 7桁を超える場合は変更しない
  };

  // 電話番号の自動フォーマット（090-1234-5678）
  const formatPhoneNumber = (value: string) => {
    // 数字のみを抽出
    const numbers = value.replace(/\D/g, '');
    
    // 11桁まで制限
    if (numbers.length <= 11) {
      if (numbers.length > 7) {
        // 090-1234-5678 形式
        return numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7);
      } else if (numbers.length > 3) {
        // 090-1234 形式
        return numbers.slice(0, 3) + '-' + numbers.slice(3);
      }
      return numbers;
    }
    
    return formData.phoneNumber; // 11桁を超える場合は変更しない
  };

  // 郵便番号から住所を取得
  const handlePostalCodeChange = async (value: string) => {
    const formatted = formatPostalCode(value);
    setFormData({ ...formData, postalCode: formatted });
    
    // 7桁の数字が入力された場合に住所を検索
    if (formatted.replace(/-/g, '').length === 7) {
      setIsLookingUpPostalCode(true);
      setPostalCodeError('');
      
      try {
        const result = await lookupPostalCode(formatted);
        
        if (result.success && result.results && result.results.length > 0) {
          const address = formatAddress(result.results[0]);
          setFormData(prev => ({ ...prev, address }));
        } else {
          setPostalCodeError(result.message || '住所が見つかりませんでした');
        }
      } catch (error) {
        console.error('Error looking up postal code:', error);
        setPostalCodeError('住所の検索中にエラーが発生しました');
      } finally {
        setIsLookingUpPostalCode(false);
      }
    }
  };

  // Magic Link登録
  const handleMagicLinkRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 入力値の検証
    if (!formData.name.trim()) {
      setError('お名前を入力してください');
      setIsLoading(false);
      return;
    }

    if (!formData.postalCode.trim()) {
      setError('郵便番号を入力してください');
      setIsLoading(false);
      return;
    }

    if (!formData.address.trim()) {
      setError('住所を入力してください');
      setIsLoading(false);
      return;
    }

    if (!formData.phoneNumber.trim()) {
      setError('電話番号を入力してください');
      setIsLoading(false);
      return;
    }

    // 郵便番号の形式チェック（ハイフンありの形式）
    const postalCodeRegex = /^\d{3}-\d{4}$/;
    if (!postalCodeRegex.test(formData.postalCode)) {
      setError('郵便番号は7桁の数字で入力してください（例：1234567）');
      setIsLoading(false);
      return;
    }

    // 電話番号の形式チェック（ハイフンありの形式）
    const phoneRegex = /^0\d{2,3}-\d{1,4}-\d{4}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      setError('電話番号は正しい形式で入力してください（例：09012345678）');
      setIsLoading(false);
      return;
    }

    try {
      // メールアドレスをローカルストレージに保存（次回ログイン時に自動入力するため）
      safeSetItem('lastUsedEmail', formData.email);
      
      // Magic Linkでサインアップ
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            user_type: formData.userType,
            name: formData.name,
            postal_code: formData.postalCode,
            address: formData.address,
            phone_number: formData.phoneNumber,
          }
        },
      });

      if (error) throw error;

      // 成功
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message || '登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // パスワード登録
  const handlePasswordRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 入力値の検証
    if (!formData.name.trim()) {
      setError('お名前を入力してください');
      setIsLoading(false);
      return;
    }

    if (!formData.postalCode.trim()) {
      setError('郵便番号を入力してください');
      setIsLoading(false);
      return;
    }

    if (!formData.address.trim()) {
      setError('住所を入力してください');
      setIsLoading(false);
      return;
    }

    if (!formData.phoneNumber.trim()) {
      setError('電話番号を入力してください');
      setIsLoading(false);
      return;
    }

    if (!formData.password) {
      setError('パスワードを入力してください');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      setIsLoading(false);
      return;
    }

    // 郵便番号の形式チェック（ハイフンありの形式）
    const postalCodeRegex = /^\d{3}-\d{4}$/;
    if (!postalCodeRegex.test(formData.postalCode)) {
      setError('郵便番号は7桁の数字で入力してください（例：1234567）');
      setIsLoading(false);
      return;
    }

    // 電話番号の形式チェック（ハイフンありの形式）
    const phoneRegex = /^0\d{2,3}-\d{1,4}-\d{4}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      setError('電話番号は正しい形式で入力してください（例：09012345678）');
      setIsLoading(false);
      return;
    }

    try {
      // メールアドレスをローカルストレージに保存
      safeSetItem('lastUsedEmail', formData.email);
      
      // パスワードでサインアップ
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            user_type: formData.userType,
            name: formData.name,
            postal_code: formData.postalCode,
            address: formData.address,
            phone_number: formData.phoneNumber,
          }
        },
      });

      if (error) throw error;

      // 成功時、2FAセットアップ画面へ遷移
      navigate('/two-factor-setup');
    } catch (err) {
      setError((err as Error).message || '登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            メールを確認してください
          </h2>
          <p className="text-gray-600 mb-4">
            {formData.email}にログインリンクを送信しました。メールを確認してリンクをクリックしてください。
          </p>
          <p className="text-sm text-gray-500 mb-6">
            メールが届かない場合は、迷惑メールフォルダを確認するか、別のメールアドレスでお試しください。
          </p>
          <Button onClick={() => navigate('/login')}>
            ログイン画面に戻る
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">新規登録</h1>
      <Card>
        <div className="flex justify-center mb-4 space-x-2">
          <Button type="button" onClick={() => setIsPasswordRegistration(false)} variant={!isPasswordRegistration ? 'primary' : 'secondary'}>Magic Link</Button>
          <Button type="button" onClick={() => setIsPasswordRegistration(true)} variant={isPasswordRegistration ? 'primary' : 'secondary'}>パスワード</Button>
        </div>
        {!isPasswordRegistration ? (
          <form onSubmit={handleMagicLinkRegistration} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-start">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p>{error}</p>
                </div>
              </div>
            )}
            
            <Input
              label="お名前 *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="山田太郎"
              icon={<User className="w-4 h-4 text-gray-500" />}
            />
            
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                郵便番号 * <span className="text-xs text-blue-600">(入力すると住所が自動入力されます)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => handlePostalCodeChange(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2 border ${postalCodeError ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="123-4567（数字のみ入力）"
                  maxLength={8}
                  required
                />
                {isLookingUpPostalCode && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <Loader className="h-4 w-4 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>
              {postalCodeError && (
                <p className="mt-1 text-sm text-red-600">{postalCodeError}</p>
              )}
            </div>
            
            <Input
              label="住所 *"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              placeholder="東京都渋谷区渋谷1-1-1"
              icon={<MapPin className="w-4 h-4 text-gray-500" />}
            />
            
            <Input
              label="電話番号 *"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value);
                setFormData({ ...formData, phoneNumber: formatted });
              }}
              required
              placeholder="09012345678（数字のみ入力）"
              maxLength={13}
              helperText="認証に使用します。正確に入力してください。"
              icon={<Phone className="w-4 h-4 text-gray-500" />}
            />
            
            <Input
              label="メールアドレス *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="example@email.com"
              icon={<Mail className="w-4 h-4 text-gray-500" />}
            />
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                アカウントタイプ *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="user"
                    checked={formData.userType === 'user'}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                    className="mr-2"
                  />
                  利用者
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="owner"
                    checked={formData.userType === 'owner'}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                    className="mr-2"
                  />
                  施設オーナー
                </label>
              </div>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">※ 入力のヒント</span><br />
                • 郵便番号：数字のみ入力（例：1234567）<br />
                • 電話番号：数字のみ入力（例：09012345678）<br />
                ハイフンは自動で挿入されます。
              </p>
            </div>
            
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Magic Linkについて</p>
                  <p>登録後、入力したメールアドレスにログイン用のリンクが送信されます。リンクをクリックするだけで簡単にログインできます。</p>
                </div>
              </div>
            </div>
            
            <Button type="submit" isLoading={isLoading} className="w-full">
              <Shield className="w-4 h-4 mr-2" />
              登録する
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePasswordRegistration} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-start">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p>{error}</p>
                </div>
              </div>
            )}
            
            <Input
              label="お名前 *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="山田太郎"
              icon={<User className="w-4 h-4 text-gray-500" />}
            />
            
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                郵便番号 * <span className="text-xs text-blue-600">(入力すると住所が自動入力されます)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => handlePostalCodeChange(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2 border ${postalCodeError ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="123-4567（数字のみ入力）"
                  maxLength={8}
                  required
                />
                {isLookingUpPostalCode && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <Loader className="h-4 w-4 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>
              {postalCodeError && (
                <p className="mt-1 text-sm text-red-600">{postalCodeError}</p>
              )}
            </div>
            
            <Input
              label="住所 *"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              placeholder="東京都渋谷区渋谷1-1-1"
              icon={<MapPin className="w-4 h-4 text-gray-500" />}
            />
            
            <Input
              label="電話番号 *"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value);
                setFormData({ ...formData, phoneNumber: formatted });
              }}
              required
              placeholder="09012345678（数字のみ入力）"
              maxLength={13}
              helperText="認証に使用します。正確に入力してください。"
              icon={<Phone className="w-4 h-4 text-gray-500" />}
            />
            
            <Input
              label="メールアドレス *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="example@email.com"
              icon={<Mail className="w-4 h-4 text-gray-500" />}
            />
            
            <Input
              label="パスワード *"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="6文字以上"
              helperText="6文字以上で入力してください"
              icon={<Lock className="w-4 h-4 text-gray-500" />}
            />
            
            <Input
              label="パスワード確認 *"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              placeholder="パスワードを再入力"
              helperText="パスワードを再入力してください"
              icon={<Lock className="w-4 h-4 text-gray-500" />}
            />
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                アカウントタイプ *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="user"
                    checked={formData.userType === 'user'}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                    className="mr-2"
                  />
                  利用者
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="owner"
                    checked={formData.userType === 'owner'}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                    className="mr-2"
                  />
                  施設オーナー
                </label>
              </div>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">※ 入力のヒント</span><br />
                • 郵便番号：数字のみ入力（例：1234567）<br />
                • 電話番号：数字のみ入力（例：09012345678）<br />
                ハイフンは自動で挿入されます。
              </p>
            </div>
            
            <div className="mb-4 p-3 bg-green-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">セキュリティ強化</p>
                  <p>パスワード登録後、2ファクタ認証（TOTP）の設定をお勧めします。Google Authenticatorなどの認証アプリでQRコードをスキャンするだけで簡単に設定できます。</p>
                </div>
              </div>
            </div>
            
            <Button type="submit" isLoading={isLoading} className="w-full">
              <Lock className="w-4 h-4 mr-2" />
              登録する
            </Button>
          </form>
        )}
        
        <div className="mt-4 text-center p-6">
          <p className="text-sm text-gray-600">
            すでにアカウントをお持ちの方は
            <Link to="/login" className="text-blue-600 hover:underline ml-1">
              こちらからログイン
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
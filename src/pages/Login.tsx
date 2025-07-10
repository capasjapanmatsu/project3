import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { Mail, Lock, AlertTriangle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import useAuth from '../context/AuthContext';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

export function Login() {
  const { signInWithMagicLink } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordLogin, setIsPasswordLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // ローカルストレージからメールアドレスを取得して自動入力
  useEffect(() => {
    const savedEmail = safeGetItem('lastUsedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  // Magic Link
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      safeSetItem('lastUsedEmail', email);
      const { error } = await signInWithMagicLink(email);
      if (error) throw new Error(error);
      alert('ログインリンクを送信しました。メールをご確認ください。');
    } catch (err: unknown) {
      setError((err as Error).message || 'ログインリンクの送信に失敗しました。メールアドレスを確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  // パスワードログイン
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      safeSetItem('lastUsedEmail', email);
      // パスワードログイン
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      // 2FAが必要か判定
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.nextLevel === 'aal2' && aalData?.nextLevel !== aalData?.currentLevel) {
        // 2FAチャレンジ画面へ遷移
        navigate('/two-factor-verify');
        return;
      }
      // 通常ログイン成功時
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">ログイン</h1>
      <Card>
        <div className="flex justify-center mb-4 space-x-2">
          <Button type="button" onClick={() => setIsPasswordLogin(false)} variant={!isPasswordLogin ? 'primary' : 'secondary'}>Magic Link</Button>
          <Button type="button" onClick={() => setIsPasswordLogin(true)} variant={isPasswordLogin ? 'primary' : 'secondary'}>パスワード</Button>
        </div>
        {!isPasswordLogin ? (
          <form onSubmit={handleMagicLink} className="p-6">
            <div className="text-center mb-6">
              <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Magic Linkでログイン</h2>
              <p className="text-gray-600">
                メールアドレスを入力するだけで、ドッグパークJPにログインできます。
              </p>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-start">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
            <Input
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<Mail className="w-4 h-4 text-gray-500" />}
              placeholder="example@email.com"
            />
            <Button type="submit" isLoading={isLoading} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
              <Mail className="w-4 h-4 mr-2" />
              ログインリンクを送信
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Magic Linkとは？</p>
                  <p>パスワードを覚える必要がなく、メールに送信されたリンクをクリックするだけで安全にログインできる便利な認証方法です。</p>
                  <ul className="mt-2 space-y-1">
                    <li>• パスワードを忘れる心配なし</li>
                    <li>• より安全なログイン体験</li>
                    <li>• ワンクリックでログイン完了</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                アカウントをお持ちでない方は{' '}
                <a href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                  こちらから新規登録
                </a>
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePasswordLogin} className="p-6">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">パスワードでログイン</h2>
              <p className="text-gray-600">メールアドレスとパスワードを入力してください。</p>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-start">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
            <Input
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<Mail className="w-4 h-4 text-gray-500" />}
              placeholder="example@email.com"
            />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="パスワード"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-500" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" isLoading={isLoading} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
              <Lock className="w-4 h-4 mr-2" />
              ログイン
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <div className="mt-4 text-center">
              <a href="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                パスワードをお忘れですか？
              </a>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
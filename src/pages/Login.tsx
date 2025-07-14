import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { Mail, Lock, AlertTriangle, ArrowRight, Eye, EyeOff, RefreshCw } from 'lucide-react';
import useAuth from '../context/AuthContext';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { clearAllStorageForLoginIssues, diagnoseLoginIssues } from '../utils/debugStorage';
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
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const navigate = useNavigate();

  // ローカルストレージからメールアドレスを取得して自動入力
  useEffect(() => {
    const savedEmail = safeGetItem('lastUsedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
    
    // 本番環境でのプリロード最適化
    if (import.meta.env.PROD) {
      // ダッシュボードページのプリロード
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = '/dashboard';
      document.head.appendChild(link);
      
      // クリーンアップ
      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    }
    
    // 本番環境以外では何も返さない
    return undefined;
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
      console.warn('Magic link error:', err);
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
      console.log('🔐 Starting password login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error('❌ Login error:', error);
        throw error;
      }

      if (data.user) {
        console.log('✅ Login successful for:', data.user.email);
        safeSetItem('lastUsedEmail', email);
        
        // 短い遅延を追加してセッション確立を待つ
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ログイン成功時のリダイレクト
        console.log('🚀 Redirecting to dashboard...');
        navigate('/dashboard');
      } else {
        throw new Error('ログインに成功しましたが、ユーザー情報を取得できませんでした。');
      }
    } catch (err: unknown) {
      console.warn('❌ Password login error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'ログインに失敗しました。';
      
      // Supabase特有のエラーメッセージを日本語化
      if (errorMessage.includes('Invalid login credentials')) {
        setError('メールアドレスまたはパスワードが正しくありません。');
      } else if (errorMessage.includes('Email not confirmed')) {
        setError('メールアドレスが確認されていません。メールを確認してリンクをクリックしてください。');
      } else if (errorMessage.includes('Too many requests')) {
        setError('ログイン試行回数が上限に達しました。しばらく待ってから再度お試しください。');
      } else {
        setError(`ログインに失敗しました: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ストレージクリア機能
  const handleClearStorage = () => {
    if (confirm('ローカルストレージをクリアしますか？これによりログイン問題が解決される場合があります。')) {
      const success = clearAllStorageForLoginIssues();
      if (success) {
        alert('ストレージをクリアしました。ページを再読み込みしてください。');
        window.location.reload();
      } else {
        alert('ストレージのクリアに失敗しました。');
      }
    }
  };

  // 診断機能
  const handleDiagnose = () => {
    diagnoseLoginIssues();
    alert('診断結果をコンソールに出力しました。F12を押してコンソールを確認してください。');
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">ログイン</h1>
      <Card>
        <div className="flex justify-center mb-4 space-x-2">
          <Button 
            type="button" 
            onClick={() => setIsPasswordLogin(false)} 
            variant={!isPasswordLogin ? 'primary' : 'secondary'}
            style={!isPasswordLogin ? { 
              backgroundColor: '#2563eb', 
              color: 'white',
              borderColor: '#2563eb'
            } : {
              backgroundColor: 'white',
              color: '#2563eb',
              borderColor: '#2563eb'
            }}
          >
            Magic Link
          </Button>
          <Button 
            type="button" 
            onClick={() => setIsPasswordLogin(true)} 
            variant={isPasswordLogin ? 'primary' : 'secondary'}
            style={isPasswordLogin ? { 
              backgroundColor: '#2563eb', 
              color: 'white',
              borderColor: '#2563eb'
            } : {
              backgroundColor: 'white',
              color: '#2563eb',
              borderColor: '#2563eb'
            }}
          >
            パスワード
          </Button>
        </div>
        {!isPasswordLogin ? (
          <form onSubmit={(e) => void handleMagicLink(e)} className="p-6">
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
          <form onSubmit={(e) => void handlePasswordLogin(e)} className="p-6">
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
        
        {/* ログインに問題がある場合 */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <button
            type="button"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-yellow-800">
              ログインに問題がある場合
            </span>
            <ArrowRight className={`w-4 h-4 text-yellow-600 transition-transform ${showAdvancedOptions ? 'rotate-90' : ''}`} />
          </button>
          
          {showAdvancedOptions && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-yellow-700">
                本番環境でログインに問題が発生する場合は、以下の操作をお試しください。
              </p>
              
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleDiagnose}
                  className="w-full text-left bg-white hover:bg-gray-50"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  ログイン問題の診断
                </Button>
                
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleClearStorage}
                  className="w-full text-left bg-white hover:bg-gray-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  ストレージをクリア
                </Button>
              </div>
              
              <div className="mt-3 p-3 bg-white rounded border text-xs text-gray-600">
                <p className="font-medium mb-1">推奨手順:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>「ログイン問題の診断」を実行</li>
                  <li>「ストレージをクリア」を実行</li>
                  <li>ブラウザを再起動</li>
                  <li>シークレットモードで動作確認</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
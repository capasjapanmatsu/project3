import { AlertTriangle, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import LineLoginButton from '../components/LineLoginButton';
import useAuth from '../context/AuthContext';
import { logger } from '../utils/logger';
import { notify } from '../utils/notification';

export function Login() {
  const { signInWithMagicLink, signInWithPassword, signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // URLクエリパラメータに基づいてログイン方法を決定
  const searchParams = new URLSearchParams(location.search);
  const loginMethod = searchParams.get('method');
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const infoMessage = searchParams.get('message');
  const [isPasswordLogin, setIsPasswordLogin] = useState(loginMethod !== 'magic');

  // ローカルストレージからメールアドレスを取得して自動入力（開発環境のみ）
  useEffect(() => {
    // 開発環境でのみ前回使用したメールアドレスを復元
    if (import.meta.env.DEV) {
      const savedEmail = localStorage.getItem('lastUsedEmail');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, []);

  // Magic Link
  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signInWithMagicLink(email);
      if (result.success) {
        localStorage.setItem('lastUsedEmail', email);
        notify.success('ログインリンクを送信しました。メールをご確認ください。');
        // Magic Linkの場合はメール確認後にリダイレクトされるため、ここでは遷移しない
      } else {
        setError(result.error || 'Magic Linkの送信に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      logger.error('❌ Magic link error:', error);
      setError(error instanceof Error ? error.message : 'Magic Linkの送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signInWithPassword(email, password);
      if (result.success) {
        notify.success('ログインしました。');
        navigate(redirectTo);
      } else {
        setError(result.error || 'ログインに失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      logger.error('❌ Password login error:', error);
      setError(error instanceof Error ? error.message : 'ログインに失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">ログイン</h1>
      
      {/* サブスクリプション誘導メッセージ */}
      {infoMessage && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">{decodeURIComponent(infoMessage)}</p>
            </div>
          </div>
        </div>
      )}
      
      <Card>
        {/* タブ切り替え */}
        <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
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
        </div>
        {isPasswordLogin ? (
          <form onSubmit={(e) => void handlePasswordLogin(e)} className="p-6">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">パスワードでログイン</h2>
              <p className="text-gray-600">
                メールアドレスとパスワードを入力してください。
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
              placeholder="dog@dogparkjp.com"
            />
            <div className="relative">
              <Input
                label="パスワード"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                icon={<Lock className="w-4 h-4 text-gray-500" />}
                placeholder="パスワードを入力"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full mt-6"
            >
              <Lock className="w-4 h-4 mr-2" />
              ログイン
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                パスワードをお忘れですか？
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={(e) => void handleMagicLinkLogin(e)} className="p-6">
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
              placeholder="dog@dogparkjp.com"
            />
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full mt-6"
            >
              <Mail className="w-4 h-4 mr-2" />
              ログインリンクを送信
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        )}
      </Card>

      <div className="relative flex items-center py-4">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="mx-3 text-gray-400 text-sm">または</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>

      {/* Googleアカウントでログイン */}
      <div className="mb-4">
        <Button
          onClick={() => void signInWithGoogle()}
          className="w-full bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
        >
          <img src="/icons/google.svg" alt="" className="w-5 h-5 mr-2" />
          Googleアカウントでログイン
        </Button>
      </div>

      {/* LINEでログイン（メール無しで作成可） */}
      <LineLoginButton full />
        
        {/* 管理者向け不具合報告 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
          <div className="text-center">
            <AlertTriangle className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              ログインできない場合
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              管理者向けに不具合を報告できます
            </p>
            <button
              type="button"
              onClick={() => window.open('mailto:info@dogparkjp.com?subject=ドッグパークJP - ログイン不具合報告&body=ログインに関する不具合を報告いたします。%0A%0A【発生状況】%0A%0A【エラー内容】%0A%0A【ブラウザ情報】%0A' + navigator.userAgent, '_blank')}
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Mail className="w-4 h-4 mr-2" />
              管理者に報告する
            </button>
          </div>
        </div>
        
        {/* 新規登録案内 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              こちらから新規登録
            </button>
          </p>
        </div>
        
        {/* スキップリンク */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            スキップ
          </button>
        </div>
        
        {/* 著作権表示 */}
        <div className="mt-4 pb-4 text-center">
          <p className="text-xs text-gray-500">
            © 2025 CAPAS Co., Ltd. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

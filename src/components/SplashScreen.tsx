import { AlertTriangle, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../context/AuthContext';
import { logger } from '../utils/logger';
import { notify } from '../utils/notification';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  // スプラッシュアニメーション状態
  const [splashPhase, setSplashPhase] = useState<'animation' | 'login'>('animation');
  const [imageOpacity, setImageOpacity] = useState(0.3);
  const [textCharacters, setTextCharacters] = useState<boolean[]>([]);

  // ログイン機能状態
  const { signInWithMagicLink, signInWithPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordLogin, setIsPasswordLogin] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation();

  const message = 'さぁ　ワンちゃんと冒険に出かけよう！';

  // URLクエリパラメータ処理
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const infoMessage = searchParams.get('message');

  // 文字ごとのふわっと浮上アニメーション
  const animateText = useCallback(() => {
    const chars = new Array(message.length).fill(false);
    setTextCharacters(chars);

    // 一文字ずつ順番にふわっと表示
    message.split('').forEach((_, index) => {
      setTimeout(() => {
        setTextCharacters(prev => {
          const newChars = [...prev];
          newChars[index] = true;
          return newChars;
        });
      }, index * 120);
    });

    // 全文字表示完了後、ログインフォームへ遷移
    setTimeout(() => {
      setSplashPhase('login');
    }, message.length * 120 + 1500);
  }, [message]);

  // 画像の薄い→濃いアニメーション
  useEffect(() => {
    if (splashPhase !== 'animation') return;

    const imageAnimation = () => {
      let opacity = 0.3;
      const fadeIn = () => {
        if (opacity < 1.0) {
          opacity += 0.015;
          setImageOpacity(opacity);
          requestAnimationFrame(fadeIn);
        } else {
          setTimeout(animateText, 500);
        }
      };
      fadeIn();
    };

    // プリロード処理
    const preloadRoutes = async () => {
      try {
        await Promise.allSettled([
          import('../pages/Home'),
          import('../context/AuthContext'),
        ]);
        console.log('🚀 主要コンポーネントのプリロード完了');
      } catch (error) {
        console.warn('プリロードエラー:', error);
      }
    };

    setTimeout(imageAnimation, 800);
    void preloadRoutes();
  }, [animateText, splashPhase]);

  // 開発環境でのメールアドレス自動入力
  useEffect(() => {
    if (import.meta.env.DEV) {
      const savedEmail = localStorage.getItem('lastUsedEmail');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, []);

  // Magic Link ログイン
  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signInWithMagicLink(email);
      if (result.success) {
        localStorage.setItem('lastUsedEmail', email);
        notify.success('ログインリンクを送信しました。メールをご確認ください。');
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

  // パスワードログイン
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signInWithPassword(email, password);
      if (result.success) {
        notify.success('ログインしました。');
        localStorage.setItem('hasSeenSplash', 'true');
        onComplete();
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

  // アニメーションフェーズ
  if (splashPhase === 'animation') {
    return (
      <div 
        className="fixed inset-0 z-[9999]"
        style={{
          background: 'linear-gradient(135deg, #E8F4FD 0%, #F0F8FF 25%, #FFF8E1 50%, #F3E5F5 75%, #E1F5FE 100%)'
        }}
      >
        <style>
          {`@import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@300;400;500&display=swap');`}
        </style>

        {/* ブランドロゴ */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
          <h1 className="text-3xl font-medium text-blue-400 opacity-80" style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}>
            ドッグパークJP
          </h1>
        </div>

        {/* メインコンテンツエリア */}
        <div className="flex flex-col items-center justify-center h-full space-y-12">
          {/* ワンちゃん画像 */}
          <div className="w-full flex justify-center relative">
            <img
              src="/images/splash-dog-running.jpg"
              alt="走るワンちゃん"
              className="max-w-full h-64 object-contain transition-opacity duration-1000"
              style={{ 
                opacity: imageOpacity,
                filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.1))'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) {
                  parent.innerHTML = `<div class="text-9xl animate-bounce opacity-80">🐕</div>`;
                }
              }}
            />
          </div>

          {/* ふわっと浮上するメッセージ */}
          <div className="text-center px-8 relative">
            <div className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-3xl shadow-lg" />
            <h2 
              className="relative text-4xl font-medium text-gray-700 leading-relaxed tracking-wide"
              style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}
            >
              {message.split('').map((char, index) => (
                <span
                  key={index}
                  className={`inline-block transition-all duration-700 ease-out ${
                    textCharacters[index] 
                      ? 'opacity-100 translate-y-0 scale-100' 
                      : 'opacity-0 translate-y-4 scale-95'
                  }`}
                  style={{
                    textShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transitionDelay: `${index * 50}ms`
                  }}
                >
                  {char === '　' ? '\u00A0' : char}
                </span>
              ))}
            </h2>
          </div>

          {/* ローディングインジケーター */}
          <div className="flex items-center space-x-3 text-blue-300 opacity-70">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-300 to-indigo-300 rounded-full animate-pulse" />
            <div className="w-3 h-3 bg-gradient-to-r from-blue-300 to-indigo-300 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            <div className="w-3 h-3 bg-gradient-to-r from-blue-300 to-indigo-300 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
            <span className="ml-4 text-lg font-light" style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}>
              準備中...
            </span>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 text-sm text-blue-300 opacity-60" style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}>
          v1.0.0
        </div>
      </div>
    );
  }

  // ログインフェーズ
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #E8F4FD 0%, #F0F8FF 25%, #FFF8E1 50%, #F3E5F5 75%, #E1F5FE 100%)'
      }}
    >
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@300;400;500&display=swap');`}
      </style>

      <div className="w-full max-w-md">
        {/* ブランドロゴ */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium text-blue-400 mb-2" style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}>
            ドッグパークJP
          </h1>
          <p className="text-lg text-gray-600" style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}>
            ログインして冒険を始めよう！
          </p>
        </div>

        {/* サブスクリプション誘導メッセージ */}
        {infoMessage && (
          <div className="mb-6 p-4 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl">
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
        
        <div className="backdrop-blur-sm bg-white/90 shadow-xl border border-white/20 rounded-lg p-6">
          {/* タブ切り替え */}
          <div className="flex mb-6 bg-gray-100/50 p-1 rounded-lg">
            <button 
              type="button" 
              onClick={() => setIsPasswordLogin(true)} 
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-all ${
                isPasswordLogin 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'text-blue-500 hover:bg-white/50'
              }`}
              style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}
            >
              <Lock className="w-4 h-4 mr-2" />
              パスワード
            </button>
            <button 
              type="button" 
              onClick={() => setIsPasswordLogin(false)} 
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-all ${
                !isPasswordLogin 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'text-blue-500 hover:bg-white/50'
              }`}
              style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}
            >
              <Mail className="w-4 h-4 mr-2" />
              マジックリンク
            </button>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 p-3 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-lg flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
              <span className="text-sm text-red-700" style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}>{error}</span>
            </div>
          )}

          {/* パスワードログインフォーム */}
          {isPasswordLogin ? (
            <form onSubmit={(e) => { void handlePasswordLogin(e); }} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}>
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="メールアドレスを入力"
                  required
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}>
                  パスワード
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    required
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}
              >
                {isLoading ? '処理中...' : 'ログイン'}
              </button>
            </form>
          ) : (
            // マジックリンクログインフォーム
            <form onSubmit={(e) => { void handleMagicLinkLogin(e); }} className="space-y-4">
              <div>
                <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}>
                  メールアドレス
                </label>
                <input
                  id="magic-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="メールアドレスを入力"
                  required
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}
              >
                {isLoading ? '送信中...' : 'マジックリンクを送信'}
              </button>
              <p className="text-xs text-gray-500 text-center" style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}>
                メールアドレスに送信されるリンクをクリックしてログインします
              </p>
            </form>
          )}
        </div>

        {/* スキップボタン（開発用） */}
        {import.meta.env.DEV && (
          <div className="text-center mt-4">
            <button
              onClick={() => {
                localStorage.setItem('hasSeenSplash', 'true');
                onComplete();
              }}
              className="text-sm text-blue-400 hover:text-blue-600 underline"
              style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}
            >
              スキップ（開発用）
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplashScreen; 
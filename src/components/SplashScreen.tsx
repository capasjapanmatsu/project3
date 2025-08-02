import { AlertTriangle, ArrowRight, Eye, EyeOff, Lock, Mail, UserPlus } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../context/AuthContext';
import { logger } from '../utils/logger';
import { notify } from '../utils/notification';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  // アニメーション状態
  const [imageOpacity, setImageOpacity] = useState(0.3);
  const [textCharacters, setTextCharacters] = useState<boolean[]>([]);
  const [showLoginForm, setShowLoginForm] = useState(false);

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

  // メッセージを2行に分割
  const message1 = 'さぁ　ワンちゃんと';
  const message2 = '冒険に出かけよう！';
  const fullMessage = message1 + message2;

  // URLクエリパラメータ処理
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const infoMessage = searchParams.get('message');

  // 文字ごとのふわっと浮上アニメーション
  const animateText = useCallback(() => {
    const chars = new Array(fullMessage.length).fill(false);
    setTextCharacters(chars);

    // 一文字ずつ順番にふわっと表示
    fullMessage.split('').forEach((_, index) => {
      setTimeout(() => {
        setTextCharacters(prev => {
          const newChars = [...prev];
          newChars[index] = true;
          return newChars;
        });
      }, index * 120);
    });

    // 全文字表示完了後、ログインフォームをフェードイン
    setTimeout(() => {
      setShowLoginForm(true);
    }, fullMessage.length * 120 + 1000);
  }, [fullMessage]);

  // 画像の薄い→濃いアニメーション
  useEffect(() => {
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
  }, [animateText]);

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

  return (
    <div 
      className="fixed inset-0 z-[9999] overflow-y-auto"
      style={{
        background: 'linear-gradient(135deg, #E8F4FD 0%, #F0F8FF 25%, #FFF8E1 50%, #F3E5F5 75%, #E1F5FE 100%)'
      }}
    >
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@300;400;500;700;900&display=swap');`}
      </style>

      <div className="min-h-screen flex flex-col">
        {/* 上部：白い背景エリア（ロゴ） */}
        <div className="bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center">
            {/* ロゴアイコン（青い丸なし） */}
            <img
              src="/icons/icon_android_48x48.png"
              alt="ドッグパーク"
              className="w-12 h-12 sm:w-16 sm:h-16"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) {
                  parent.innerHTML = '<span class="text-4xl sm:text-5xl">🐕</span>';
                }
              }}
            />
            
            {/* テキスト部分 */}
            <div className="ml-4">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                <span className="text-black">ドッグパーク</span>
                <span className="text-blue-500">JP</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 leading-tight">
                愛犬との素敵な時間を
              </p>
            </div>
          </div>
        </div>

        {/* 下部：画像エリア */}
        <div className="flex-1 relative">
          {/* 画面いっぱいの画像 */}
          <img
            src="/images/splash-dog-running.jpg"
            alt="走るワンちゃん"
            className="w-full h-full object-cover transition-opacity duration-1000"
            style={{ 
              opacity: imageOpacity,
              filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.2))'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLElement).parentElement;
              if (parent) {
                parent.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center"><div class="text-8xl sm:text-9xl animate-bounce opacity-80">🐕</div></div>';
              }
            }}
          />

          {/* 画像上のオーバーレイとメッセージ */}
          <div className="absolute bottom-0 left-0 right-0 pb-4">
            <div className="text-center w-full">
              {/* 2行のメッセージ（背景なし、強い白縁） */}
              <div className="space-y-2 px-4">
                {/* 1行目: さぁ　ワンちゃんと */}
                <h2 
                  className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-wide"
                  style={{ 
                    fontFamily: 'Zen Maru Gothic, sans-serif',
                    textShadow: '0 0 10px rgba(255,255,255,1), 0 0 20px rgba(255,255,255,1), 0 0 30px rgba(255,255,255,0.8), 2px 2px 4px rgba(255,255,255,1), -2px -2px 4px rgba(255,255,255,1), 2px -2px 4px rgba(255,255,255,1), -2px 2px 4px rgba(255,255,255,1)'
                  }}
                >
                  {message1.split('').map((char, index) => (
                    <span
                      key={index}
                      className={`inline-block transition-all duration-1000 ease-out ${
                        textCharacters[index] 
                          ? 'opacity-100 translate-y-0 scale-100' 
                          : 'opacity-0 translate-y-4 scale-95'
                      }`}
                      style={{
                        transitionDelay: `${index * 100}ms`,
                        color: textCharacters[index] ? '#355E3B' : 'rgba(53, 94, 59, 0.3)'
                      }}
                    >
                      {char === '　' ? '\u00A0' : char}
                    </span>
                  ))}
                </h2>
                
                {/* 2行目: 冒険に出かけよう！ */}
                <h2 
                  className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-wide"
                  style={{ 
                    fontFamily: 'Zen Maru Gothic, sans-serif',
                    textShadow: '0 0 10px rgba(255,255,255,1), 0 0 20px rgba(255,255,255,1), 0 0 30px rgba(255,255,255,0.8), 2px 2px 4px rgba(255,255,255,1), -2px -2px 4px rgba(255,255,255,1), 2px -2px 4px rgba(255,255,255,1), -2px 2px 4px rgba(255,255,255,1)'
                  }}
                >
                  {message2.split('').map((char, index) => (
                    <span
                      key={index + message1.length}
                      className={`inline-block transition-all duration-1000 ease-out ${
                        textCharacters[index + message1.length] 
                          ? 'opacity-100 translate-y-0 scale-100' 
                          : 'opacity-0 translate-y-4 scale-95'
                      }`}
                      style={{
                        transitionDelay: `${(index + message1.length) * 100}ms`,
                        color: textCharacters[index + message1.length] ? '#3C6E47' : 'rgba(60, 110, 71, 0.3)'
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </h2>
              </div>
            </div>
          </div>

          {/* ローディングインジケーター（ログインフォーム表示前のみ） */}
          {!showLoginForm && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex items-center space-x-3 text-white opacity-80">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
              <span className="ml-4 text-lg font-light">
                準備中...
              </span>
            </div>
          )}
        </div>

        {/* ログインフォーム（フェードイン） */}
        <div className={`w-full transition-all duration-800 ${
          showLoginForm ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        } ${showLoginForm ? '' : 'absolute top-full'}`}>
          <div className="max-w-md mx-auto p-4">
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
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Magic Link
                </button>
              </div>

              {/* エラーメッセージ */}
              {error && (
                <div className="mb-4 p-3 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-lg flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {/* フォーム共通コンテナ（高さ統一） */}
              <div className="min-h-[200px] flex flex-col justify-between">
                {/* パスワードログインフォーム */}
                {isPasswordLogin ? (
                  <form onSubmit={(e) => { void handlePasswordLogin(e); }} className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
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
                    <div className="mt-6">
                      <button
                        type="submit"
                        disabled={isLoading || !email || !password}
                        className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? '処理中...' : 'ログイン'}
                      </button>
                    </div>
                  </form>
                ) : (
                  // マジックリンクログインフォーム（高さ統一）
                  <form onSubmit={(e) => { void handleMagicLinkLogin(e); }} className="space-y-4">
                    <div>
                      <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 mb-1">
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
                    {/* スペーサー（パスワードフィールドと同じ高さを確保） */}
                    <div className="h-[68px] flex items-end">
                      <p className="text-xs text-gray-500 text-center w-full">
                        メールアドレスに送信されるリンクをクリックしてログインします
                      </p>
                    </div>
                    <div className="mt-6">
                      <button
                        type="submit"
                        disabled={isLoading || !email}
                        className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? '送信中...' : 'Send Magic Link'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* 新規登録リンク */}
              <div className="mt-6 pt-4 border-t border-gray-200/50">
                <p className="text-center text-sm text-gray-600">
                  アカウントをお持ちでない方は{' '}
                  <button
                    onClick={() => navigate('/register')}
                    className="text-blue-500 hover:text-blue-700 underline font-medium inline-flex items-center"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    こちらから新規登録
                  </button>
                </p>
              </div>
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
                >
                  スキップ（開発用）
                </button>
              </div>
            )}
          </div>
        </div>

        {/* バージョン情報 */}
        <div className="flex-shrink-0 text-center pb-6">
          <div className="text-sm text-blue-300 opacity-60">
            v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen; 
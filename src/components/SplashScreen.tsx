import { AlertTriangle, ArrowRight, Dog, Eye, EyeOff, Lock, Mail, UserPlus } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../context/AuthContext';
import { logger } from '../utils/logger';
import { queryClient } from '../utils/queryClient';

interface SplashScreenProps {
  onComplete: () => void;
}

const MIN_SPLASH_MS = 3500; // 最低表示 3.5秒
const PREFETCH_CONCURRENCY = 1; // 同時ロード数を最小にして初期TBTを抑制

// 汎用: 画像のプリロード
const preloadImage = (src: string) => new Promise<void>((resolve) => {
  const img = new Image();
  img.onload = () => resolve();
  img.onerror = () => resolve();
  img.src = src;
});

// 汎用: <link rel="prefetch"> を追加
const prefetchLink = (href: string, as?: string) => {
  try {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    if (as) link.as = as as any;
    document.head.appendChild(link);
  } catch {
    // no-op
  }
};

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithMagicLink, signInWithPassword, signInWithGoogle, signInWithTwitter } = useAuth();

  const [imageOpacity, setImageOpacity] = useState(0);
  const [showLoginForm] = useState(true); // 常にログインフォームを表示
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordLogin, setIsPasswordLogin] = useState(true); // デフォルトでパスワードログイン
  const [textOpacity, setTextOpacity] = useState(0.1); // 文字の濃さを制御
  const [imageOpacityFilter, setImageOpacityFilter] = useState(0.3); // 画像の濃さを制御
  const [whiteFlashOpacity, setWhiteFlashOpacity] = useState(0); // ホワイトフラッシュの透明度
  const [underlineStart, setUnderlineStart] = useState(false); // タイピング後に下線描画
  const headline1Ref = useRef<HTMLSpanElement | null>(null);
  const headline2Ref = useRef<HTMLSpanElement | null>(null);

  // プリロード関連の状態
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [dogPosition, setDogPosition] = useState(0);
  const [loadingTasks, setLoadingTasks] = useState<string[]>([]);
  const [isPreloading, setIsPreloading] = useState(true);

  const message1 = ' さあ！ワンちゃんと';
  const message2 = ' 冒険に出かけましょう';
  
  // スライドイン制御（全文入力後に横から登場）
  const [slideIn1, setSlideIn1] = useState(false);
  const [slideIn2, setSlideIn2] = useState(false);
  const [startHeadlineAnim, setStartHeadlineAnim] = useState(false);

  // タイピング表示用フラグ配列（1文字ずつ表示）
  const [typed1, setTyped1] = useState<boolean[]>(() => new Array(message1.length).fill(false));
  const [typed2, setTyped2] = useState<boolean[]>(() => new Array(message2.length).fill(false));

  // タイピング演出は廃止し、行全体のスライドのみ使用（→今回リクエストでタイピング復活）

  // URLクエリパラメータ処理
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const infoMessage = searchParams.get('message');

  // フラッシュ後に文字を1文字ずつ出し、その後スライドイン
  const onTypingCompleted = useCallback(() => {
    // 既存のスライドは維持（使わないが後方互換）
    setSlideIn1(true);
    setTimeout(() => setSlideIn2(true), 80);
    // 新アニメーション開始トリガ
    setStartHeadlineAnim(true);
  }, []);

  // 文字と画像の色を濃くするアニメーション
  const startTextColorAnimation = useCallback(() => {
    const duration = 3000; // 3秒
    const startTime = Date.now();
    const textStartOpacity = 0.1;
    const textEndOpacity = 1.0;
    const imageStartOpacity = 0.3;
    const imageEndOpacity = 1.0;
    
    const animateOpacity = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // より優しいイージング関数（ease-in-out）
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      // 文字のopacity
      const currentTextOpacity = textStartOpacity + (textEndOpacity - textStartOpacity) * easeProgress;
      setTextOpacity(currentTextOpacity);
      
      // 画像のopacity
      const currentImageOpacity = imageStartOpacity + (imageEndOpacity - imageStartOpacity) * easeProgress;
      setImageOpacityFilter(currentImageOpacity);
      
      if (progress < 1) {
        requestAnimationFrame(animateOpacity);
      } else {
        // アニメーション完了後にフラッシュを更に早く開始
        setTimeout(() => {
          startWhiteFlash();
        }, 0);
      }
    };
    
    requestAnimationFrame(animateOpacity);
  }, []);

  // ホワイトフラッシュアニメーション
  const startWhiteFlash = useCallback(() => {
    const flashDuration = 400; // 0.4秒
    const startTime = Date.now();
    
    const animateFlash = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / flashDuration, 1);
      
      let opacity;
      if (progress < 0.1) {
        // 最初の0.04秒で急激に明るくなる
        opacity = progress * 10; // 0 → 1
      } else {
        // 残りの0.36秒でゆっくりフェードアウト
        const fadeProgress = (progress - 0.1) / 0.9;
        opacity = 1 - Math.pow(fadeProgress, 2); // 1 → 0 (ease-out)
      }
      
      setWhiteFlashOpacity(opacity);
      
      if (progress < 1) {
        requestAnimationFrame(animateFlash);
      } else {
        setWhiteFlashOpacity(0);
        // フラッシュ完了後にタイピングを開始
        let i = 0;
        const type1 = () => {
          if (i < message1.length) {
            setTyped1(prev => { const a = [...prev]; a[i] = true; return a; });
            i++;
            setTimeout(type1, 60);
          } else {
            let j = 0;
            const type2 = () => {
              if (j < message2.length) {
                setTyped2(prev => { const b = [...prev]; b[j] = true; return b; });
                j++;
                setTimeout(type2, 60);
              } else {
                // すべてのタイピングが完了 → 下線アニメ開始
                setTimeout(() => {
                  setUnderlineStart(true);
                }, 100);
              }
            };
            type2();
          }
        };
        type1();
      }
    };
    
    requestAnimationFrame(animateFlash);
  }, [message1.length, message2.length]);

  // 画像とテキストのアニメーション
  useEffect(() => {
    // LIFFログイン直後は一度だけスプラッシュをスキップ
    try {
      const skip = localStorage.getItem('skipSplashOnce');
      if (skip === '1') {
        localStorage.removeItem('skipSplashOnce');
        onComplete();
        return; // 以降のスプラッシュ表示ロジックは実行しない
      }
    } catch {}

    const imageAnimation = () => {
      const fadeIn = () => {
        setImageOpacity(prev => {
          const newOpacity = Math.min(prev + 0.02, 1);
          if (newOpacity < 1) {
            requestAnimationFrame(fadeIn);
          } else {
            // ズームアウト試験演出はCSSアニメーションで進行するためJS操作不要
            // 画像フェード完了後は色を濃くするアニメーションへ
            setTimeout(startTextColorAnimation, 500);
          }
          return newOpacity;
        });
      };
      requestAnimationFrame(fadeIn);
    };

    setTimeout(imageAnimation, 800);
  }, [startTextColorAnimation]);

  // 並列制御付きプリロード
  const runWithConcurrency = useCallback(async (items: {name: string; loader: () => Promise<unknown>}[], update: (done: number, total: number) => void) => {
    let index = 0;
    let done = 0;
    const total = items.length;

    const worker = async () => {
      while (index < total) {
        const current = index++;
        const task = items[current];
        try {
          await task.loader();
        } catch (e) {
          console.warn('Preload failed:', task.name, e);
        } finally {
          done++;
          update(done, total);
          await new Promise((r) => setTimeout(r, 120)); // 少し間隔
        }
      }
    };

    const workers = Array.from({ length: Math.min(PREFETCH_CONCURRENCY, total) }, () => worker());
    await Promise.all(workers);
  }, []);

  // 拡張プリロード処理（進歩追跡付き）
  useEffect(() => {
    let isMounted = true;
    const startAt = Date.now();
    
    const preloadResources = async () => {
      if (!isMounted) return;

      // 主要ページの事前読み込みは本番では実施しない（Lighthouse/TBT抑制）
      const routeTasks: { name: string; loader: () => Promise<unknown> }[] = import.meta.env.DEV ? [
        { name: 'Home', loader: () => import('../pages/Home') },
      ] : [];

      // 共通コンポーネント
      const componentTasks: { name: string; loader: () => Promise<unknown> }[] = import.meta.env.DEV ? [
        { name: 'Navbar', loader: () => import('../components/Navbar') },
      ] : [];

      // 画像・アイコン
      const imageTasks: { name: string; loader: () => Promise<unknown> }[] = [
        { name: 'Splash', loader: () => preloadImage('/images/splash-dog-running.webp') },
        { name: 'Passport', loader: () => preloadImage('/images/passport-watermark.webp') },
        { name: 'Icon192', loader: () => preloadImage('/icons/icon_android_192x192.png') },
        { name: 'Icon144', loader: () => preloadImage('/icons/icon_android_144x144.png') },
        { name: 'Favicon', loader: () => preloadImage('/favicon.svg') },
      ];

      // 事前にprefetchリンク（ブラウザに任せる）
      ['/login'].forEach((p) => prefetchLink(p));

      // API先読み（安全な軽量クエリのみ）
      const apiTasks: { name: string; loader: () => Promise<unknown> }[] = [
        {
          name: 'PrefetchFacilities',
          loader: async () => {
            const key = ['facilities'];
            if (!queryClient.getQueryData(key)) {
              // 失敗してもUXを阻害しない
              try {
                const mod = await import('../hooks/useFacilityQueries');
                // fetch関数を直接呼び出せないため、クエリ関数を再定義
                const { supabase } = await import('../utils/supabase');
                const { data, error } = await supabase
                  .from('pet_facilities')
                  .select('*')
                  .limit(20);
                if (!error && data) {
                  queryClient.setQueryData(key, data);
                }
              } catch {}
            }
          },
        },
      ];

      const tasks = [...routeTasks, ...componentTasks, ...imageTasks, ...apiTasks];
      setLoadingTasks(tasks.map((t) => t.name));

      let lastPercent = 0;
      const update = (done: number, total: number) => {
        if (!isMounted) return;
        const percent = Math.max(lastPercent, Math.round((done / total) * 100));
        lastPercent = percent;
        setPreloadProgress(percent);
        setDogPosition(percent);
      };

      await runWithConcurrency(tasks, update);

      // 最低表示時間を満たすまで待機
      const elapsed = Date.now() - startAt;
      if (elapsed < MIN_SPLASH_MS) {
        await new Promise((r) => setTimeout(r, MIN_SPLASH_MS - elapsed));
      }

      if (isMounted) {
        setIsPreloading(false);
      }
    };

    void preloadResources();
    
    return () => {
      isMounted = false;
    };
  }, [runWithConcurrency]);

  // 開発環境でのメールアドレス自動入力
  useEffect(() => {
    if (import.meta.env.DEV) {
      const savedEmail = localStorage.getItem('lastUsedEmail');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, []); // 空の依存配列で一度だけ実行

  // Magic Link ログイン
  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signInWithMagicLink(email);
      if (result.success) {
        localStorage.setItem('lastUsedEmail', email);
        // Magic Linkの場合は送信完了メッセージを表示
        setError('');
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
        localStorage.setItem('lastUsedEmail', email);
        // ログイン成功時は少し遅延させてからスプラッシュ画面を終了
        setTimeout(() => {
          onComplete();
        }, 100);
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
      {/* ホワイトフラッシュエフェクト */}
      <div
        className="fixed inset-0 z-[10000] bg-white pointer-events-none transition-opacity duration-100"
        style={{
          opacity: whiteFlashOpacity,
          mixBlendMode: 'screen'
        }}
      />
      
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;800;900&display=swap');
        
        @keyframes logoSlideIn {
          0% {
            transform: translateX(-100px) rotate(-180deg);
            opacity: 0;
          }
          50% {
            transform: translateX(10px) rotate(10deg);
          }
          100% {
            transform: translateX(0) rotate(0deg);
            opacity: 1;
          }
        }
        
        @keyframes textReveal {
          0% {
            transform: translateY(20px);
            opacity: 0;
            letter-spacing: 0.3em;
          }
          50% {
            letter-spacing: 0.1em;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
            letter-spacing: normal;
          }
        }
        
        @keyframes jpPop {
          0% {
            transform: scale(0) rotate(180deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(10deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        
        @keyframes subtitleFade {
          0% {
            transform: translateX(-20px);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        /* スプラッシュスクリーンのアニメーションは常に有効にする */
        .logo-icon {
          animation: logoSlideIn 0.8s ease-out forwards !important;
          animation-duration: 0.8s !important;
          animation-iteration-count: 1 !important;
        }
        
        .text-dogpark {
          animation: textReveal 0.6s ease-out 0.3s forwards !important;
          animation-duration: 0.6s !important;
          animation-delay: 0.3s !important;
          animation-iteration-count: 1 !important;
          opacity: 0;
        }
        
        .text-jp {
          animation: jpPop 0.5s ease-out 0.7s forwards !important;
          animation-duration: 0.5s !important;
          animation-delay: 0.7s !important;
          animation-iteration-count: 1 !important;
          opacity: 0;
          display: inline-block;
        }
        
        .subtitle-text {
          animation: subtitleFade 0.6s ease-out 1s forwards !important;
          animation-duration: 0.6s !important;
          animation-delay: 1s !important;
          animation-iteration-count: 1 !important;
          opacity: 0;
        }

        /* ロゴタイトルに合わせた挙動: それぞれ独立に出現 */
        .hidden-left { transform: translate3d(-120%,0,0); opacity: 0; }
        .hidden-right { transform: translate3d(120%,0,0); opacity: 0; }
        .hidden-up { transform: translate3d(0,24px,0); opacity: 0; }

        .anim-left { animation: animLeft 20s cubic-bezier(0.18, 0.9, 0.2, 1) forwards; }
        .anim-right { animation: animRight 20s cubic-bezier(0.18, 0.9, 0.2, 1) forwards; }
        .anim-up { animation: animUp 20s cubic-bezier(0.18, 0.9, 0.2, 1) forwards; }

        @keyframes animLeft {
          0% { transform: translate3d(-120%,0,0); opacity: 0; }
          70% { transform: translate3d(1.5%,0,0); opacity: 1; }
          88% { transform: translate3d(0,-6px,0); }
          100% { transform: translate3d(0,0,0); opacity: 1; }
        }
        @keyframes animRight {
          0% { transform: translate3d(120%,0,0); opacity: 0; }
          70% { transform: translate3d(-1.5%,0,0); opacity: 1; }
          88% { transform: translate3d(0,-6px,0); }
          100% { transform: translate3d(0,0,0); opacity: 1; }
        }
        @keyframes animUp {
          0% { transform: translate3d(0,24px,0); opacity: 0; }
          75% { transform: translate3d(0,-2px,0); opacity: 1; }
          100% { transform: translate3d(0,0,0); opacity: 1; }
        }
        `}
      </style>

      <div className="min-h-screen flex flex-col">
        {/* 上部白帯は非表示（画像内オーバーレイのみ使用） */}

        {/* 中央画像とメッセージ */}
        <div className="flex-1 relative">
          {/* 画面いっぱいの画像 */}
          <img
            src="/images/splash-dog-running.webp"
            alt="走るワンちゃん"
            className="w-full h-full object-cover transition-opacity duration-1000"
            style={{ 
              opacity: imageOpacity,
              filter: `opacity(${imageOpacityFilter})`
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLElement).parentElement;
              if (parent) {
                parent.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-blue-200 to-green-200 flex items-center justify-center"><span class="text-8xl">🐕</span></div>';
              }
            }}
          />

          {/* 画像上部 オーバーレイ ロゴ＋タイトル（上部ヘッダーと同じ動き） */}
          <div className="absolute top-2 left-0 right-0 px-4 sm:px-6 z-[2]">
            <div className="mx-auto max-w-6xl">
              <div className="inline-flex items-center bg-transparent">
                {/* ロゴアイコン（既存と同じアニメーション） */}
                <div className="logo-icon">
                  <img
                    src="/icons/icon_ios_180x180.png"
                    alt="ドッグパーク"
                    className="w-12 h-12 sm:w-16 sm:h-16"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                {/* タイトルテキスト（既存と同じアニメーション） */}
                <div className="ml-3">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-dogpark">
                    ドッグパーク<span className="text-jp text-blue-600 ml-1">JP</span>
                  </h2>
                  <p className="subtitle-text text-sm sm:text-lg text-gray-700 -mt-2">
                    愛犬との素敵な時間を
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 画像上のオーバーレイとメッセージ */}
          <div className="absolute bottom-0 left-0 right-0 pb-4">
            <div className="text-center w-full pl-2">
              {/* 2行のメッセージ（背景なし、強い白縁） */}
              <div className="space-y-2 px-4">
                <h2 
                className={`text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-wide`}
                style={{ 
                  fontFamily: '"M PLUS Rounded 1c", Zen Maru Gothic, sans-serif',
                  textShadow: '0 0 10px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.8), 0 0 30px rgba(255,255,255,0.6), 2px 2px 4px rgba(255,255,255,0.9), -2px -2px 4px rgba(255,255,255,0.9), 2px -2px 4px rgba(255,255,255,0.9), -2px 2px 4px rgba(255,255,255,0.9)',
                  color: '#355E3B'
                }}
              >
                <span ref={headline1Ref} className="relative inline-block">
                  {message1.split('').map((c, idx) => (
                    <span key={idx} className={`inline-block transition-opacity duration-150 ${typed1[idx] ? 'opacity-100' : 'opacity-0'}`}>{c}</span>
                  ))}
                  {/* 手書き風下線（左→右へ描画） */}
                  <svg
                    className="absolute left-0"
                    style={{ bottom: '-0.15em' }}
                    width={headline1Ref.current?.offsetWidth || 0}
                    height={24}
                  >
                    <path
                      d={`M0 12 Q ${(headline1Ref.current?.offsetWidth || 0) * 0.25} 24, ${(headline1Ref.current?.offsetWidth || 0) * 0.5} 12 Q ${(headline1Ref.current?.offsetWidth || 0) * 0.75} 0, ${(headline1Ref.current?.offsetWidth || 0)} 12`}
                      fill="none"
                      stroke="rgba(239, 68, 68, 0.5)" /* 赤系 with 透明度 */
                      strokeWidth={12}
                      strokeLinecap="round"
                      style={{
                        strokeDasharray: 1200,
                        strokeDashoffset: underlineStart ? 0 : 1200,
                        transition: 'stroke-dashoffset 700ms ease-out 80ms'
                      }}
                    />
                  </svg>
                </span>
                </h2>
                <h2 
                className={`text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-wide`}
                style={{ 
                  fontFamily: '"M PLUS Rounded 1c", Zen Maru Gothic, sans-serif',
                  textShadow: '0 0 10px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.8), 0 0 30px rgba(255,255,255,0.6), 2px 2px 4px rgba(255,255,255,0.9), -2px -2px 4px rgba(255,255,255,0.9), 2px -2px 4px rgba(255,255,255,0.9), -2px 2px 4px rgba(255,255,255,0.9)',
                  color: '#3C6E47'
                }}
              >
                <span ref={headline2Ref} className="relative inline-block">
                  {message2.split('').map((c, idx) => (
                    <span key={idx} className={`inline-block transition-opacity duration-150 ${typed2[idx] ? 'opacity-100' : 'opacity-0'}`}>{c}</span>
                  ))}
                  {/* 手書き風下線（左→右へ描画） */}
                  <svg
                    className="absolute left-0"
                    style={{ bottom: '-0.15em' }}
                    width={headline2Ref.current?.offsetWidth || 0}
                    height={24}
                  >
                    <path
                      d={`M0 12 Q ${(headline2Ref.current?.offsetWidth || 0) * 0.25} 24, ${(headline2Ref.current?.offsetWidth || 0) * 0.5} 12 Q ${(headline2Ref.current?.offsetWidth || 0) * 0.75} 0, ${(headline2Ref.current?.offsetWidth || 0)} 12`}
                      fill="none"
                      stroke="rgba(239, 68, 68, 0.5)"
                      strokeWidth={12}
                      strokeLinecap="round"
                      style={{
                        strokeDasharray: 1200,
                        strokeDashoffset: underlineStart ? 0 : 1200,
                        transition: 'stroke-dashoffset 700ms ease-out 220ms'
                      }}
                    />
                  </svg>
                </span>
                </h2>
              </div>
            </div>
          </div>

          {/* プリロード進行表示（プリロード中のみ） */}
          {isPreloading && (
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-80 max-w-[90vw]">
              {/* スピナー */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-gray-400/50 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <Dog className="w-8 h-8 text-gray-600" />
                  </div>
                </div>
              </div>
              
              {/* プログレスバーコンテナ */}
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg">
                {/* プログレスバー背景 */}
                <div className="relative bg-white/30 rounded-full h-8 overflow-hidden">
                  {/* プログレスバー */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${preloadProgress}%` }}
                  />
                  
                  {/* 走る犬のアイコン */}
                  <div 
                    className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-300 ease-out"
                    style={{ 
                      left: `calc(${dogPosition}% - 12px)`,
                      transform: 'translateY(-50%)'
                    }}
                  >
                    <Dog className="w-6 h-6 text-gray-700 drop-shadow-md" />
                  </div>
                </div>
              </div>
              
              {/* 進行状況テキスト */}
              <div className="text-center mt-3">
                <p className="text-white text-sm font-medium" style={{
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>
                  準備中... {Math.round(preloadProgress)}%
                </p>
                <p className="text-white/80 text-xs mt-1" style={{
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}>
                  アプリを最適化しています
                </p>
              </div>
            </div>
          )}
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
              <div className="min-h-[220px] flex flex-col justify-between">
                {/* OAuthボタン群 */}
                <div className="space-y-2 mb-2">
                  {/* Googleログイン */}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        localStorage.setItem('skipSplashOnce', '1');
                        localStorage.setItem('hasSeenSplash', 'true');
                      } catch {}
                      await signInWithGoogle();
                    }}
                    className="w-full py-2 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 font-medium rounded-md transition-all flex items-center justify-center"
                    aria-label="Googleアカウントでログイン"
                  >
                    <img src="/icons/google.svg" alt="" className="w-5 h-5 mr-2" />
                    <span className="text-gray-900 font-semibold">Googleアカウントでログイン</span>
                  </button>
                  {/* X(Twitter)ログイン */}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        localStorage.setItem('skipSplashOnce', '1');
                        localStorage.setItem('hasSeenSplash', 'true');
                      } catch {}
                      await signInWithTwitter();
                    }}
                    className="w-full py-2 px-4 bg-black hover:bg-gray-900 text-white font-medium rounded-md transition-all flex items-center justify-center"
                    aria-label="X (Twitter) でログイン"
                  >
                    <img src="/icons/x.svg" alt="" className="w-5 h-5 mr-2" />
                    X (Twitter) でログイン
                  </button>
                  {/* LINEログイン（ロゴ付き） */}
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        // LIFF後のワンタイムスキップと、当面の再表示抑止の両方
                        localStorage.setItem('skipSplashOnce', '1');
                        localStorage.setItem('hasSeenSplash', 'true');
                      } catch {}
                      window.location.assign('/liff/login');
                    }}
                    className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-all flex items-center justify-center"
                    aria-label="LINEでログイン（スプラッシュをスキップ）"
                  >
                    <img src="/icons/line.svg" alt="" className="w-5 h-5 mr-2" />
                    LINEアカウントでログイン
                  </button>
                </div>
                {/* 画面内で確実に見えるスキップ導線（カード内） */}
                <div className="mb-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      try { localStorage.setItem('hasSeenSplash', 'true'); } catch {}
                      onComplete();
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    今はスキップして先へ進む
                  </button>
                </div>
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
                        {isLoading ? '送信中...' : 'メールを送信'}
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
                    onClick={() => {
                      try { localStorage.setItem('hasSeenSplash', 'true'); } catch {}
                      onComplete();
                      navigate('/register');
                    }}
                    className="text-blue-500 hover:text-blue-700 underline font-medium inline-flex items-center"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    こちらから新規登録
                  </button>
                </p>
              </div>
            </div>

            {/* スキップボタン（本番でも常に表示） */}
            <div className="text-center mt-4">
              <button
                onClick={() => {
                  try { localStorage.setItem('hasSeenSplash', 'true'); } catch {}
                  onComplete();
                }}
                className="text-sm text-blue-500 hover:text-blue-700 underline"
                aria-label="スプラッシュをスキップして本編へ進む"
              >
                スキップ
              </button>
            </div>
          </div>
        </div>

        {/* 著作権表示 */}
        <div className="flex-shrink-0 text-center pb-6">
          <div className="text-sm text-gray-600 opacity-80">
            © 2025 CAPAS Co., Ltd. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen; 
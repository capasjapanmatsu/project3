import {
    Bell,
    Download,
    LogOut,
    Settings,
    Shield,
    ShoppingCart
} from 'lucide-react';
import { Suspense, lazy, memo, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { log, safeSupabaseQuery } from '../utils/helpers';
import isIOS from '../utils/isIOS';
import { attachPrefetchHandlers } from '../utils/routePrefetcher';
import { fetchSessionUser, logoutSession, type SessionUser } from '../utils/sessionClient';
import { supabase } from '../utils/supabase';

// PWADebugPanelをレイジーロード
const PWADebugPanel = lazy(() => import('./PWADebugPanel'));

interface ProfileData {
  name?: string;
  user_type?: string;
  postal_code?: string;
  address?: string;
  phone_number?: string;
}

// Memoize the Navbar component to prevent unnecessary re-renders
export const Navbar = memo(function Navbar() {
  const { user, logout, isAdmin, effectiveUserId } = useAuth();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [cartItemCount, setCartItemCount] = useState(0);
  const { isActive: hasSubscription } = useSubscription();
  
  // PWA関連の状態
  const [canInstallPWA, setCanInstallPWA] = useState(false);
  const [isPWAMode, setIsPWAMode] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showLoginMenu, setShowLoginMenu] = useState(false);
  const loginMenuRef = useRef<HTMLDivElement | null>(null);

  // PWAインストール関数
  const installPWA = useCallback(() => {
    const button = document.getElementById('pwa-install-button') as HTMLButtonElement;
    if (button) {
      button.click();
    }
  }, []);

  // PWA状態の初期化
  useEffect(() => {
    // PWAモードの判定
    setIsPWAMode(window.matchMedia('(display-mode: standalone)').matches);
    
    // PWAインストール可能性の監視
    const handleBeforeInstallPrompt = () => {
      setCanInstallPWA(true);
    };
    
    const handleAppInstalled = () => {
      setCanInstallPWA(false);
      setIsPWAMode(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // LIFFセッション確認（Supabase未ログインでもナビにログイン状態を反映）
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await fetchSessionUser();
        if (mounted) setSessionUser(me);
      } catch {
        if (mounted) setSessionUser(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ログインメニューの外側クリックでクローズ
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!showLoginMenu) return;
      if (loginMenuRef.current && !loginMenuRef.current.contains(e.target as Node)) {
        setShowLoginMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showLoginMenu]);

  const isLoggedIn = Boolean(user || sessionUser || effectiveUserId);
  // 直前の変更を戻す（以前のサイズに復元）
  // ヘッダーレイアウト最適化（高さを下げ、文字は大きめに）
  const headerHeightPx = isLoggedIn ? (isIOS() ? 34 : 32) : (isIOS() ? 30 : 28);
  const logoSizePx = isLoggedIn ? 20 : 18;
  const iconButtonSize = Math.max(24, headerHeightPx - 6);

  // Memoize fetch functions to prevent unnecessary re-renders
  const fetchUserName = useCallback(async () => {
    // LIFF の display_name を最優先で採用
    if (sessionUser?.display_name) {
      setUserName(sessionUser.display_name);
      return;
    }
    if (!user) return;
    
    try {
      const result = await safeSupabaseQuery(() =>
        supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle()
      );
      
      if (result.error && result.error.code !== 'PGRST116') {
        log('error', 'Error fetching profile', { error: result.error, userId: user.id });
      }
      
      if (result.data?.name) {
        setUserName(result.data.name);
      } else {
        const metaName = (user.user_metadata?.name as string) || user.email?.split('@')[0] || '';
        if (metaName) {
          setUserName(metaName);
        }
      }
    } catch (error) {
      log('error', 'Exception in fetchUserName', { error, userId: user.id });
    }
  }, [user, sessionUser]);

  const fetchUnreadNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const result = await safeSupabaseQuery(() =>
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id || effectiveUserId)
          .eq('read', false)
      );
      
      setUnreadNotifications(result.data || 0);
    } catch (error) {
      log('error', 'Error fetching notifications', { error, userId: user.id });
    }
  }, [user]);

  const fetchCartItemCount = useCallback(async () => {
    try {
      const uid = user?.id || effectiveUserId;
      if (!uid) {
        setCartItemCount(0);
        return;
      }
      const result = await safeSupabaseQuery(() =>
        supabase
          .from('cart_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', uid)
      );
      setCartItemCount(result.data || 0);
    } catch (error) {
      log('error', 'Error fetching cart items', { error, userId: user?.id || effectiveUserId });
    }
  }, [user, effectiveUserId]);

  useEffect(() => {
    if (user) {
      void fetchUserName();
      void fetchUnreadNotifications();
      void fetchCartItemCount();
    } else if (sessionUser) {
      // LIFFセッションのみ：名前だけ反映し、その他は0に
      setUserName(sessionUser.display_name || '');
      setUnreadNotifications(0);
      // カート数は effectiveUserId ベースで取得
      void fetchCartItemCount();
    } else {
      setUserName('');
      setUnreadNotifications(0);
      setCartItemCount(0);
    }
    return undefined;
  }, [user, sessionUser, isAdmin, fetchUserName, fetchUnreadNotifications, fetchCartItemCount]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutSession();
      await logout();
      // セッションCookieがHttpOnlyのため、念のためトップへ遷移
      window.location.assign('/');
      navigate('/');
    } catch (error) {
      log('error', 'ログアウトエラー', { error });
    }
  }, [logout, navigate]);

  return (
    <>
      <style>
        {`
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
        
        .navbar-logo-icon {
          animation: logoSlideIn 0.8s ease-out forwards !important;
          animation-duration: 0.8s !important;
          animation-iteration-count: 1 !important;
        }
        
        .navbar-text-dogpark {
          animation: textReveal 0.6s ease-out 0.3s forwards !important;
          animation-duration: 0.6s !important;
          animation-delay: 0.3s !important;
          animation-iteration-count: 1 !important;
          opacity: 0;
        }
        
        .navbar-text-jp {
          animation: jpPop 0.5s ease-out 0.7s forwards !important;
          animation-duration: 0.5s !important;
          animation-delay: 0.7s !important;
          animation-iteration-count: 1 !important;
          opacity: 0;
          display: inline-block;
        }
        
        .navbar-subtitle-text {
          animation: subtitleFade 0.6s ease-out 1s forwards !important;
          animation-duration: 0.6s !important;
          animation-delay: 1s !important;
          animation-iteration-count: 1 !important;
          opacity: 0;
        }
        `}
      </style>
      <nav
        className="bg-white shadow-lg fixed top-0 left-0 right-0 z-[80] pb-0"
        style={{
          pointerEvents: 'auto',
          transform: 'translateZ(0)',
          willChange: 'transform' as any,
          paddingTop: 'env(safe-area-inset-top, 0px)'
        }}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center" style={{ height: `${headerHeightPx}px`, minHeight: `${headerHeightPx}px` }}>
            <Link 
              to="/" 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer group no-underline hover:no-underline"
              aria-label="ドッグパークJP ホーム"
              {...attachPrefetchHandlers('/')}
            >
              <div className="navbar-logo-icon">
                <img
                  src="/icons/icon_android_48x48.png"
                  alt="ドッグパーク"
                  style={{ width: `${logoSizePx}px`, height: `${logoSizePx}px` }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'w-12 h-12 bg-gradient-to-br from-blue-500 to-green-400 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow';
                      fallback.innerHTML = '<svg class="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18,4C16.29,4 15.25,4.33 14.65,4.61C13.88,4.23 13,4 12,4C11,4 10.12,4.23 9.35,4.61C8.75,4.33 7.71,4 6,4C3,4 1,12 1,14C1,14.83 2.32,15.59 4.14,15.9C4.78,18.14 7.8,19.85 11.5,20V15.72C10.91,15.35 10,14.68 10,14C10,13 11,12 12,12C13,12 14,13 14,14C14,14.68 13.09,15.35 12.5,15.72V20C16.2,19.85 19.22,18.14 19.86,15.9C21.68,15.59 23,14.83 23,14C23,12 21,4 18,4Z"/></svg>';
                      parent.replaceChild(fallback, e.target as HTMLElement);
                    }
                  }}
                />
              </div>
              
              <div className="flex flex-col justify-center">
                <span className="text-lg md:text-xl font-bold leading-none whitespace-nowrap tracking-tight">
                  <span className="navbar-text-dogpark text-gray-800">ドッグパーク</span>
                  <span className="navbar-text-jp text-blue-600 ml-1">JP</span>
                </span>
                <span className="navbar-subtitle-text text-[11px] md:text-xs text-gray-500 leading-none inline">
                  愛犬との素敵な時間を
                </span>
              </div>
            </Link>
            
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <>
                  <span className="text-gray-700 hidden md:inline-block">
                    こんにちは、{userName || 'ユーザー'}さん
                    {hasSubscription && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>
                        サブスク会員
                      </span>
                    )}
                  </span>
                  <Link 
                    to="/dashboard" 
                    className="text-gray-600 hover:text-blue-600 transition-colors hidden md:inline-block no-underline hover:no-underline"
                    {...attachPrefetchHandlers('/dashboard')}
                  >
                    マイページ
                  </Link>
                  <Link 
                    to="/parks" 
                    className="text-gray-600 hover:text-blue-600 transition-colors hidden md:inline-block no-underline hover:no-underline"
                    {...attachPrefetchHandlers('/parks')}
                  >
                    ドッグラン一覧
                  </Link>
                  <Link 
                    to="/petshop" 
                    className="text-gray-600 hover:text-green-600 transition-colors hidden md:inline-block no-underline hover:no-underline"
                    {...attachPrefetchHandlers('/petshop')}
                  >
                    ペットショップ
                  </Link>
                  
                  {/* 通知アイコン */}
                  <Link 
                    to="/community" 
                    className="relative inline-flex items-center justify-center rounded-md text-gray-600 hover:text-blue-600 active:opacity-70 transition-colors no-underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-500 z-[60]"
                    style={{ width: iconButtonSize, height: iconButtonSize }}
                    aria-label={`通知 ${unreadNotifications > 0 ? `${unreadNotifications}件の未読通知があります` : ''}`}
                    {...attachPrefetchHandlers('/community')}
                  >
                    <Bell className="h-5 w-5 pointer-events-none" aria-hidden="true" />
                    {unreadNotifications > 0 && (
                      <span className="pointer-events-none absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" aria-hidden="true">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </Link>
                  
                  {/* カートアイコン */}
                  <Link 
                    to="/petshop" 
                    className="relative inline-flex items-center justify-center rounded-md text-gray-600 hover:text-green-600 active:opacity-70 transition-colors no-underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-green-500 z-[60]"
                    style={{ width: iconButtonSize, height: iconButtonSize }}
                    aria-label={`カート ${cartItemCount > 0 ? `${cartItemCount}点の商品があります` : ''}`}
                    {...attachPrefetchHandlers('/petshop')}
                  >
                    <ShoppingCart className="h-5 w-5 pointer-events-none" aria-hidden="true" data-cart-target="true" />
                    {cartItemCount > 0 && (
                      <span className="pointer-events-none absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center" aria-hidden="true">
                        {cartItemCount > 9 ? '9+' : cartItemCount}
                      </span>
                    )}
                  </Link>
                  
                  {/* PWAインストールボタン */}
                  {canInstallPWA && !isPWAMode && (
                    <button
                      onClick={installPWA}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md"
                      aria-label="アプリをインストール"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden lg:inline text-sm">アプリ化</span>
                    </button>
                  )}
                  
                  {/* PWAモード表示 */}
                  {isPWAMode && (
                    <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded-md">
                      <Download className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden lg:inline text-sm">PWA</span>
                    </div>
                  )}
                  
                  {/* 開発環境のみ: PWAデバッグボタン */}
                  {import.meta.env.DEV && (
                    <button
                      onClick={() => setShowDebugPanel(true)}
                      className="flex items-center space-x-1 text-gray-600 hover:text-gray-700 transition-colors bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded-md"
                      aria-label="PWAデバッグパネル"
                    >
                      <Settings className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden lg:inline text-sm">PWA</span>
                    </button>
                  )}
                  
                  {/* 管理者リンク */}
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition-colors no-underline hover:no-underline"
                      aria-label="管理者ページ"
                      {...attachPrefetchHandlers('/admin')}
                    >
                      <Shield className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden md:inline">管理者</span>
                    </Link>
                  )}
                  
                  {/* ログアウトボタン（LIFFセッションも含めてログアウト） */}
                  <button
                    onClick={() => { void handleLogout(); }}
                    className="inline-flex items-center justify-center rounded-md text-gray-600 hover:text-red-600 active:opacity-70 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 z-[60]"
                    style={{ width: iconButtonSize, height: iconButtonSize }}
                    aria-label="ログアウト"
                  >
                    <LogOut className="h-4 w-4 pointer-events-none" aria-hidden="true" />
                    <span className="hidden md:inline ml-1">ログアウト</span>
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/login?method=password"
                    className="text-gray-600 hover:text-blue-600 transition-colors no-underline hover:no-underline"
                  >
                    ログイン
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors no-underline hover:no-underline"
                  >
                    新規登録
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* PWAデバッグパネル */}
      <Suspense fallback={<div>Loading debug panel...</div>}>
        <PWADebugPanel 
          isOpen={showDebugPanel} 
          onClose={() => setShowDebugPanel(false)} 
        />
      </Suspense>
    </>
  );
});

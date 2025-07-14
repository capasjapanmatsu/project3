import { Link, useNavigate } from 'react-router-dom';
import { 
  PawPrint, 
  LogOut, 
  Bell, 
  ShoppingCart, 
  Shield, 
  History, 
  Download,
  WifiOff,
  Wifi,
  Settings
} from 'lucide-react';
import useAuth from '../context/AuthContext';
import { useState, useEffect, useCallback, memo } from 'react';
import { supabase } from '../utils/supabase';
import { useSubscription } from '../hooks/useSubscription';
import PWADebugPanel from './PWADebugPanel';

interface ProfileData {
  name?: string;
  user_type?: string;
  postal_code?: string;
  address?: string;
  phone_number?: string;
}

// Memoize the Navbar component to prevent unnecessary re-renders
export const Navbar = memo(function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [cartItemCount, setCartItemCount] = useState(0);
  const { isActive: hasSubscription } = useSubscription();
  
  // PWA関連の状態
  const [canInstallPWA, setCanInstallPWA] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPWAMode, setIsPWAMode] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

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
    
    // オンライン状態の監視
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Memoize fetch functions to prevent unnecessary re-renders
  const fetchUserName = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      
      if (data?.name) {
        setUserName(data.name);
      } else {
        const metaName = (user.user_metadata?.name as string) || user.email?.split('@')[0];
        if (metaName) {
          setUserName(metaName);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserName:', error);
    }
  }, [user]);

  const fetchUnreadNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      setUnreadNotifications(count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  const fetchCartItemCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const { count } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      setCartItemCount(count || 0);
    } catch (error) {
      console.error('Error fetching cart items:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void fetchUserName();
      void fetchUnreadNotifications();
      void fetchCartItemCount();
    } else {
      setUserName('');
      setUnreadNotifications(0);
      setCartItemCount(0);
    }
    return undefined;
  }, [user, isAdmin, fetchUserName, fetchUnreadNotifications, fetchCartItemCount]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <>
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link 
              to="/" 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer group"
              aria-label="ドッグパークJP ホーム"
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-400 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <PawPrint className="h-7 w-7 text-white" aria-hidden="true" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full opacity-80">
                  <PawPrint className="h-2 w-2 text-white" aria-hidden="true" />
                </div>
              </div>
              
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-800 leading-tight">
                  ドッグパーク
                  <span className="text-blue-600">JP</span>
                </span>
                <span className="text-xs text-gray-500 leading-none">
                  愛犬との素敵な時間を
                </span>
              </div>
            </Link>
            
            <div className="flex items-center space-x-4">
              {user ? (
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
                    className="text-gray-600 hover:text-blue-600 transition-colors hidden md:inline-block"
                  >
                    マイページ
                  </Link>
                  <Link 
                    to="/parks" 
                    className="text-gray-600 hover:text-blue-600 transition-colors hidden md:inline-block"
                  >
                    ドッグラン一覧
                  </Link>
                  <Link 
                    to="/shop" 
                    className="text-gray-600 hover:text-green-600 transition-colors hidden md:inline-block"
                  >
                    ペットショップ
                  </Link>
                  
                  {/* 通知アイコン */}
                  <Link 
                    to="/community" 
                    className="relative text-gray-600 hover:text-blue-600 transition-colors"
                    aria-label={`通知 ${unreadNotifications > 0 ? `${unreadNotifications}件の未読通知があります` : ''}`}
                  >
                    <Bell className="h-5 w-5" aria-hidden="true" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" aria-hidden="true">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </Link>
                  
                  {/* カートアイコン */}
                  <Link 
                    to="/cart" 
                    className="relative text-gray-600 hover:text-green-600 transition-colors"
                    aria-label={`カート ${cartItemCount > 0 ? `${cartItemCount}点の商品があります` : ''}`}
                  >
                    <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" aria-hidden="true">
                        {cartItemCount > 9 ? '9+' : cartItemCount}
                      </span>
                    )}
                  </Link>
                  
                  {/* ネットワーク状態表示 */}
                  <div className="flex items-center">
                    {isOnline ? (
                      <Wifi 
                        className="h-4 w-4 text-green-600" 
                        aria-label="オンライン"
                      />
                    ) : (
                      <WifiOff 
                        className="h-4 w-4 text-red-600" 
                        aria-label="オフライン"
                      />
                    )}
                  </div>
                  
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
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition-colors"
                      aria-label="管理者ページ"
                    >
                      <Shield className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden md:inline">管理者</span>
                    </Link>
                  )}
                  
                  {/* ログアウトボタン */}
                  <button
                    onClick={() => void handleLogout()}
                    className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors"
                    aria-label="ログアウト"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden md:inline">ログアウト</span>
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    ログイン
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
      <PWADebugPanel 
        isOpen={showDebugPanel} 
        onClose={() => setShowDebugPanel(false)} 
      />
    </>
  );
});
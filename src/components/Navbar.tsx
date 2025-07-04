import { Link, useNavigate } from 'react-router-dom';
import { PawPrint, LogOut, Bell, ShoppingCart, Shield, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useCallback, memo } from 'react';
import { supabase } from '../utils/supabase';
import { useSubscription } from '../hooks/useSubscription';

// Memoize the Navbar component to prevent unnecessary re-renders
export const Navbar = memo(function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [cartItemCount, setCartItemCount] = useState(0);
  const { isActive: hasSubscription } = useSubscription();

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
        // Don't throw error, just use fallback
      }
      
      if (data?.name) {
        setUserName(data.name);
      } else {
        // Use metadata or email if profile name is not available
        const metaName = user.user_metadata?.name || user.email?.split('@')[0];
        
        if (metaName) {
          setUserName(metaName);
          
          // Create profile if it doesn't exist (but don't fail if this errors)
          if (!data) {
            try {
              await supabase
                .from('profiles')
                .upsert([{
                  id: user.id,
                  user_type: 'user',
                  name: metaName,
                  postal_code: '',
                  address: '',
                  phone_number: '',
                }], { onConflict: 'id' });
            } catch (upsertError) {
              console.error('Error upserting profile:', upsertError);
              // Continue without failing
            }
          }
        } else {
          setUserName('ユーザー');
        }
      }
    } catch (error) {
      console.error('Error in fetchUserName:', error);
      // Use fallback name instead of failing
      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー');
    }
  }, [user]);
  
  // Fetch unread notifications count
  const fetchUnreadNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return; // Don't update count on error
      }
      setUnreadNotifications(data?.length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Keep existing count on error
    }
  }, [user]);

  // Fetch cart item count
  const fetchCartItemCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('user_id', user.id); // Add user filter
      
      if (error) {
        console.error('Error fetching cart items:', error);
        return; // Don't update count on error
      }
      const totalCount = data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      setCartItemCount(totalCount);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      // Keep existing count on error
    }
  }, [user]);

  useEffect(() => {
    if (user && isAdmin) {
      // Fetch data with error handling
      fetchUserName().catch(console.error);
      fetchUnreadNotifications().catch(console.error);
      fetchCartItemCount().catch(console.error);

      // Set up real-time subscriptions with error handling
      const notificationSubscription = supabase
        .channel('navbar_notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchUnreadNotifications().catch(console.error);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('Failed to subscribe to notifications');
          }
        });

      const cartSubscription = supabase
        .channel('navbar_cart')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchCartItemCount().catch(console.error);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('Failed to subscribe to cart items');
          }
        });

      const profileSubscription = supabase
        .channel('navbar_profile')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        }, (payload) => {
          if (payload.new && payload.new.name) {
            setUserName(payload.new.name);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('Failed to subscribe to profile changes');
          }
        });

      return () => {
        notificationSubscription.unsubscribe();
        cartSubscription.unsubscribe();
        profileSubscription.unsubscribe();
      };
    } else {
      // Reset state when user logs out
      setUserName('');
      setUnreadNotifications(0);
      setCartItemCount(0);
    }
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
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link 
            to="/" 
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer group"
            aria-label="ドッグパークJP ホーム"
          >
            {/* ロゴ画像部分 */}
            <div className="relative">
              {/* 背景の円形グラデーション */}
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-400 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                {/* 足跡アイコン */}
                <PawPrint className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
              {/* 小さな装飾的な足跡 */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full opacity-80">
                <PawPrint className="h-2 w-2 text-white" aria-hidden="true" />
              </div>
            </div>
            
            {/* テキストロゴ */}
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
            {user && isAdmin ? (
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
                <Link 
                  to="/dogpark-history" 
                  className="text-gray-600 hover:text-blue-600 transition-colors flex items-center hidden md:inline-flex"
                >
                  <History className="h-4 w-4 mr-1" aria-hidden="true" />
                  利用履歴
                </Link>
                <Link 
                  to="/news" 
                  className="text-gray-600 hover:text-blue-600 transition-colors flex items-center hidden md:inline-flex"
                >
                  <Bell className="h-4 w-4 mr-1" aria-hidden="true" />
                  新着情報
                </Link>
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
                <Link 
                  to="/admin" 
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition-colors"
                  aria-label="管理者ページ"
                >
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden md:inline">管理者</span>
                </Link>
                <button
                  onClick={handleLogout}
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
  );
});
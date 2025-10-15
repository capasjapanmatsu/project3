import { Home, Key, MapPin, User, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

export function BottomNavigation() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('/');
  const { user, lineUser, effectiveUserId } = useAuth();
  const uid = user?.id || lineUser?.id || effectiveUserId;
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  useEffect(() => {
    // Extract the base path from the current location
    const path = location.pathname.split('/')[1];
    setActiveTab(path ? `/${path}` : '/');
  }, [location]);

  // Fetch unread counts and subscribe to realtime updates
  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      if (!uid) {
        if (isMounted) {
          setUnreadNotifications(0);
          setUnreadMessages(0);
        }
        return;
      }
      try {
        const [noti, msgs] = await Promise.all([
          supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', uid)
            .eq('read', false),
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', uid)
            .eq('read', false)
        ]);
        if (isMounted) {
          setUnreadNotifications((noti as any)?.data || 0);
          setUnreadMessages((msgs as any)?.data || 0);
        }
      } catch {
        if (isMounted) {
          setUnreadNotifications(0);
          setUnreadMessages(0);
        }
      }
    };

    void fetchCounts();

    // Realtime subscriptions
    if (!uid) return () => { isMounted = false; };
    const ch1 = supabase
      .channel('bn_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => {
        void fetchCounts();
      })
      .subscribe();
    const ch2 = supabase
      .channel('bn_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${uid}` }, () => {
        void fetchCounts();
      })
      .subscribe();

    return () => {
      isMounted = false;
      try { ch1.unsubscribe(); } catch {}
      try { ch2.unsubscribe(); } catch {}
    };
  }, [uid]);
  
  const isActive = (path: string) => {
    if (path === '/') {
      return activeTab === '/';
    }
    return activeTab.startsWith(path);
  };
  
  // ページ別挙動（コミュニティのみ、下部の余白を広めに確保）
  const isCommunityPage = location.pathname.startsWith('/community');
  
  const navItems = [
    { path: '/', label: 'ホーム', icon: Home, badge: 0 },
    { path: '/parks', label: 'ドッグラン', icon: MapPin, badge: 0 },
    { path: '/access-control', label: '入退場', icon: Key, badge: 0 },
    { path: '/community', label: 'コミュニティ', icon: Users, badge: unreadNotifications + unreadMessages },
    { path: '/dashboard', label: 'マイページ', icon: User, badge: 0 },
  ];

  const navUI = (
    <div
      className="fixed left-0 right-0 z-[70] md:hidden"
      style={{
        bottom: 0,
        transform: 'translateZ(0)',
        pointerEvents: 'none'
      }}
    >
      <div className="flex justify-around items-center h-12 bg-white border-t border-gray-200 pointer-events-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full no-underline hover:no-underline relative ${
                active ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
      
      {/* safe-area は内側paddingのみで処理。外側余白は作らない */}
    </div>
  );

  // Portal化して親要素のtransform/overflowの影響を受けないようにする
  // Note: community jitter may be caused by page transforms; Portal keeps it viewport-based
  if (typeof document !== 'undefined') {
    const containerId = 'global-bottom-nav-root';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }
    return createPortal(navUI, container);
  }
  return navUI;
}

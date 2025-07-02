import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MapPin, Key, User, Bell } from 'lucide-react';

export function BottomNavigation() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('/');
  
  useEffect(() => {
    // Extract the base path from the current location
    const path = location.pathname.split('/')[1];
    setActiveTab(path ? `/${path}` : '/');
  }, [location]);
  
  const isActive = (path: string) => {
    if (path === '/') {
      return activeTab === '/';
    }
    return activeTab.startsWith(path);
  };
  
  const navItems = [
    { path: '/', label: 'ホーム', icon: Home },
    { path: '/parks', label: 'ドッグラン', icon: MapPin },
    { path: '/access-control', label: '入退場', icon: Key },
    { path: '/news', label: '新着情報', icon: Bell },
    { path: '/dashboard', label: 'マイページ', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full ${
                active ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
      
      {/* Safe area for iOS devices */}
      <div className="h-safe-bottom bg-white" />
    </div>
  );
}
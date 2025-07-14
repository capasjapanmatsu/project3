import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { BottomNavigation } from './BottomNavigation';
import { HelmetProvider } from 'react-helmet-async';
import { SEO } from './SEO';
import { useMaintenance } from '../context/MaintenanceContext';
import MaintenanceScreen from './MaintenanceScreen';
import useAuth from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { isMaintenanceActive, loading, isIPWhitelisted, clientIP } = useMaintenance();
  const { isAdmin, user } = useAuth();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // メンテナンス状態のチェック中は何も表示しない
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // 管理者権限のデバッグ情報を出力
  console.log('Layout - isMaintenanceActive:', isMaintenanceActive, 'isAdmin:', isAdmin, 'user:', user?.email, 'clientIP:', clientIP, 'isIPWhitelisted:', isIPWhitelisted);

  // メンテナンス判定ロジック
  const shouldShowMaintenance = () => {
    if (!isMaintenanceActive) return false;

    // 管理者は常にアクセス可能
    const isAdminUser = isAdmin || user?.email === 'capasjapan@gmail.com';
    if (isAdminUser) return false;

    // IPホワイトリストに含まれている場合はアクセス可能
    if (isIPWhitelisted) return false;

    // それ以外の場合はメンテナンス画面を表示
    return true;
  };

  // メンテナンス画面を表示する場合
  if (shouldShowMaintenance()) {
    return <MaintenanceScreen />;
  }

  // 通常のレイアウトを表示
  return (
    <HelmetProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SEO />
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
        <BottomNavigation />
      </div>
    </HelmetProvider>
  );
};

export default Layout;

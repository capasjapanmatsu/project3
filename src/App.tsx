import React, { Suspense, useEffect, useState } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import useAuth from './context/AuthContext';
import { MaintenanceProvider } from './context/MaintenanceContext';
import { fetchSessionUser } from './utils/sessionClient';

// レイアウトコンポーネント
import { BottomNavigation } from './components/BottomNavigation';
import CampaignModal from './components/CampaignModal';
import FloatingActionButton from './components/FloatingActionButton';
import { Footer } from './components/Footer';
import { GoogleMapsProvider } from './components/GoogleMapsProvider';
import { DashboardSkeleton, PageSkeleton, ShopSkeleton } from './components/LoadingStates';
import { Navbar } from './components/Navbar';
import { SEO } from './components/SEO';
import ScrollToTop from './components/ScrollToTop';
import SplashScreen from './components/SplashScreen';

// 保護されたルートコンポーネント（Supabase または LIFF セッションどちらでもOK）
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [liffAllowed, setLiffAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // Supabaseユーザーがいれば即許可
    if (loading) return;
    if (user) {
      setLiffAllowed(true);
      return;
    }

    // なければ LIFF セッションを確認
    let mounted = true;
    (async () => {
      const me = await fetchSessionUser();
      if (!mounted) return;
      setLiffAllowed(Boolean(me));
      if (!me) {
        const redirect = encodeURIComponent(location.pathname + location.search);
        navigate(`/login?redirect=${redirect}`, { replace: true });
      }
    })();
    return () => { mounted = false; };
  }, [user, loading, location.pathname, location.search, navigate]);

  if (loading || liffAllowed === null) return <PageSkeleton />;
  if (!user && !liffAllowed) return null;
  return <>{children}</>;
};

// 管理者専用の保護ルートコンポーネント
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <PageSkeleton />;
  }
  
  if (!user || !isAuthenticated) {
    return <Navigate to="/liff/login" replace />;
  }
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス拒否</h1>
          <p className="text-gray-600 mb-4">管理者権限が必要です。</p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// named exportを使用した遅延読み込み - 公開ページ
const Home = React.lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Login = React.lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Register = React.lazy(() => import('./pages/Register').then(module => ({ default: module.Register })));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const Landing = React.lazy(() => import('./pages/Landing'));

// ドッグパーク関連ページ
const DogParkList = React.lazy(() => import('./pages/DogParkList').then(module => ({ default: module.DogParkList })));
const DogParkDetail = React.lazy(() => import('./pages/DogParkDetail').then(module => ({ default: module.DogParkDetail })));
const DogParkRules = React.lazy(() => import('./pages/DogParkRules').then(module => ({ default: module.DogParkRules })));

// 施設関連ページ
const FacilityDetail = React.lazy(() => import('./pages/FacilityDetail').then(module => ({ default: module.FacilityDetail })));
const FacilityReserve = React.lazy(() => import('./pages/FacilityReserve'));

// ショッピング関連ページ
const PetShop = React.lazy(() => import('./pages/PetShop').then(module => ({ default: module.PetShop })));
const Cart = React.lazy(() => import('./pages/Cart').then(module => ({ default: module.Cart })));
const Checkout = React.lazy(() => import('./pages/Checkout').then(module => ({ default: module.Checkout })));
const ProductDetail = React.lazy(() => import('./pages/ProductDetail').then(module => ({ default: module.ProductDetail })));

// ニュース関連ページ
const News = React.lazy(() => import('./pages/News').then(module => ({ default: module.News })));
const NewsDetail = React.lazy(() => import('./pages/NewsDetail').then(module => ({ default: module.NewsDetail })));

// ワンちゃん情報ページ
const DogInfo = React.lazy(() => import('./pages/DogInfo'));
const DogInfoBreeds = React.lazy(() => import('./pages/dog-info/Breeds').then(module => ({ default: module.Breeds })));
const DogInfoCare = React.lazy(() => import('./pages/dog-info/Care').then(module => ({ default: module.Care })));
const DogInfoFood = React.lazy(() => import('./pages/dog-info/Food').then(module => ({ default: module.Food })));
const DogInfoTraining = React.lazy(() => import('./pages/dog-info/Training').then(module => ({ default: module.Training })));
const DogInfoHealthManagement = React.lazy(() => import('./pages/dog-info/HealthManagement').then(module => ({ default: module.HealthManagement })));
const DogInfoWalk = React.lazy(() => import('./pages/dog-info/Walk').then(module => ({ default: module.Walk })));

// コミュニティ関連ページ
const Community = React.lazy(() => import('./pages/Community').then(module => ({ default: module.Community })));
const Contact = React.lazy(() => import('./pages/Contact').then(module => ({ default: module.Contact })));
const AccessControl = React.lazy(() => import('./pages/AccessControl').then(module => ({ default: module.AccessControl })));
const SubscriptionIntro = React.lazy(() => import('./pages/SubscriptionIntro').then(module => ({ default: module.SubscriptionIntro })));

// その他のページ
const TermsOfService = React.lazy(() => import('./pages/TermsOfService').then(module => ({ default: module.TermsOfService })));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const SponsorApplication = React.lazy(() => import('./pages/SponsorApplication').then(module => ({ default: module.SponsorApplication })));
const SponsorInquiry = React.lazy(() => import('./pages/SponsorInquiry'));
const NotFound = React.lazy(() => import('./pages/NotFound').then(module => ({ default: module.NotFound })));

// デバッグページ
// const MapDebug = React.lazy(() => import('./pages/MapDebug').then(module => ({ default: module.MapDebug })));
const TestPinGenerator = React.lazy(() => import('./pages/TestPinGenerator'));

// 保護されたページ
const UserDashboard = React.lazy(() => import('./pages/UserDashboard'));
const DogRegistration = React.lazy(() => import('./pages/DogRegistration').then(module => ({ default: module.DogRegistration })));
const DogManagement = React.lazy(() => import('./pages/DogManagement').then(module => ({ default: module.DogManagement })));
const DogProfile = React.lazy(() => import('./pages/DogProfile').then(module => ({ default: module.DogProfile })));
const JPPassport = React.lazy(() => import('./pages/JPPassport').then(module => ({ default: module.JPPassport })));
const ProfileSettings = React.lazy(() => import('./pages/ProfileSettings').then(module => ({ default: module.ProfileSettings })));
const PaymentMethodSettings = React.lazy(() => import('./pages/PaymentMethodSettings').then(module => ({ default: module.PaymentMethodSettings })));
const DogParkHistory = React.lazy(() => import('./pages/DogParkHistory').then(module => ({ default: module.DogParkHistory })));
const LikedDogs = React.lazy(() => import('./pages/LikedDogs').then(module => ({ default: module.LikedDogs })));
const MyCoupons = React.lazy(() => import('./pages/MyCoupons').then(module => ({ default: module.MyCoupons })));
const OrderHistory = React.lazy(() => import('./pages/OrderHistory').then(module => ({ default: module.OrderHistory })));
const ParkReservation = React.lazy(() => import('./pages/ParkReservation').then(module => ({ default: module.ParkReservation })));
const ParkRegistration = React.lazy(() => import('./pages/ParkRegistration'));
const ParkRegistrationAgreement = React.lazy(() => import('./pages/ParkRegistrationAgreement'));
const ParkRegistrationSecondStage = React.lazy(() => import('./pages/ParkRegistrationSecondStage').then(module => ({ default: module.ParkRegistrationSecondStage })));
const ParkManagement = React.lazy(() => import('./pages/ParkManagement').then(module => ({ default: module.ParkManagement })));
const ParkEdit = React.lazy(() => import('./pages/ParkEdit'));
const ParkPublishingSetup = React.lazy(() => import('./pages/ParkPublishingSetup').then(module => ({ default: module.ParkPublishingSetup })));
const FacilityRegistration = React.lazy(() => import('./pages/FacilityRegistration'));
const FacilityEdit = React.lazy(() => import('./pages/FacilityEdit'));
const OwnerPaymentSystem = React.lazy(() => import('./pages/OwnerPaymentSystem').then(module => ({ default: module.OwnerPaymentSystem })));

// 管理者ページ
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AdminUserManagement = React.lazy(() => import('./pages/AdminUserManagement').then(module => ({ default: module.AdminUserManagement })));
const AdminParkManagement = React.lazy(() => import('./pages/AdminParkManagement').then(module => ({ default: module.AdminParkManagement })));
const AdminReservationManagement = React.lazy(() => import('./pages/AdminReservationManagement').then(module => ({ default: module.AdminReservationManagement })));
const AdminSalesManagement = React.lazy(() => import('./pages/AdminSalesManagement').then(module => ({ default: module.AdminSalesManagement })));
const AdminVaccineApproval = React.lazy(() => import('./pages/AdminVaccineApproval'));
const AdminFacilityApproval = React.lazy(() => import('./pages/AdminFacilityApproval'));
const AdminShopManagement = React.lazy(() => import('./pages/AdminShopManagement').then(module => ({ default: module.AdminShopManagement })));
const AdminRevenueReport = React.lazy(() => import('./pages/AdminRevenueReport').then(module => ({ default: module.AdminRevenueReport })));
const AdminNewsManagement = React.lazy(() => import('./pages/AdminNewsManagement').then(module => ({ default: module.AdminNewsManagement })));
const AdminSponsors = React.lazy(() => import('./pages/AdminSponsors').then(module => ({ default: module.AdminSponsors })));

// オーナー・運営関連
const MyParksManagement = React.lazy(() => import('./pages/MyParksManagement').then(module => ({ default: module.MyParksManagement })));
const MyFacilitiesManagement = React.lazy(() => import('./pages/MyFacilitiesManagement').then(module => ({ default: module.MyFacilitiesManagement })));

// シンプルなフォールバックページ
const SimplePage = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
        {children}
      </div>
    </div>
  </div>
);

// メインレイアウトコンポーネント
const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <HelmetProvider>
      <GoogleMapsProvider>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <SEO />
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <BottomNavigation />
          
          {/* フローティングアクションボタン */}
          <FloatingActionButton />
        </div>
      </GoogleMapsProvider>
    </HelmetProvider>
  );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  // スプラッシュ画面の制御（Hooksはコンポーネントの最上部で宣言）
  const [showSplash, setShowSplash] = useState(() => {
    // sponsor-applicationページへの直接アクセスの場合はスプラッシュをスキップ
    if (location.pathname === '/sponsor-application' || location.pathname === '/sponsor-inquiry') {
      return false;
    }
    // 初回起動時のみスプラッシュ画面を表示
    const hasSeenSplash = localStorage.getItem('hasSeenSplash');
    return !hasSeenSplash;
  });

  const [showCampaignModal, setShowCampaignModal] = useState(false);

  const handleSplashComplete = () => {
    // スプラッシュ画面完了時の処理
    localStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
    
    // ログイン済みユーザーの場合は適切なページにリダイレクト
    // ただし、公開ページ（sponsor-inquiry等）にアクセスしている場合はリダイレクトしない
    const publicPaths = [
      '/sponsor-inquiry',
      '/sponsor-application',  // スポンサー申し込みページも公開
      '/contact',
      '/about',
      '/terms',
      '/privacy',
      '/parks',
      '/facilities',
      '/products',
      '/dog-info'
    ];
    
    const isPublicPath = publicPaths.some(path => location.pathname.startsWith(path));
    
    if (isAuthenticated && user && !isPublicPath) {
      const searchParams = new URLSearchParams(location.search);
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      navigate(redirectTo, { replace: true });
    }
  };

  // 初回訪問時のキャンペーンモーダル表示制御
  useEffect(() => {
    const hasVisited = localStorage.getItem('campaignModalShown');
    if (!hasVisited) {
      // ページ読み込み後少し遅延させて表示
      const timer = setTimeout(() => {
        setShowCampaignModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCampaignModalClose = () => {
    setShowCampaignModal(false);
    localStorage.setItem('campaignModalShown', 'true');
  };

  return (
    <>
      {/* スプラッシュ画面の表示 */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      
      {/* メインアプリケーション */}
      {!showSplash && (
        <GoogleMapsProvider>
          <MaintenanceProvider>
            <Layout>
              <ScrollToTop />
              <CampaignModal 
                isOpen={showCampaignModal} 
                onClose={handleCampaignModalClose} 
              />
              <Routes>
              {/* 🏠 公開ページ（高速表示） */}
              <Route path="/" element={
                <Suspense fallback={<PageSkeleton />}>
                  <Home />
                </Suspense>
              } />
              <Route path="/landing" element={
                <Suspense fallback={<PageSkeleton />}>
                  <Landing />
                </Suspense>
              } />
              <Route path="/login" element={
                <Suspense fallback={<PageSkeleton />}>
                  <Login />
                </Suspense>
              } />
              <Route path="/register" element={
                <Suspense fallback={<PageSkeleton />}>
                  <Register />
                </Suspense>
              } />
              <Route path="/forgot-password" element={
                <Suspense fallback={<PageSkeleton />}>
                  <ForgotPassword />
                </Suspense>
              } />
              <Route path="/reset-password" element={
                <Suspense fallback={<PageSkeleton />}>
                  <ResetPassword />
                </Suspense>
              } />
              
              {/* 🗺️ ドッグパーク関連（地図対応Skeleton） */}
              <Route path="/parks" element={
                <Suspense fallback={<PageSkeleton />}>
                  <DogParkList />
                </Suspense>
              } />
              <Route path="/parks/:id" element={
                <Suspense fallback={<PageSkeleton />}>
                  <DogParkDetail />
                </Suspense>
              } />
              <Route path="/facilities/:id" element={
                <Suspense fallback={<PageSkeleton />}>
                  <FacilityDetail />
                </Suspense>
              } />
              <Route path="/facilities/:id/reserve" element={
                <Suspense fallback={<PageSkeleton />}>
                  <FacilityReserve />
                </Suspense>
              } />
              <Route path="/rules" element={
                <Suspense fallback={<PageSkeleton />}>
                  <DogParkRules />
                </Suspense>
              } />
              
              {/* 🛒 ショッピング関連（商品グリッドSkeleton） */}
              <Route path="/petshop" element={
                <Suspense fallback={<ShopSkeleton />}>
                  <PetShop />
                </Suspense>
              } />
              <Route path="/cart" element={
                <Suspense fallback={<ShopSkeleton />}>
                  <Cart />
                </Suspense>
              } />
              <Route path="/checkout" element={
                <Suspense fallback={<ShopSkeleton />}>
                  <Checkout />
                </Suspense>
              } />
              <Route path="/products/:id" element={
                <Suspense fallback={<ShopSkeleton />}>
                  <ProductDetail />
                </Suspense>
              } />
              
              {/* 📰 ニュース関連 */}
              <Route path="/news" element={
                <Suspense fallback={<PageSkeleton />}>
                  <News />
                </Suspense>
              } />
              <Route path="/news/:id" element={
                <Suspense fallback={<PageSkeleton />}>
                  <NewsDetail />
                </Suspense>
              } />
              
              {/* 🐕 ワンちゃん情報コーナー */}
              <Route path="/dog-info" element={
                <Suspense fallback={<PageSkeleton />}>
                  <DogInfo />
                </Suspense>
              } />
              <Route path="/dog-info/breeds" element={
                <Suspense fallback={<PageSkeleton />}>
                  <DogInfoBreeds />
                </Suspense>
              } />
              <Route path="/dog-info/care" element={
                <Suspense fallback={<PageSkeleton />}>
                  <DogInfoCare />
                </Suspense>
              } />
              <Route path="/dog-info/food" element={
                <Suspense fallback={<PageSkeleton />}>
                  <DogInfoFood />
                </Suspense>
              } />
              <Route path="/dog-info/training" element={
                <Suspense fallback={<PageSkeleton />}>
                  <DogInfoTraining />
                </Suspense>
              } />
              <Route path="/dog-info/health" element={
                <Suspense fallback={<PageSkeleton />}>
                  <DogInfoHealthManagement />
                </Suspense>
              } />
              <Route path="/dog-info/walk" element={
                <Suspense fallback={<PageSkeleton />}>
                  <DogInfoWalk />
                </Suspense>
              } />
              
              {/* 👥 コミュニティ関連 */}
              <Route path="/community" element={
                <Suspense fallback={<PageSkeleton />}>
                  <Community />
                </Suspense>
              } />
              <Route path="/contact" element={
                <Suspense fallback={<PageSkeleton />}>
                  <Contact />
                </Suspense>
              } />
              
              {/* その他のページ */}
              <Route path="/terms" element={
                <Suspense fallback={<PageSkeleton />}>
                  <TermsOfService />
                </Suspense>
              } />
              <Route path="/privacy" element={
                <Suspense fallback={<PageSkeleton />}>
                  <PrivacyPolicy />
                </Suspense>
              } />
              <Route path="/sponsor-inquiry" element={
                <Suspense fallback={<PageSkeleton />}>
                  <SponsorInquiry />
                </Suspense>
              } />
              <Route path="/sponsor-application" element={
                <Suspense fallback={<PageSkeleton />}>
                  <SponsorApplication />
                </Suspense>
              } />
              
              {/* 💳 決済・サブスクリプション */}
              <Route path="/subscription-intro" element={
                <Suspense fallback={<PageSkeleton />}>
                  <SubscriptionIntro />
                </Suspense>
              } />
              
              {/* 🔐 保護されたページ（ダッシュボードSkeleton） */}
              <Route path="/access-control" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <AccessControl />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/my-parks-management" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <MyParksManagement />
                  </Suspense>
                </ProtectedRoute>
              } />
              
              {/* PIN発行テストページ（開発環境のみ） */}
              {import.meta.env.DEV && (
                <Route path="/test-pin-generator" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageSkeleton />}>
                      <TestPinGenerator />
                    </Suspense>
                  </ProtectedRoute>
                } />
              )}
              <Route path="/my-facilities-management" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <MyFacilitiesManagement />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <UserDashboard />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/dog-registration" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <DogRegistration />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/dog-management" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <DogManagement />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/dog-profile/:id" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <DogProfile />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/jp-passport" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <JPPassport />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/profile-settings" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <ProfileSettings />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/payment-method-settings" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <PaymentMethodSettings />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/dogpark-history" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <DogParkHistory />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/my-coupons" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <MyCoupons />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/order-history" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <OrderHistory />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/reservation/:parkId" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <ParkReservation />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/liked-dogs" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <LikedDogs />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/park-registration" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <ParkRegistration />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/park-registration-agreement" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <ParkRegistrationAgreement />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/parks/:id/second-stage" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <ParkRegistrationSecondStage />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/parks/:id/manage" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <ParkManagement />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/parks/:id/edit" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <ParkEdit />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/parks/:id/reserve" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <ParkReservation />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/parks/:id/publish-setup" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <ParkPublishingSetup />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/facility-registration" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <FacilityRegistration />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/facilities/:id/edit" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <FacilityEdit />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/owner-payment-system" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <OwnerPaymentSystem />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/register-park" element={
                <ProtectedRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <ParkRegistration />
                  </Suspense>
                </ProtectedRoute>
              } />
              
              {/* 👑 管理者専用ページ（管理画面Skeleton） */}
              <Route path="/admin" element={
                <AdminRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <AdminDashboard />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/users" element={
                <AdminRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <AdminUserManagement />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/sponsors" element={
                <AdminRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <AdminSponsors />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/parks" element={
                <AdminRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <AdminParkManagement />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/reservations" element={
                <AdminRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <AdminReservationManagement />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/sales" element={
                <AdminRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <AdminSalesManagement />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/vaccine-approval" element={
                <AdminRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <AdminVaccineApproval />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/facility-approval" element={
                <AdminRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <AdminFacilityApproval />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/shop" element={
                <AdminRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <AdminShopManagement />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/revenue" element={
                <AdminRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <AdminRevenueReport />
                  </Suspense>
                </AdminRoute>
              } />
              <Route path="/admin/news" element={
                <AdminRoute>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <AdminNewsManagement />
                  </Suspense>
                </AdminRoute>
              } />
              
              {/* オーナー・運営関連 */}
              <Route path="/my-parks" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <MyParksManagement />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/my-facilities" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <MyFacilitiesManagement />
                  </Suspense>
                </ProtectedRoute>
              } />
              
              {/* デバッグ・開発者用 */}
              {/* <Route path="/debug/map" element={
                <Suspense fallback={<PageSkeleton />}>
                  <MapDebug />
                </Suspense>
              } /> */}
              
              {/* 404ページ */}
              <Route path="*" element={
                <Suspense fallback={<PageSkeleton />}>
                  <NotFound />
                </Suspense>
              } />
              </Routes>
            </Layout>
          </MaintenanceProvider>
        </GoogleMapsProvider>
      )}
    </>
  );
};

export default App;
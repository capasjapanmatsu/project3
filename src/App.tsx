import React, { Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Navigate, Route, Routes } from 'react-router-dom';
import useAuth from './context/AuthContext';

// レイアウトコンポーネント
import { BottomNavigation } from './components/BottomNavigation';
import { Footer } from './components/Footer';
import { DashboardSkeleton, PageSkeleton, ShopSkeleton } from './components/LoadingStates';
import { Navbar } from './components/Navbar';
import { SEO } from './components/SEO';
import ScrollToTop from './components/ScrollToTop';

// 保護されたルートコンポーネント
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <PageSkeleton />;
  }
  
  if (!user || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// 管理者専用の保護ルートコンポーネント
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <PageSkeleton />;
  }
  
  if (!user || !isAuthenticated) {
    return <Navigate to="/login" replace />;
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

// ドッグパーク関連ページ
const DogParkList = React.lazy(() => import('./pages/DogParkList').then(module => ({ default: module.DogParkList })));
const DogParkDetail = React.lazy(() => import('./pages/DogParkDetail').then(module => ({ default: module.DogParkDetail })));
const DogParkRules = React.lazy(() => import('./pages/DogParkRules').then(module => ({ default: module.DogParkRules })));

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
const NotFound = React.lazy(() => import('./pages/NotFound').then(module => ({ default: module.NotFound })));

// 保護されたページ
const UserDashboard = React.lazy(() => import('./pages/UserDashboard').then(module => ({ default: module.UserDashboard })));
const DogRegistration = React.lazy(() => import('./pages/DogRegistration').then(module => ({ default: module.DogRegistration })));
const DogManagement = React.lazy(() => import('./pages/DogManagement').then(module => ({ default: module.DogManagement })));
const DogProfile = React.lazy(() => import('./pages/DogProfile').then(module => ({ default: module.DogProfile })));
const ProfileSettings = React.lazy(() => import('./pages/ProfileSettings').then(module => ({ default: module.ProfileSettings })));
const ParkReservation = React.lazy(() => import('./pages/ParkReservation').then(module => ({ default: module.ParkReservation })));
const DogParkHistory = React.lazy(() => import('./pages/DogParkHistory').then(module => ({ default: module.DogParkHistory })));
const OrderHistory = React.lazy(() => import('./pages/OrderHistory').then(module => ({ default: module.OrderHistory })));
const LikedDogs = React.lazy(() => import('./pages/LikedDogs').then(module => ({ default: module.LikedDogs })));
const ParkRegistration = React.lazy(() => import('./pages/ParkRegistration').then(module => ({ default: module.ParkRegistration })));
const ParkRegistrationAgreement = React.lazy(() => import('./pages/ParkRegistrationAgreement').then(module => ({ default: module.ParkRegistrationAgreement })));
const ParkRegistrationSecondStage = React.lazy(() => import('./pages/ParkRegistrationSecondStage').then(module => ({ default: module.ParkRegistrationSecondStage })));
const ParkManagement = React.lazy(() => import('./pages/ParkManagement').then(module => ({ default: module.ParkManagement })));
const ParkPublishingSetup = React.lazy(() => import('./pages/ParkPublishingSetup').then(module => ({ default: module.ParkPublishingSetup })));
const FacilityRegistration = React.lazy(() => import('./pages/FacilityRegistration'));
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SEO />
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <BottomNavigation />
      </div>
    </HelmetProvider>
  );
};

const App: React.FC = () => {
  return (
    <Layout>
      <ScrollToTop />
      <Routes>
        {/* 🏠 公開ページ（高速表示） */}
        <Route path="/" element={
          <Suspense fallback={<PageSkeleton />}>
            <Home />
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
        
        {/* 🔐 保護されたページ（ダッシュボードSkeleton） */}
        <Route path="/access-control" element={
          <ProtectedRoute>
            <Suspense fallback={<DashboardSkeleton />}>
              <AccessControl />
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
        <Route path="/profile-settings" element={
          <ProtectedRoute>
            <Suspense fallback={<DashboardSkeleton />}>
              <ProfileSettings />
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
        <Route path="/park-history" element={
          <ProtectedRoute>
            <Suspense fallback={<DashboardSkeleton />}>
              <DogParkHistory />
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
        
        {/* 404ページ */}
        <Route path="*" element={
          <Suspense fallback={<PageSkeleton />}>
            <NotFound />
          </Suspense>
        } />
      </Routes>
    </Layout>
  );
};

export default App;
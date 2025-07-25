import React, { Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Navigate, Route, Routes } from 'react-router-dom';
import useAuth from './context/AuthContext';

// レイアウトコンポーネント
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { SEO } from './components/SEO';
import ScrollToTop from './components/ScrollToTop';

// シンプルなローディングスピナー
const LoadingSpinner = ({ message = 'ロード中...' }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

// 保護されたルートコンポーネント
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner message="認証確認中..." />;
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
    return <LoadingSpinner message="認証確認中..." />;
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
      </div>
    </HelmetProvider>
  );
};

const App: React.FC = () => {
  return (
    <Layout>
      <ScrollToTop />
      <Suspense fallback={<LoadingSpinner message="ページを読み込み中..." />}>
        <Routes>
          {/* 公開ページ */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* ドッグパーク関連 */}
          <Route path="/parks" element={<DogParkList />} />
          <Route path="/parks/:id" element={<DogParkDetail />} />
          <Route path="/rules" element={<DogParkRules />} />
          
          {/* ショッピング関連 */}
          <Route path="/petshop" element={<PetShop />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          
          {/* ニュース関連 */}
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          
          {/* ワンちゃん情報コーナー */}
          <Route path="/dog-info" element={<DogInfo />} />
          <Route path="/dog-info/breeds" element={<DogInfoBreeds />} />
          <Route path="/dog-info/care" element={<DogInfoCare />} />
          <Route path="/dog-info/food" element={<DogInfoFood />} />
          <Route path="/dog-info/training" element={<DogInfoTraining />} />
          <Route path="/dog-info/health" element={<DogInfoHealthManagement />} />
          <Route path="/dog-info/walk" element={<DogInfoWalk />} />
          
          {/* コミュニティ関連 */}
          <Route path="/community" element={<Community />} />
          <Route path="/contact" element={<Contact />} />
          
          {/* その他のページ */}
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          
          {/* 保護されたページ */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dog-registration" element={
            <ProtectedRoute>
              <DogRegistration />
            </ProtectedRoute>
          } />
          <Route path="/dog-management" element={
            <ProtectedRoute>
              <DogManagement />
            </ProtectedRoute>
          } />
          <Route path="/dog-profile/:id" element={
            <ProtectedRoute>
              <DogProfile />
            </ProtectedRoute>
          } />
          <Route path="/profile-settings" element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          } />
          <Route path="/reservation/:parkId" element={
            <ProtectedRoute>
              <ParkReservation />
            </ProtectedRoute>
          } />
          <Route path="/park-history" element={
            <ProtectedRoute>
              <DogParkHistory />
            </ProtectedRoute>
          } />
          <Route path="/order-history" element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          } />
          <Route path="/liked-dogs" element={
            <ProtectedRoute>
              <LikedDogs />
            </ProtectedRoute>
          } />
          <Route path="/park-registration" element={
            <ProtectedRoute>
              <ParkRegistration />
            </ProtectedRoute>
          } />
          <Route path="/park-registration-agreement" element={
            <ProtectedRoute>
              <ParkRegistrationAgreement />
            </ProtectedRoute>
          } />
          <Route path="/parks/:id/second-stage" element={
            <ProtectedRoute>
              <ParkRegistrationSecondStage />
            </ProtectedRoute>
          } />
          <Route path="/parks/:id/manage" element={
            <ProtectedRoute>
              <ParkManagement />
            </ProtectedRoute>
          } />
          <Route path="/parks/:id/reserve" element={
            <ProtectedRoute>
              <ParkReservation />
            </ProtectedRoute>
          } />
          <Route path="/parks/:id/publish-setup" element={
            <ProtectedRoute>
              <ParkPublishingSetup />
            </ProtectedRoute>
          } />
          <Route path="/facility-registration" element={
            <ProtectedRoute>
              <FacilityRegistration />
            </ProtectedRoute>
          } />
          <Route path="/owner-payment-system" element={
            <ProtectedRoute>
              <OwnerPaymentSystem />
            </ProtectedRoute>
          } />
                     <Route path="/register-park" element={
             <ProtectedRoute>
               <ParkRegistration />
             </ProtectedRoute>
           } />
          
          {/* 管理者専用ページ */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/admin/users" element={
            <AdminRoute>
              <AdminUserManagement />
            </AdminRoute>
          } />
          <Route path="/admin/parks" element={
            <AdminRoute>
              <AdminParkManagement />
            </AdminRoute>
          } />
          <Route path="/admin/reservations" element={
            <AdminRoute>
              <AdminReservationManagement />
            </AdminRoute>
          } />
          <Route path="/admin/sales" element={
            <AdminRoute>
              <AdminSalesManagement />
            </AdminRoute>
          } />
                     <Route path="/admin/vaccine-approval" element={
             <AdminRoute>
               <AdminVaccineApproval />
             </AdminRoute>
           } />
           <Route path="/admin/facility-approval" element={
             <AdminRoute>
               <AdminFacilityApproval />
             </AdminRoute>
           } />
           <Route path="/admin/shop" element={
             <AdminRoute>
               <AdminShopManagement />
             </AdminRoute>
           } />
          <Route path="/admin/revenue" element={
            <AdminRoute>
              <AdminRevenueReport />
            </AdminRoute>
          } />
          <Route path="/admin/news" element={
            <AdminRoute>
              <AdminNewsManagement />
            </AdminRoute>
          } />
          
          {/* 404ページ */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

export default App;
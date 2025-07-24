import { Suspense, useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import NotificationContainer from './components/NotificationContainer';
import PWAManager from './components/PWAManager';
import useAuth from './context/AuthContext';

// Import all lazy components from centralized file
import * as LazyComponents from './utils/lazyComponents';

// Direct imports for pages that need to be immediately available
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Optimized loading component with payment flow detection
const LoadingSpinner = ({ message = 'ロード中...' }: { message?: string }) => {
  const isPaymentFlow = window.location.pathname.includes('/payment') || 
                       window.location.pathname.includes('/checkout') ||
                       window.location.pathname.includes('/subscription') ||
                       window.location.search.includes('success=true') ||
                       window.location.search.includes('canceled=true');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 mb-2">{message}</p>
        {isPaymentFlow && (
          <p className="text-sm text-gray-500">
            決済後の処理を行っています...
          </p>
        )}
      </div>
    </div>
  );
};

// Protected route component - 無限ループを防止
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  // セッション初期化完了後に一度だけ認証チェック
  useEffect(() => {
    if (loading) return; // ローディング中は何もしない
    
    if (!user || !isAuthenticated) {
      console.log('🔐 ProtectedRoute: No auth, redirecting to login');
      navigate('/login', { 
        state: { from: window.location.pathname },
        replace: true 
      });
    }
  }, [loading, user, isAuthenticated]); // navigateを依存配列から削除

  // ローディング中
  if (loading) {
    return <LoadingSpinner message="認証確認中..." />;
  }

  // 認証済みでない場合は何も表示しない（useEffectでリダイレクト処理中）
  if (!user || !isAuthenticated) {
    return <LoadingSpinner message="リダイレクト中..." />;
  }

  return <>{children}</>;
};

// Auth callback handler component
const AuthCallback = () => {
  useEffect(() => {
    window.location.href = `/magic-link${window.location.hash}`;
  }, []);
  
  return <LoadingSpinner />;
};

function App() {
  // Performance monitoring and network state - 無効化して安定性を向上
  useEffect(() => {
    // 開発環境でのみ最小限の監視
    if (import.meta.env.DEV) {
      console.log('App initialized');
    }
  }, []);

  return (
    <>
      <Layout>
        <Suspense fallback={<LoadingSpinner message="ページを読み込み中..." />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LazyComponents.Home />} />
            <Route path="/login" element={<LazyComponents.Login />} />
            <Route path="/register" element={<LazyComponents.Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Dog Park Routes */}
            <Route path="/parks" element={<LazyComponents.DogParkList />} />
            <Route path="/parks/:parkId" element={<LazyComponents.DogParkDetail />} />
            <Route path="/parks/rules" element={<LazyComponents.DogParkRules />} />
            
            {/* Shop Routes */}
            <Route path="/shop" element={<LazyComponents.PetShop />} />
            <Route path="/shop/product/:productId" element={<LazyComponents.ProductDetail />} />
            
            {/* Info & Legal */}
            <Route path="/privacy" element={<LazyComponents.PrivacyPolicy />} />
            <Route path="/terms" element={<LazyComponents.TermsOfService />} />
            <Route path="/contact" element={<LazyComponents.Contact />} />
            <Route path="/magic-link" element={<LazyComponents.MagicLink />} />
            <Route path="/payment-confirmation" element={<LazyComponents.PaymentConfirmation />} />
            <Route path="/business-information" element={<LazyComponents.BusinessInformation />} />
            
            {/* News & Community */}
            <Route path="/news" element={<LazyComponents.News />} />
            <Route path="/news/:newsId" element={<LazyComponents.NewsDetail />} />
            <Route path="/news/park/:parkId" element={<LazyComponents.NewParkDetail />} />
            
            {/* Dog Profiles */}
            <Route path="/dog/:id" element={<LazyComponents.DogProfile />} />
            <Route path="/dog-profile/:dogId" element={<LazyComponents.DogProfile />} />
            
            {/* Dog Information */}
            <Route path="/dog-info" element={<LazyComponents.DogInfo />} />
            <Route path="/dog-info/foods" element={<LazyComponents.DogInfoFoods />} />
            <Route path="/dog-info/vaccine" element={<LazyComponents.DogInfoVaccine />} />
            <Route path="/dog-info/breeds" element={<LazyComponents.DogInfoBreeds />} />
            <Route path="/dog-info/parasite" element={<LazyComponents.DogInfoParasite />} />
            <Route path="/dog-info/snack" element={<LazyComponents.DogInfoSnack />} />
            <Route path="/dog-info/show" element={<LazyComponents.DogInfoShow />} />
            
            {/* New Dog Information Pages */}
            <Route path="/dog-info/health" element={<LazyComponents.HealthManagement />} />
            <Route path="/dog-info/training" element={<LazyComponents.Training />} />
            <Route path="/dog-info/walk" element={<LazyComponents.Walk />} />
            <Route path="/dog-info/food" element={<LazyComponents.Food />} />
            <Route path="/dog-info/care" element={<LazyComponents.Care />} />
            <Route path="/dog-info/breeds" element={<LazyComponents.Breeds />} />
            
            {/* Development Tools */}
            <Route path="/netlify-setup-guide" element={<LazyComponents.NetlifySetupGuide />} />
            <Route path="/pwa-setup-guide" element={<LazyComponents.PWASetupGuide />} />
            <Route path="/pwa-implementation-guide" element={<LazyComponents.PWAImplementationGuide />} />
            <Route path="/pwa-documentation" element={<LazyComponents.PWADocumentation />} />
            <Route path="/pwa-testing-suite" element={<LazyComponents.PWATestingSuite />} />
            <Route path="/pwa-lighthouse-audit" element={<LazyComponents.PWALighthouseAudit />} />
            <Route path="/pwa-deployment-guide" element={<LazyComponents.PWADeploymentGuide />} />
            
            {/* Auth Callback */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* PROTECTED ROUTES */}
            {/* User Dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><LazyComponents.UserDashboard /></ProtectedRoute>} />
            <Route path="/profile-settings" element={<ProtectedRoute><LazyComponents.ProfileSettings /></ProtectedRoute>} />
            
            {/* Dog Management */}
            <Route path="/liked-dogs" element={<ProtectedRoute><LazyComponents.LikedDogs /></ProtectedRoute>} />
            <Route path="/register-dog" element={<ProtectedRoute><LazyComponents.DogRegistration /></ProtectedRoute>} />
            <Route path="/dog-management" element={<ProtectedRoute><LazyComponents.DogManagement /></ProtectedRoute>} />
            
            {/* Park Management */}
            <Route path="/park-management" element={<ProtectedRoute><LazyComponents.ParkManagement /></ProtectedRoute>} />
            <Route path="/register-park" element={<ProtectedRoute><LazyComponents.ParkRegistration /></ProtectedRoute>} />
            <Route path="/facility-registration" element={<ProtectedRoute><LazyComponents.FacilityRegistration /></ProtectedRoute>} />
            <Route path="/park-publishing-setup" element={<ProtectedRoute><LazyComponents.ParkManagement /></ProtectedRoute>} />
            
            {/* Community & Social */}
            <Route path="/community" element={<ProtectedRoute><LazyComponents.Community /></ProtectedRoute>} />
            
            {/* Reservations & Access */}
            <Route path="/access-control" element={<ProtectedRoute><LazyComponents.AccessControl /></ProtectedRoute>} />
            <Route path="/reservation/:parkId" element={<ProtectedRoute><LazyComponents.ParkReservation /></ProtectedRoute>} />
            <Route path="/reservation-history" element={<ProtectedRoute><LazyComponents.OrderHistory /></ProtectedRoute>} />
            
            {/* Store & Payments */}
            <Route path="/cart" element={<ProtectedRoute><LazyComponents.Cart /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><LazyComponents.Checkout /></ProtectedRoute>} />
            <Route path="/order-history" element={<ProtectedRoute><LazyComponents.OrderHistory /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><LazyComponents.Subscription /></ProtectedRoute>} />
            
            {/* Owner Dashboard */}
            <Route path="/owner-dashboard" element={<ProtectedRoute><LazyComponents.OwnerDashboard /></ProtectedRoute>} />
            <Route path="/owner-payment-system" element={<ProtectedRoute><LazyComponents.OwnerPaymentSystem /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><LazyComponents.AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/parks" element={<ProtectedRoute><LazyComponents.AdminParkManagement /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><LazyComponents.AdminUserManagement /></ProtectedRoute>} />
            <Route path="/admin/facilities" element={<ProtectedRoute><LazyComponents.AdminFacilityApproval /></ProtectedRoute>} />
            <Route path="/admin/vaccines" element={<ProtectedRoute><LazyComponents.AdminVaccineApproval /></ProtectedRoute>} />
            <Route path="/admin/management" element={<ProtectedRoute><LazyComponents.AdminManagement /></ProtectedRoute>} />
            <Route path="/admin/news" element={<ProtectedRoute><LazyComponents.AdminNewsManagement /></ProtectedRoute>} />
            <Route path="/admin/reservations" element={<ProtectedRoute><LazyComponents.AdminReservationManagement /></ProtectedRoute>} />
            <Route path="/admin/revenue-report" element={<ProtectedRoute><LazyComponents.AdminRevenueReport /></ProtectedRoute>} />
            <Route path="/admin/sales" element={<ProtectedRoute><LazyComponents.AdminSalesManagement /></ProtectedRoute>} />
            <Route path="/admin/shop" element={<ProtectedRoute><LazyComponents.AdminShopManagement /></ProtectedRoute>} />
            <Route path="/admin/tasks" element={<ProtectedRoute><LazyComponents.AdminTasks /></ProtectedRoute>} />
            <Route path="/admin/user/:userId" element={<ProtectedRoute><LazyComponents.AdminUserDetail /></ProtectedRoute>} />
            
            {/* 2FA Route */}
            <Route path="/verify-2fa" element={<LazyComponents.TwoFactorVerify />} />
            
            {/* Development & Deployment */}
            <Route path="/deploy" element={<ProtectedRoute><LazyComponents.Deploy /></ProtectedRoute>} />
            <Route path="/deployment-history" element={<ProtectedRoute><LazyComponents.DeploymentHistory /></ProtectedRoute>} />
            
            {/* 404 */}
            <Route path="*" element={<LazyComponents.Home />} />
          </Routes>
        </Suspense>
      </Layout>
      <NotificationContainer />
      <PWAManager />
    </>
  );
}

export default App;
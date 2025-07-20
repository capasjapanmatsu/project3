import { Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
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

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
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
  // Performance monitoring and network state
  useEffect(() => {
    if (import.meta.env.PROD) {
      // Network state monitoring
      const handleOnline = () => console.log('🌐 Network: Online');
      const handleOffline = () => console.warn('🔌 Network: Offline');
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Performance monitoring
      const reportWebVitals = () => {
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (entry.entryType === 'measure') {
                console.log(`📊 Performance: ${entry.name} - ${entry.duration.toFixed(2)}ms`);
              }
            });
          });
          
          try {
            observer.observe({ entryTypes: ['measure', 'navigation'] });
          } catch (e) {
            // Ignore browser support issues
          }
        }
      };
      
      reportWebVitals();
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
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
            
            {/* Park Features */}
            <Route path="/parks/:parkId/reserve" element={<ProtectedRoute><LazyComponents.ParkReservation /></ProtectedRoute>} />
            <Route path="/parks/:parkId/manage" element={<ProtectedRoute><LazyComponents.ParkManagement /></ProtectedRoute>} />
            <Route path="/parks/:parkId/second-stage" element={<ProtectedRoute><LazyComponents.ParkRegistrationSecondStage /></ProtectedRoute>} />
            <Route path="/park-registration-agreement" element={<ProtectedRoute><LazyComponents.ParkRegistrationAgreement /></ProtectedRoute>} />
            <Route path="/register-park" element={<ProtectedRoute><LazyComponents.ParkRegistration /></ProtectedRoute>} />
            <Route path="/dogpark-history" element={<ProtectedRoute><LazyComponents.DogParkHistory /></ProtectedRoute>} />
            
            {/* Community */}
            <Route path="/community" element={<ProtectedRoute><LazyComponents.Community /></ProtectedRoute>} />
            
            {/* E-commerce */}
            <Route path="/cart" element={<ProtectedRoute><LazyComponents.Cart /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><LazyComponents.Checkout /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><LazyComponents.OrderHistory /></ProtectedRoute>} />
            
            {/* Payments */}
            <Route path="/payment-setup" element={<ProtectedRoute><LazyComponents.PaymentSetup /></ProtectedRoute>} />
            <Route path="/payment-method-settings" element={<ProtectedRoute><LazyComponents.PaymentMethodSettings /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><LazyComponents.Subscription /></ProtectedRoute>} />
            
            {/* Owner Features */}
            <Route path="/owner-dashboard" element={<ProtectedRoute><LazyComponents.OwnerDashboard /></ProtectedRoute>} />
            <Route path="/owner-payment-system" element={<ProtectedRoute><LazyComponents.OwnerPaymentSystem /></ProtectedRoute>} />
            
            {/* Admin Panel */}
            <Route path="/admin" element={<ProtectedRoute><LazyComponents.AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><LazyComponents.AdminUserManagement /></ProtectedRoute>} />
            <Route path="/admin/users/:userId" element={<ProtectedRoute><LazyComponents.AdminUserDetail /></ProtectedRoute>} />
            <Route path="/admin/parks" element={<ProtectedRoute><LazyComponents.AdminParkManagement /></ProtectedRoute>} />
            <Route path="/admin/reservations" element={<ProtectedRoute><LazyComponents.AdminReservationManagement /></ProtectedRoute>} />
            <Route path="/admin/sales" element={<ProtectedRoute><LazyComponents.AdminSalesManagement /></ProtectedRoute>} />
            <Route path="/admin/management" element={<ProtectedRoute><LazyComponents.AdminManagement /></ProtectedRoute>} />
            <Route path="/admin/tasks" element={<ProtectedRoute><LazyComponents.AdminTasks /></ProtectedRoute>} />
            <Route path="/admin/shop" element={<ProtectedRoute><LazyComponents.AdminShopManagement /></ProtectedRoute>} />
            <Route path="/admin/revenue" element={<ProtectedRoute><LazyComponents.AdminRevenueReport /></ProtectedRoute>} />
            <Route path="/admin/news" element={<ProtectedRoute><LazyComponents.AdminNewsManagement /></ProtectedRoute>} />
            <Route path="/admin/vaccine-approval" element={<ProtectedRoute><LazyComponents.AdminVaccineApproval /></ProtectedRoute>} />
            <Route path="/admin/facility-approval" element={<ProtectedRoute><LazyComponents.AdminFacilityApproval /></ProtectedRoute>} />
            
            {/* Facility Registration */}
            <Route path="/facility-registration" element={<ProtectedRoute><LazyComponents.FacilityRegistration /></ProtectedRoute>} />
            
            {/* Security */}
            <Route path="/two-factor-setup" element={<ProtectedRoute><LazyComponents.TwoFactorSetup /></ProtectedRoute>} />
            <Route path="/two-factor-verify" element={<ProtectedRoute><LazyComponents.TwoFactorVerify /></ProtectedRoute>} />
            <Route path="/access-control" element={<ProtectedRoute><LazyComponents.AccessControl /></ProtectedRoute>} />
            
            {/* Development */}
            <Route path="/deploy" element={<ProtectedRoute><LazyComponents.Deploy /></ProtectedRoute>} />
            <Route path="/deployment-history" element={<ProtectedRoute><LazyComponents.DeploymentHistory /></ProtectedRoute>} />
            
            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
      
      {/* Global Components */}
      <PWAManager />
      <NotificationContainer />
    </>
  );
}

export default App;
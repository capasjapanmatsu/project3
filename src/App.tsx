import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import useAuth from './context/AuthContext';
import DogInfo from './pages/DogInfo';
import DogInfoFoods from './pages/DogInfoFoods';
import DogInfoVaccine from './pages/DogInfoVaccine';
import DogInfoBreeds from './pages/DogInfoBreeds';
import DogInfoParasite from './pages/DogInfoParasite';
import DogInfoSnack from './pages/DogInfoSnack';
import DogInfoShow from './pages/DogInfoShow';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';


// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Register = lazy(() => import('./pages/Register').then(module => ({ default: module.Register })));
const UserDashboard = lazy(() => import('./pages/UserDashboard').then(module => ({ default: module.UserDashboard })));
const DogRegistration = lazy(() => import('./pages/DogRegistration').then(module => ({ default: module.DogRegistration })));
const DogManagement = lazy(() => import('./pages/DogManagement').then(module => ({ default: module.DogManagement })));
const DogParkList = lazy(() => import('./pages/DogParkList').then(module => ({ default: module.DogParkList })));
const DogParkDetail = lazy(() => import('./pages/DogParkDetail').then(module => ({ default: module.DogParkDetail })));
const DogParkRules = lazy(() => import('./pages/DogParkRules').then(module => ({ default: module.DogParkRules })));
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard').then(module => ({ default: module.OwnerDashboard })));
const ParkRegistration = lazy(() => import('./pages/ParkRegistration').then(module => ({ default: module.ParkRegistration })));
const ParkRegistrationAgreement = lazy(() => import('./pages/ParkRegistrationAgreement').then(module => ({ default: module.ParkRegistrationAgreement })));
const ParkReservation = lazy(() => import('./pages/ParkReservation').then(module => ({ default: module.ParkReservation })));
const Community = lazy(() => import('./pages/Community').then(module => ({ default: module.Community })));
const PetShop = lazy(() => import('./pages/PetShop').then(module => ({ default: module.PetShop })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(module => ({ default: module.ProductDetail })));
const Cart = lazy(() => import('./pages/Cart').then(module => ({ default: module.Cart })));
const Checkout = lazy(() => import('./pages/Checkout').then(module => ({ default: module.Checkout })));
const OrderHistory = lazy(() => import('./pages/OrderHistory').then(module => ({ default: module.OrderHistory })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AdminManagement = lazy(() => import('./pages/AdminManagement').then(module => ({ default: module.AdminManagement })));
const AdminTasks = lazy(() => import('./pages/AdminTasks').then(module => ({ default: module.AdminTasks })));
const AdminRevenueReport = lazy(() => import('./pages/AdminRevenueReport').then(module => ({ default: module.AdminRevenueReport })));
const AccessControl = lazy(() => import('./pages/AccessControl').then(module => ({ default: module.AccessControl })));
const PaymentSetup = lazy(() => import('./pages/PaymentSetup').then(module => ({ default: module.PaymentSetup })));
const OwnerPaymentSystem = lazy(() => import('./pages/OwnerPaymentSystem').then(module => ({ default: module.OwnerPaymentSystem })));
const Subscription = lazy(() => import('./pages/Subscription').then(module => ({ default: module.Subscription })));
const AdminShopManagement = lazy(() => import('./pages/AdminShopManagement').then(module => ({ default: module.AdminShopManagement })));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings').then(module => ({ default: module.ProfileSettings })));
const PaymentMethodSettings = lazy(() => import('./pages/PaymentMethodSettings').then(module => ({ default: module.PaymentMethodSettings })));
const ParkManagement = lazy(() => import('./pages/ParkManagement').then(module => ({ default: module.ParkManagement })));
const DogParkHistory = lazy(() => import('./pages/DogParkHistory').then(module => ({ default: module.DogParkHistory })));
const ParkRegistrationSecondStage = lazy(() => import('./pages/ParkRegistrationSecondStage').then(module => ({ default: module.ParkRegistrationSecondStage })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./pages/TermsOfService').then(module => ({ default: module.TermsOfService })));
const Contact = lazy(() => import('./pages/Contact').then(module => ({ default: module.Contact })));
const MagicLink = lazy(() => import('./pages/MagicLink').then(module => ({ default: module.MagicLink })));
const PaymentConfirmation = lazy(() => import('./pages/PaymentConfirmation').then(module => ({ default: module.PaymentConfirmation })));
const Deploy = lazy(() => import('./pages/Deploy').then(module => ({ default: module.Deploy })));
const DeploymentHistory = lazy(() => import('./pages/DeploymentHistory').then(module => ({ default: module.DeploymentHistory })));
const BusinessInformation = lazy(() => import('./pages/BusinessInformation').then(module => ({ default: module.BusinessInformation })));
const News = lazy(() => import('./pages/News').then(module => ({ default: module.News })));
const NewsDetail = lazy(() => import('./pages/NewsDetail').then(module => ({ default: module.NewsDetail })));
const NewParkDetail = lazy(() => import('./pages/NewParkDetail').then(module => ({ default: module.NewParkDetail })));
const TwoFactorSetup = lazy(() => import('./pages/TwoFactorSetup'));
const TwoFactorVerify = lazy(() => import('./pages/TwoFactorVerify'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
  </div>
);

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while authentication state is being determined
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    // Redirect to login if not logged in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAuthenticated) {
    // If user is logged in but not fully authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Auth callback handler component
const AuthCallback = () => {
  const navigate = useLocation();
  
  useEffect(() => {
    // Redirect to MagicLink component to handle the authentication
    window.location.href = `/magic-link${window.location.hash}`;
  }, [navigate]);
  
  return <LoadingSpinner />;
};

function App() {
  return (
    <Router>
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/parks" element={<DogParkList />} />
            <Route path="/parks/:parkId" element={<DogParkDetail />} />
            <Route path="/parks/rules" element={<DogParkRules />} />
            <Route path="/shop" element={<PetShop />} />
            <Route path="/shop/product/:productId" element={<ProductDetail />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/magic-link" element={<MagicLink />} />
            <Route path="/payment-confirmation" element={<PaymentConfirmation />} />
            <Route path="/business-information" element={<BusinessInformation />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:newsId" element={<NewsDetail />} />
            <Route path="/news/park/:parkId" element={<NewParkDetail />} />
            <Route path="/two-factor-setup" element={<ProtectedRoute><TwoFactorSetup /></ProtectedRoute>} />
            <Route path="/two-factor-verify" element={<ProtectedRoute><TwoFactorVerify /></ProtectedRoute>} />
            <Route path="/dog-info" element={<DogInfo />} />
            <Route path="/dog-info/foods" element={<DogInfoFoods />} />
            <Route path="/dog-info/vaccine" element={<DogInfoVaccine />} />
            <Route path="/dog-info/breeds" element={<DogInfoBreeds />} />
            <Route path="/dog-info/parasite" element={<DogInfoParasite />} />
            <Route path="/dog-info/snack" element={<DogInfoSnack />} />
            <Route path="/dog-info/show" element={<DogInfoShow />} />
            
            {/* Auth callback route */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
            <Route path="/register-dog" element={<ProtectedRoute><DogRegistration /></ProtectedRoute>} />
            <Route path="/dog-management" element={<ProtectedRoute><DogManagement /></ProtectedRoute>} />
            <Route path="/parks/:parkId/reserve" element={<ProtectedRoute><ParkReservation /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
            <Route path="/owner-dashboard" element={<ProtectedRoute><OwnerDashboard /></ProtectedRoute>} />
            <Route path="/park-registration-agreement" element={<ProtectedRoute><ParkRegistrationAgreement /></ProtectedRoute>} />
            <Route path="/register-park" element={<ProtectedRoute><ParkRegistration /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/management" element={<ProtectedRoute><AdminManagement /></ProtectedRoute>} />
            <Route path="/admin/tasks" element={<ProtectedRoute><AdminTasks /></ProtectedRoute>} />
            <Route path="/admin/shop" element={<ProtectedRoute><AdminShopManagement /></ProtectedRoute>} />
            <Route path="/admin/revenue" element={<ProtectedRoute><AdminRevenueReport /></ProtectedRoute>} />
            <Route path="/access-control" element={<ProtectedRoute><AccessControl /></ProtectedRoute>} />
            <Route path="/payment-setup" element={<ProtectedRoute><PaymentSetup /></ProtectedRoute>} />
            <Route path="/owner-payment-system" element={<ProtectedRoute><OwnerPaymentSystem /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
            <Route path="/profile-settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            <Route path="/payment-method-settings" element={<ProtectedRoute><PaymentMethodSettings /></ProtectedRoute>} />
            <Route path="/parks/:parkId/manage" element={<ProtectedRoute><ParkManagement /></ProtectedRoute>} />
            <Route path="/dogpark-history" element={<ProtectedRoute><DogParkHistory /></ProtectedRoute>} />
            <Route path="/parks/:parkId/second-stage" element={<ProtectedRoute><ParkRegistrationSecondStage /></ProtectedRoute>} />
            <Route path="/deploy" element={<ProtectedRoute><Deploy /></ProtectedRoute>} />
            <Route path="/deployment-history" element={<ProtectedRoute><DeploymentHistory /></ProtectedRoute>} />
            
            {/* Redirect to home by default */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

export default App;
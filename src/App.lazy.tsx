import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import ErrorFallback from './components/ErrorFallback';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SkipNavigation from './components/accessibility/SkipNavigation';
import { AuthProvider } from './context/AuthContext';
import { MaintenanceProvider } from './context/MaintenanceContext';

// 遅延読み込みするページコンポーネント
// ホーム関連
const Home = lazy(() => import('./pages/Home'));
const Landing = lazy(() => import('./pages/Landing'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Locations = lazy(() => import('./pages/Locations'));

// 認証関連
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const PasswordReset = lazy(() => import('./pages/PasswordReset'));

// ユーザー関連
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));
const UserReviews = lazy(() => import('./pages/UserReviews'));

// ドッグラン関連
const DogParkList = lazy(() => import('./pages/DogParkList'));
const DogParkDetail = lazy(() => import('./pages/DogParkDetail'));
const DogParkSearch = lazy(() => import('./pages/DogParkSearch'));
const DogParkMap = lazy(() => import('./pages/DogParkMap'));
const ReservationPage = lazy(() => import('./pages/ReservationPage'));
const ParkMap = lazy(() => import('./pages/ParkMap'));
const ParkReviews = lazy(() => import('./pages/ParkReviews'));
const WriteReview = lazy(() => import('./pages/WriteReview'));

// ドッグラン管理関連
const DogParkRegistration = lazy(() => import('./pages/DogParkRegistration'));
const MyParksManagement = lazy(() => import('./pages/MyParksManagement'));
const ParkManagement = lazy(() => import('./pages/ParkManagement'));
const ParkInquiries = lazy(() => import('./pages/ParkInquiries'));
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard'));
const ParkPublishingSetup = lazy(() => import('./pages/ParkPublishingSetup'));

// 決済・サブスク関連
const Pricing = lazy(() => import('./pages/Pricing'));
const PaymentSetup = lazy(() => import('./pages/PaymentSetup'));
const PaymentMethod = lazy(() => import('./pages/PaymentMethod'));
const PaymentHistory = lazy(() => import('./pages/PaymentHistory'));
const SubscriptionManagement = lazy(() => import('./pages/SubscriptionManagement'));
const SubscriptionSuccess = lazy(() => import('./pages/SubscriptionSuccess'));
const PaymentComplete = lazy(() => import('./pages/PaymentComplete'));

// 犬関連
const DogRegistration = lazy(() => import('./pages/DogRegistration'));
const DogManagement = lazy(() => import('./pages/DogManagement'));
const DogDetail = lazy(() => import('./pages/DogDetail'));
const DogProfile = lazy(() => import('./pages/DogProfile'));
const HealthCheck = lazy(() => import('./pages/HealthCheck'));
const VaccineManagement = lazy(() => import('./pages/VaccineManagement'));

// 犬情報ページ
const DogInfoBreeds = lazy(() => import('./pages/dog-info/Breeds'));
const DogInfoCare = lazy(() => import('./pages/dog-info/Care'));
const DogInfoFood = lazy(() => import('./pages/dog-info/Food'));
const DogInfoHealth = lazy(() => import('./pages/dog-info/Health'));
const DogInfoLifecycle = lazy(() => import('./pages/dog-info/Lifecycle'));
const DogInfoTraining = lazy(() => import('./pages/dog-info/Training'));

// その他施設関連
const FacilityRegistration = lazy(() => import('./pages/FacilityRegistration'));
const MyFacilitiesManagement = lazy(() => import('./pages/MyFacilitiesManagement'));
const FacilityEdit = lazy(() => import('./pages/FacilityEdit'));
const FacilityDetail = lazy(() => import('./pages/FacilityDetail'));
const FacilityList = lazy(() => import('./pages/FacilityList'));

// 管理者関連
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminFacilityApproval = lazy(() => import('./pages/AdminFacilityApproval'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AccessControl = lazy(() => import('./pages/AccessControl'));
const AdminMaintenanceManagement = lazy(() => import('./pages/AdminMaintenanceManagement'));

// スポンサー関連
const SponsorDashboard = lazy(() => import('./pages/SponsorDashboard'));
const SponsorInquiry = lazy(() => import('./pages/SponsorInquiry'));
const SponsorSettings = lazy(() => import('./pages/SponsorSettings'));
const SponsorBannerManagement = lazy(() => import('./pages/SponsorBannerManagement'));

// コミュニティ関連
const Community = lazy(() => import('./pages/Community'));
const CommunityBoardDetail = lazy(() => import('./pages/CommunityBoardDetail'));
const CommunityWrite = lazy(() => import('./pages/CommunityWrite'));
const Marketplace = lazy(() => import('./pages/Marketplace'));

// その他
const News = lazy(() => import('./pages/News'));
const NewsDetail = lazy(() => import('./pages/NewsDetail'));
const Help = lazy(() => import('./pages/Help'));
const HelpCategory = lazy(() => import('./pages/HelpCategory'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Notifications = lazy(() => import('./pages/Notifications'));
const SearchResult = lazy(() => import('./pages/SearchResult'));
const NotFound = lazy(() => import('./pages/NotFound'));
const QRScanner = lazy(() => import('./pages/QRScanner'));
const ParkQR = lazy(() => import('./pages/ParkQR'));
const MapView = lazy(() => import('./pages/MapView'));

// テスト用ページ
const TestMapView = lazy(() => import('./pages/TestMapView'));
const TestPinGenerator = lazy(() => import('./pages/TestPinGenerator'));

// 再利用可能なローディングコンポーネント
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">読み込み中...</p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthProvider>
        <MaintenanceProvider>
          <Router>
            <SkipNavigation />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Standalone Landing Page */}
                <Route path="/landing" element={<Landing />} />
                
              <Route path="/" element={<Layout />}>
                {/* Public Routes */}
                <Route index element={<Home />} />
                <Route path="about" element={<About />} />
                <Route path="contact" element={<Contact />} />
                <Route path="terms" element={<Terms />} />
                <Route path="privacy" element={<Privacy />} />
                <Route path="locations" element={<Locations />} />
                <Route path="help" element={<Help />} />
                <Route path="help/:category" element={<HelpCategory />} />
                <Route path="faq" element={<FAQ />} />
                <Route path="news" element={<News />} />
                <Route path="news/:id" element={<NewsDetail />} />
                <Route path="pricing" element={<Pricing />} />
                
                {/* Auth Routes */}
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="password-reset" element={<PasswordReset />} />
                
                {/* Dog Parks - Public */}
                <Route path="dog-parks" element={<DogParkList />} />
                <Route path="dog-parks/search" element={<DogParkSearch />} />
                <Route path="dog-parks/map" element={<DogParkMap />} />
                <Route path="dog-parks/:id" element={<DogParkDetail />} />
                <Route path="dog-parks/:id/reviews" element={<ParkReviews />} />
                <Route path="dog-parks/:parkId/map" element={<ParkMap />} />
                <Route path="parks/:id/qr" element={<ParkQR />} />
                
                {/* Facilities - Public */}
                <Route path="facilities" element={<FacilityList />} />
                <Route path="facilities/:id" element={<FacilityDetail />} />
                
                {/* Dog Info */}
                <Route path="dog-info/breeds" element={<DogInfoBreeds />} />
                <Route path="dog-info/care" element={<DogInfoCare />} />
                <Route path="dog-info/food" element={<DogInfoFood />} />
                <Route path="dog-info/health" element={<DogInfoHealth />} />
                <Route path="dog-info/lifecycle" element={<DogInfoLifecycle />} />
                <Route path="dog-info/training" element={<DogInfoTraining />} />
                
                {/* Community */}
                <Route path="community" element={<Community />} />
                <Route path="community/board/:boardId" element={<CommunityBoardDetail />} />
                <Route path="community/write" element={<ProtectedRoute><CommunityWrite /></ProtectedRoute>} />
                <Route path="marketplace" element={<Marketplace />} />
                
                {/* Protected Routes */}
                <Route path="dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
                <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="notifications/settings" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
                <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
                <Route path="my-reviews" element={<ProtectedRoute><UserReviews /></ProtectedRoute>} />
                <Route path="search" element={<SearchResult />} />
                
                {/* Dog Management */}
                <Route path="dogs/register" element={<ProtectedRoute><DogRegistration /></ProtectedRoute>} />
                <Route path="dogs/manage" element={<ProtectedRoute><DogManagement /></ProtectedRoute>} />
                <Route path="dogs/:id" element={<ProtectedRoute><DogDetail /></ProtectedRoute>} />
                <Route path="dogs/:id/profile" element={<ProtectedRoute><DogProfile /></ProtectedRoute>} />
                <Route path="dogs/:id/health-check" element={<ProtectedRoute><HealthCheck /></ProtectedRoute>} />
                <Route path="dogs/:id/vaccines" element={<ProtectedRoute><VaccineManagement /></ProtectedRoute>} />
                
                {/* Reservations */}
                <Route path="dog-parks/:id/reserve" element={<ProtectedRoute><ReservationPage /></ProtectedRoute>} />
                <Route path="dog-parks/:id/review/write" element={<ProtectedRoute><WriteReview /></ProtectedRoute>} />
                
                {/* Park Management */}
                <Route path="dog-parks/register" element={<ProtectedRoute><DogParkRegistration /></ProtectedRoute>} />
                <Route path="my-parks-management" element={<ProtectedRoute><MyParksManagement /></ProtectedRoute>} />
                <Route path="park-management/:id" element={<ProtectedRoute><ParkManagement /></ProtectedRoute>} />
                <Route path="park-management/:id/inquiries" element={<ProtectedRoute><ParkInquiries /></ProtectedRoute>} />
                <Route path="park-management/:id/publishing" element={<ProtectedRoute><ParkPublishingSetup /></ProtectedRoute>} />
                <Route path="owner-dashboard" element={<ProtectedRoute><OwnerDashboard /></ProtectedRoute>} />
                
                {/* Facility Management */}
                <Route path="facilities/register" element={<ProtectedRoute><FacilityRegistration /></ProtectedRoute>} />
                <Route path="my-facilities" element={<ProtectedRoute><MyFacilitiesManagement /></ProtectedRoute>} />
                <Route path="facilities/:id/edit" element={<ProtectedRoute><FacilityEdit /></ProtectedRoute>} />
                
                {/* Payment */}
                <Route path="payment/setup" element={<ProtectedRoute><PaymentSetup /></ProtectedRoute>} />
                <Route path="payment/method" element={<ProtectedRoute><PaymentMethod /></ProtectedRoute>} />
                <Route path="payment/history" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />
                <Route path="payment/complete" element={<ProtectedRoute><PaymentComplete /></ProtectedRoute>} />
                <Route path="subscription/manage" element={<ProtectedRoute><SubscriptionManagement /></ProtectedRoute>} />
                <Route path="subscription/success" element={<ProtectedRoute><SubscriptionSuccess /></ProtectedRoute>} />
                
                {/* Admin Routes */}
                <Route path="admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
                <Route path="admin/facilities/approval" element={<ProtectedRoute adminOnly><AdminFacilityApproval /></ProtectedRoute>} />
                <Route path="admin/settings" element={<ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute>} />
                <Route path="admin/access-control" element={<ProtectedRoute adminOnly><AccessControl /></ProtectedRoute>} />
                <Route path="admin/maintenance" element={<ProtectedRoute adminOnly><AdminMaintenanceManagement /></ProtectedRoute>} />
                
                {/* Sponsor Routes */}
                <Route path="sponsor" element={<SponsorDashboard />} />
                <Route path="sponsor/inquiry" element={<SponsorInquiry />} />
                <Route path="sponsor/settings" element={<ProtectedRoute><SponsorSettings /></ProtectedRoute>} />
                <Route path="sponsor/banners" element={<ProtectedRoute><SponsorBannerManagement /></ProtectedRoute>} />
                
                {/* Utility Routes */}
                <Route path="qr-scanner" element={<ProtectedRoute><QRScanner /></ProtectedRoute>} />
                <Route path="map" element={<MapView />} />
                
                {/* Test Routes - Only in development */}
                {import.meta.env.DEV && (
                  <>
                    <Route path="test/map" element={<TestMapView />} />
                    <Route path="test/pin-generator" element={<TestPinGenerator />} />
                  </>
                )}
                
                {/* Fallback */}
                <Route path="404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </MaintenanceProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

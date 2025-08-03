import { lazy } from 'react';

// ===== OPTIMIZED LAZY LOADING SYSTEM =====
// Unified approach for both named and default exports

// Core Pages (Named Exports)
export const Home = lazy(() => import('../pages/Home').then(module => ({ default: module.Home })));
export const Login = lazy(() => import('../pages/Login').then(module => ({ default: module.Login })));
export const Register = lazy(() => import('../pages/Register').then(module => ({ default: module.Register })));

// User pages - all wrapped in lazy loading with preload triggers
export const UserDashboard = lazy(() => import('../pages/UserDashboard'));
export const DogRegistration = lazy(() => import('../pages/DogRegistration'));
export const DogManagement = lazy(() => import('../pages/DogManagement'));
export const DogProfile = lazy(() => import('../pages/DogProfile'));
export const ProfileSettings = lazy(() => import('../pages/ProfileSettings').then(module => ({ default: module.ProfileSettings })));
export const PaymentMethodSettings = lazy(() => import('../pages/PaymentMethodSettings').then(module => ({ default: module.PaymentMethodSettings })));
export const DogParkHistory = lazy(() => import('../pages/DogParkHistory').then(module => ({ default: module.DogParkHistory })));
export const ParkReservation = lazy(() => import('../pages/ParkReservation').then(module => ({ default: module.ParkReservation })));
export const LikedDogs = lazy(() => import('../pages/LikedDogs').then(module => ({ default: module.LikedDogs })));
export const MyCoupons = lazy(() => import('../pages/MyCoupons').then(module => ({ default: module.MyCoupons })));

// Dog Management (Named Exports)
export const DogParkList = lazy(() => import('../pages/DogParkList').then(module => ({ default: module.DogParkList })));
export const DogParkDetail = lazy(() => import('../pages/DogParkDetail').then(module => ({ default: module.DogParkDetail })));
export const DogParkRules = lazy(() => import('../pages/DogParkRules').then(module => ({ default: module.DogParkRules })));
export const DogParkHistory = lazy(() => import('../pages/DogParkHistory').then(module => ({ default: module.DogParkHistory })));
export const NewParkDetail = lazy(() => import('../pages/NewParkDetail').then(module => ({ default: module.NewParkDetail })));
export const ParkReservation = lazy(() => import('../pages/ParkReservation').then(module => ({ default: module.ParkReservation })));
export const ParkRegistration = lazy(() => import('../pages/ParkRegistration').then(module => ({ default: module.ParkRegistration })));
export const ParkRegistrationAgreement = lazy(() => import('../pages/ParkRegistrationAgreement').then(module => ({ default: module.ParkRegistrationAgreement })));
export const ParkRegistrationSecondStage = lazy(() => import('../pages/ParkRegistrationSecondStage').then(module => ({ default: module.ParkRegistrationSecondStage })));
export const ParkManagement = lazy(() => import('../pages/ParkManagement').then(module => ({ default: module.ParkManagement })));

// Shop & E-commerce (Named Exports)
export const PetShop = lazy(() => import('../pages/PetShop').then(module => ({ default: module.PetShop })));
export const ProductDetail = lazy(() => import('../pages/ProductDetail').then(module => ({ default: module.ProductDetail })));
export const Cart = lazy(() => import('../pages/Cart').then(module => ({ default: module.Cart })));
export const Checkout = lazy(() => import('../pages/Checkout').then(module => ({ default: module.Checkout })));
export const OrderHistory = lazy(() => import('../pages/OrderHistory').then(module => ({ default: module.OrderHistory })));

// Community & News (Named Exports)
export const Community = lazy(() => import('../pages/Community').then(module => ({ default: module.Community })));
export const News = lazy(() => import('../pages/News').then(module => ({ default: module.News })));
export const NewsDetail = lazy(() => import('../pages/NewsDetail').then(module => ({ default: module.NewsDetail })));

// Dog Information Pages (Default Exports)
export const DogInfo = lazy(() => import('../pages/DogInfo'));
export const DogInfoBreeds = lazy(() => import('../pages/DogInfoBreeds'));
export const DogInfoVaccine = lazy(() => import('../pages/DogInfoVaccine'));
export const DogInfoFoods = lazy(() => import('../pages/DogInfoFoods'));
export const DogInfoSnack = lazy(() => import('../pages/DogInfoSnack'));
export const DogInfoParasite = lazy(() => import('../pages/DogInfoParasite'));
export const DogInfoShow = lazy(() => import('../pages/DogInfoShow'));

// New Dog Information Detail Pages (Named Exports)
export const HealthManagement = lazy(() => import('../pages/dog-info/HealthManagement').then(module => ({ default: module.HealthManagement })));
export const Training = lazy(() => import('../pages/dog-info/Training').then(module => ({ default: module.Training })));
export const Walk = lazy(() => import('../pages/dog-info/Walk').then(module => ({ default: module.Walk })));
export const Food = lazy(() => import('../pages/dog-info/Food').then(module => ({ default: module.Food })));
export const Care = lazy(() => import('../pages/dog-info/Care').then(module => ({ default: module.Care })));
export const Breeds = lazy(() => import('../pages/dog-info/Breeds').then(module => ({ default: module.Breeds })));

// Payment System (Named Exports)
export const PaymentSetup = lazy(() => import('../pages/PaymentSetup').then(module => ({ default: module.PaymentSetup })));
export const PaymentConfirmation = lazy(() => import('../pages/PaymentConfirmation').then(module => ({ default: module.PaymentConfirmation })));
export const Subscription = lazy(() => import('../pages/Subscription').then(module => ({ default: module.Subscription })));

// Owner Features (Named Exports)
export const OwnerDashboard = lazy(() => import('../pages/OwnerDashboard').then(module => ({ default: module.OwnerDashboard })));
export const OwnerPaymentSystem = lazy(() => import('../pages/OwnerPaymentSystem').then(module => ({ default: module.OwnerPaymentSystem })));

// Admin Panel (Named Exports - Heavy Components)
export const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
export const AdminManagement = lazy(() => import('../pages/AdminManagement').then(module => ({ default: module.AdminManagement })));
export const AdminTasks = lazy(() => import('../pages/AdminTasks').then(module => ({ default: module.AdminTasks })));
export const AdminUserManagement = lazy(() => import('../pages/AdminUserManagement'));
export const AdminUserDetail = lazy(() => import('../pages/AdminUserDetail').then(module => ({ default: module.AdminUserDetail })));
export const AdminParkManagement = lazy(() => import('../pages/AdminParkManagement'));
export const AdminReservationManagement = lazy(() => import('../pages/AdminReservationManagement'));
export const AdminShopManagement = lazy(() => import('../pages/AdminShopManagement'));
export const AdminSalesManagement = lazy(() => import('../pages/AdminSalesManagement'));
export const AdminVaccineApproval = lazy(() => import('../pages/AdminVaccineApproval'));
export const AdminFacilityApproval = lazy(() => import('../pages/AdminFacilityApproval'));
export const AdminRevenueReport = lazy(() => import('../pages/AdminRevenueReport').then(module => ({ default: module.AdminRevenueReport })));
export const AdminNewsManagement = lazy(() => import('../pages/AdminNewsManagement'));

// Authentication & Security (Default Exports)
export const TwoFactorSetup = lazy(() => import('../pages/TwoFactorSetup'));
export const TwoFactorVerify = lazy(() => import('../pages/TwoFactorVerify'));
export const MagicLink = lazy(() => import('../pages/MagicLink').then(module => ({ default: module.MagicLink })));
export const AccessControl = lazy(() => import('../pages/AccessControl').then(module => ({ default: module.AccessControl })));

// Facility Management (Default Export)
export const FacilityRegistration = lazy(() => import('../pages/FacilityRegistration'));

// Legal & Info Pages (Named Exports)
export const TermsOfService = lazy(() => import('../pages/TermsOfService').then(module => ({ default: module.TermsOfService })));
export const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
export const Contact = lazy(() => import('../pages/Contact').then(module => ({ default: module.Contact })));
export const BusinessInformation = lazy(() => import('../pages/BusinessInformation').then(module => ({ default: module.BusinessInformation })));

// Development & Deployment (Named Exports)
export const Deploy = lazy(() => import('../pages/Deploy').then(module => ({ default: module.Deploy })));
export const DeploymentHistory = lazy(() => import('../pages/DeploymentHistory').then(module => ({ default: module.DeploymentHistory })));

// PWA Documentation (Default Exports)
export const PWASetupGuide = lazy(() => import('../pages/PWASetupGuide'));
export const PWADocumentation = lazy(() => import('../pages/PWADocumentation'));
export const PWALighthouseAudit = lazy(() => import('../pages/PWALighthouseAudit'));
export const PWADeploymentGuide = lazy(() => import('../pages/PWADeploymentGuide'));

// ===== PERFORMANCE OPTIMIZATION =====
/**
 * Smart preloading based on user behavior
 */
export const preloadStrategies = {
  // Core pages for immediate use
  core: () => {
    import('../pages/UserDashboard');
    import('../pages/PetShop');
  },

  // Admin pages for administrators  
  admin: () => {
    import('../pages/AdminDashboard');
    import('../pages/AdminManagement');
  },

  // User action-based preloading
  onUserLogin: () => {
    import('../pages/UserDashboard');
    import('../pages/DogManagement');
    import('../pages/ProfileSettings');
  },

  onParkInteraction: () => {
    import('../pages/DogParkList');
    import('../pages/ParkReservation');
    import('../pages/DogParkDetail');
    import('../pages/ParkManagement');
  },

  onShopInteraction: () => {
    import('../pages/Cart');
    import('../pages/Checkout');
    import('../pages/OrderHistory');
  }
};

// Legacy support for existing preload functions
export const preloadCorePages = preloadStrategies.core;
export const preloadAdminPages = preloadStrategies.admin;
export const preloadOnUserAction = {
  onLogin: preloadStrategies.onUserLogin,
  onParkView: preloadStrategies.onParkInteraction,
  onShopView: preloadStrategies.onShopInteraction
};

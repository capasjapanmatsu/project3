import { lazy } from 'react';

// ===== LAZY LOADING COMPONENTS =====
// Core pages - 即座に読み込み
export const Home = lazy(() => import('../pages/Home').then(module => ({ default: module.Home })));
export const Login = lazy(() => import('../pages/Login').then(module => ({ default: module.Login })));
export const Register = lazy(() => import('../pages/Register').then(module => ({ default: module.Register })));

// Dashboard pages - 認証後に読み込み
export const UserDashboard = lazy(() => import('../pages/UserDashboard').then(module => ({ default: module.UserDashboard })));
export const DogManagement = lazy(() => import('../pages/DogManagement').then(module => ({ default: module.DogManagement })));
export const DogRegistration = lazy(() => import('../pages/DogRegistration').then(module => ({ default: module.DogRegistration })));
export const ProfileSettings = lazy(() => import('../pages/ProfileSettings').then(module => ({ default: module.ProfileSettings })));

// Park related pages - 使用時に読み込み
export const DogParkList = lazy(() => import('../pages/DogParkList').then(module => ({ default: module.DogParkList })));
export const DogParkDetail = lazy(() => import('../pages/DogParkDetail').then(module => ({ default: module.DogParkDetail })));
export const ParkReservation = lazy(() => import('../pages/ParkReservation').then(module => ({ default: module.ParkReservation })));
export const ParkRegistration = lazy(() => import('../pages/ParkRegistration').then(module => ({ default: module.ParkRegistration })));
export const ParkManagement = lazy(() => import('../pages/ParkManagement').then(module => ({ default: module.ParkManagement })));

// Shop related pages - ショップ使用時に読み込み
export const PetShop = lazy(() => import('../pages/PetShop').then(module => ({ default: module.PetShop })));
export const ProductDetail = lazy(() => import('../pages/ProductDetail').then(module => ({ default: module.ProductDetail })));
export const Cart = lazy(() => import('../pages/Cart').then(module => ({ default: module.Cart })));
export const Checkout = lazy(() => import('../pages/Checkout').then(module => ({ default: module.Checkout })));
export const OrderHistory = lazy(() => import('../pages/OrderHistory').then(module => ({ default: module.OrderHistory })));

// Community pages - コミュニティ機能使用時に読み込み
export const Community = lazy(() => import('../pages/Community').then(module => ({ default: module.Community })));
export const News = lazy(() => import('../pages/News').then(module => ({ default: module.News })));
export const NewsDetail = lazy(() => import('../pages/NewsDetail').then(module => ({ default: module.NewsDetail })));
export const LikedDogs = lazy(() => import('../pages/LikedDogs').then(module => ({ default: module.LikedDogs })));

// Admin pages - 管理者機能（重い処理）
export const AdminDashboard = lazy(() => import('../pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
export const AdminManagement = lazy(() => import('../pages/AdminManagement').then(module => ({ default: module.AdminManagement })));
export const AdminTasks = lazy(() => import('../pages/AdminTasks').then(module => ({ default: module.AdminTasks })));
export const AdminUserManagement = lazy(() => import('../pages/AdminUserManagement').then(module => ({ default: module.AdminUserManagement })));
export const AdminParkManagement = lazy(() => import('../pages/AdminParkManagement').then(module => ({ default: module.AdminParkManagement })));
export const AdminReservationManagement = lazy(() => import('../pages/AdminReservationManagement').then(module => ({ default: module.AdminReservationManagement })));
export const AdminShopManagement = lazy(() => import('../pages/AdminShopManagement').then(module => ({ default: module.AdminShopManagement })));
export const AdminSalesManagement = lazy(() => import('../pages/AdminSalesManagement').then(module => ({ default: module.AdminSalesManagement })));
export const AdminVaccineApproval = lazy(() => import('../pages/AdminVaccineApproval'));
export const AdminFacilityApproval = lazy(() => import('../pages/AdminFacilityApproval'));
export const AdminRevenueReport = lazy(() => import('../pages/AdminRevenueReport').then(module => ({ default: module.AdminRevenueReport })));

// Owner pages - オーナー機能
export const OwnerDashboard = lazy(() => import('../pages/OwnerDashboard').then(module => ({ default: module.OwnerDashboard })));
export const OwnerPaymentSystem = lazy(() => import('../pages/OwnerPaymentSystem').then(module => ({ default: module.OwnerPaymentSystem })));

// Payment related pages - 決済機能使用時に読み込み
export const PaymentSetup = lazy(() => import('../pages/PaymentSetup').then(module => ({ default: module.PaymentSetup })));
export const PaymentMethodSettings = lazy(() => import('../pages/PaymentMethodSettings').then(module => ({ default: module.PaymentMethodSettings })));
export const PaymentConfirmation = lazy(() => import('../pages/PaymentConfirmation').then(module => ({ default: module.PaymentConfirmation })));
export const Subscription = lazy(() => import('../pages/Subscription').then(module => ({ default: module.Subscription })));

// Legal and info pages - 法的ページ（使用頻度低）
export const TermsOfService = lazy(() => import('../pages/TermsOfService').then(module => ({ default: module.TermsOfService })));
export const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
export const Contact = lazy(() => import('../pages/Contact').then(module => ({ default: module.Contact })));
export const BusinessInformation = lazy(() => import('../pages/BusinessInformation').then(module => ({ default: module.BusinessInformation })));

// Dog info pages - 犬情報ページ（default exportを使用）
export const DogInfo = lazy(() => import('../pages/DogInfo'));
export const DogInfoBreeds = lazy(() => import('../pages/DogInfoBreeds'));
export const DogInfoVaccine = lazy(() => import('../pages/DogInfoVaccine'));
export const DogInfoFoods = lazy(() => import('../pages/DogInfoFoods'));
export const DogInfoSnack = lazy(() => import('../pages/DogInfoSnack'));
export const DogInfoParasite = lazy(() => import('../pages/DogInfoParasite'));
export const DogInfoShow = lazy(() => import('../pages/DogInfoShow'));

// Other pages（named exportを使用）
export const DogProfile = lazy(() => import('../pages/DogProfile').then(module => ({ default: module.DogProfile })));
export const DogParkHistory = lazy(() => import('../pages/DogParkHistory').then(module => ({ default: module.DogParkHistory })));
export const DogParkRules = lazy(() => import('../pages/DogParkRules').then(module => ({ default: module.DogParkRules })));
export const ParkRegistrationAgreement = lazy(() => import('../pages/ParkRegistrationAgreement').then(module => ({ default: module.ParkRegistrationAgreement })));
export const ParkRegistrationSecondStage = lazy(() => import('../pages/ParkRegistrationSecondStage').then(module => ({ default: module.ParkRegistrationSecondStage })));
export const FacilityRegistration = lazy(() => import('../pages/FacilityRegistration').then(module => ({ default: module.FacilityRegistration })));
export const NewParkDetail = lazy(() => import('../pages/NewParkDetail').then(module => ({ default: module.NewParkDetail })));
export const BluePrint = lazy(() => import('../pages/BluePrint').then(module => ({ default: module.BluePrint })));
export const AccessControl = lazy(() => import('../pages/AccessControl').then(module => ({ default: module.AccessControl })));
export const TwoFactorSetup = lazy(() => import('../pages/TwoFactorSetup'));
export const TwoFactorVerify = lazy(() => import('../pages/TwoFactorVerify'));
export const MagicLink = lazy(() => import('../pages/MagicLink').then(module => ({ default: module.MagicLink })));

// ===== PRELOAD FUNCTIONS =====
// 重要なページを事前読み込みする関数
export const preloadCriticalPages = () => {
  // ユーザーがログインしている可能性が高いページ
  import('../pages/UserDashboard');
  import('../pages/DogParkList');
};

export const preloadAdminPages = () => {
  // 管理者ページの事前読み込み
  import('../pages/AdminDashboard');
  import('../pages/AdminManagement');
};

export const preloadShopPages = () => {
  // ショップページの事前読み込み
  import('../pages/PetShop');
  import('../pages/Cart');
};

// ページグループ別の事前読み込み
export const preloadPageGroup = (group: 'user' | 'admin' | 'shop' | 'park' | 'community') => {
  switch (group) {
    case 'user':
      import('../pages/UserDashboard');
      import('../pages/DogManagement');
      import('../pages/ProfileSettings');
      break;
    case 'admin':
      preloadAdminPages();
      break;
    case 'shop':
      preloadShopPages();
      break;
    case 'park':
      import('../pages/DogParkList');
      import('../pages/DogParkDetail');
      import('../pages/ParkReservation');
      break;
    case 'community':
      import('../pages/Community');
      import('../pages/News');
      break;
  }
};

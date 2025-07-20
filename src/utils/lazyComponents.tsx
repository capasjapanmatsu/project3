// 最適化されたLazy Componentsファイル
// 使用頻度とページサイズに基づいて最適化された遅延読み込み
import { lazy } from 'react';

// ============================================
// 💡 Core Pages (高頻度アクセス) - プリロード対象
// ============================================
export const Home = lazy(() => import('../pages/Home'));
export const Login = lazy(() => import('../pages/Login'));
export const Register = lazy(() => import('../pages/Register'));
export const DogParkList = lazy(() => import('../pages/DogParkList'));

// ============================================
// 🎯 User Dashboard Pages (中頻度) - 通常読み込み
// ============================================
export const UserDashboard = lazy(() => import('../pages/UserDashboard'));
export const ProfileSettings = lazy(() => import('../pages/ProfileSettings'));
export const DogProfile = lazy(() => import('../pages/DogProfile'));
export const DogManagement = lazy(() => import('../pages/DogManagement'));

// ============================================
// 🏞️ Park Related Pages - チャンク分割
// ============================================
export const DogParkDetail = lazy(() => 
  import('../pages/DogParkDetail').then(module => ({
    default: module.default
  }))
);
export const ParkReservation = lazy(() => import('../pages/ParkReservation'));
export const DogParkHistory = lazy(() => import('../pages/DogParkHistory'));
export const DogParkRules = lazy(() => import('../pages/DogParkRules'));

// ============================================
// 🏪 E-commerce Pages - 独立チャンク
// ============================================
export const PetShop = lazy(() => import('../pages/PetShop'));
export const Cart = lazy(() => import('../pages/Cart'));
export const Checkout = lazy(() => import('../pages/Checkout'));
export const ProductDetail = lazy(() => import('../pages/ProductDetail'));
export const OrderHistory = lazy(() => import('../pages/OrderHistory'));

// ============================================
// 💳 Payment Pages - セキュリティ重視チャンク
// ============================================
export const PaymentSetup = lazy(() => import('../pages/PaymentSetup'));
export const PaymentMethodSettings = lazy(() => import('../pages/PaymentMethodSettings'));
export const PaymentConfirmation = lazy(() => import('../pages/PaymentConfirmation'));
export const Subscription = lazy(() => import('../pages/Subscription'));

// ============================================
// 👨‍💼 Admin Pages - 大きなチャンクに分割
// ============================================
export const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
export const AdminManagement = lazy(() => import('../pages/AdminManagement'));
export const AdminTasks = lazy(() => import('../pages/AdminTasks'));
export const AdminUserManagement = lazy(() => import('../pages/AdminUserManagement'));
export const AdminRevenueReport = lazy(() => import('../pages/AdminRevenueReport'));

// Admin - Park Management Chunk
export const AdminParkManagement = lazy(() => import('../pages/AdminParkManagement'));
export const AdminReservationManagement = lazy(() => import('../pages/AdminReservationManagement'));

// Admin - Shop Management Chunk  
export const AdminShopManagement = lazy(() => import('../pages/AdminShopManagement'));
export const AdminSalesManagement = lazy(() => import('../pages/AdminSalesManagement'));

// Admin - Content Management Chunk
export const AdminNewsManagement = lazy(() => import('../pages/AdminNewsManagement'));
export const AdminFacilityApproval = lazy(() => import('../pages/AdminFacilityApproval'));
export const AdminVaccineApproval = lazy(() => import('../pages/AdminVaccineApproval'));

// ============================================
// 🏢 Business Pages - 事業者向けチャンク
// ============================================
export const OwnerDashboard = lazy(() => import('../pages/OwnerDashboard'));
export const ParkManagement = lazy(() => import('../pages/ParkManagement'));
export const ParkRegistration = lazy(() => import('../pages/ParkRegistration'));
export const BusinessInformation = lazy(() => import('../pages/BusinessInformation'));
export const OwnerPaymentSystem = lazy(() => import('../pages/OwnerPaymentSystem'));

// ============================================
// 📱 PWA & Documentation Pages - 低頻度アクセス
// ============================================
export const PWASetupGuide = lazy(() => import('../pages/PWASetupGuide'));
export const PWADocumentation = lazy(() => import('../pages/PWADocumentation'));
export const PWAImplementationGuide = lazy(() => import('../pages/PWAImplementationGuide'));
export const PWADeploymentGuide = lazy(() => import('../pages/PWADeploymentGuide'));
export const PWALighthouseAudit = lazy(() => import('../pages/PWALighthouseAudit'));
export const PWATestingSuite = lazy(() => import('../pages/PWATestingSuite'));

// ============================================
// 📄 Info & Legal Pages - 軽量チャンク
// ============================================
export const Contact = lazy(() => import('../pages/Contact'));
export const News = lazy(() => import('../pages/News'));
export const NewsDetail = lazy(() => import('../pages/NewsDetail'));
export const Community = lazy(() => import('../pages/Community'));
export const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy'));
export const TermsOfService = lazy(() => import('../pages/TermsOfService'));

// ============================================
// 🔐 Auth & Security Pages
// ============================================
export const TwoFactorSetup = lazy(() => import('../pages/TwoFactorSetup'));
export const TwoFactorVerify = lazy(() => import('../pages/TwoFactorVerify'));
export const AccessControl = lazy(() => import('../pages/AccessControl'));

// ============================================
// 🐕 Dog Info Pages - 教育コンテンツチャンク
// ============================================
export const DogInfo = lazy(() => import('../pages/DogInfo'));
export const DogInfoBreeds = lazy(() => import('../pages/DogInfoBreeds'));
export const DogInfoVaccine = lazy(() => import('../pages/DogInfoVaccine'));
export const DogInfoFoods = lazy(() => import('../pages/DogInfoFoods'));
export const DogInfoSnack = lazy(() => import('../pages/DogInfoSnack'));
export const DogInfoParasite = lazy(() => import('../pages/DogInfoParasite'));
export const DogInfoShow = lazy(() => import('../pages/DogInfoShow'));

// ============================================
// 🔧 Utility & Development Pages
// ============================================
export const Deploy = lazy(() => import('../pages/Deploy'));
export const DeploymentHistory = lazy(() => import('../pages/DeploymentHistory'));
export const BluePrint = lazy(() => import('../pages/BluePrint'));

// ============================================
// 🎯 プリロード対象コンポーネント定義
// ============================================
export const PRELOAD_COMPONENTS = [
  () => import('../pages/Home'),
  () => import('../pages/Login'),
  () => import('../pages/DogParkList'),
] as const;

// ============================================
// 📊 チャンク分析用メタデータ
// ============================================
export const CHUNK_METADATA = {
  core: ['Home', 'Login', 'Register', 'DogParkList'],
  user: ['UserDashboard', 'ProfileSettings', 'DogProfile', 'DogManagement'],
  park: ['DogParkDetail', 'ParkReservation', 'DogParkHistory', 'DogParkRules'],
  commerce: ['PetShop', 'Cart', 'Checkout', 'ProductDetail', 'OrderHistory'],
  payment: ['PaymentSetup', 'PaymentMethodSettings', 'PaymentConfirmation', 'Subscription'],
  admin: ['AdminDashboard', 'AdminManagement', 'AdminTasks'],
  owner: ['OwnerDashboard', 'ParkManagement', 'BusinessInformation'],
  pwa: ['PWASetupGuide', 'PWADocumentation'],
  info: ['Contact', 'News', 'Community', 'PrivacyPolicy'],
  auth: ['TwoFactorSetup', 'TwoFactorVerify', 'AccessControl'],
  dogInfo: ['DogInfo', 'DogInfoBreeds', 'DogInfoVaccine'],
  dev: ['Deploy', 'BluePrint'],
} as const;

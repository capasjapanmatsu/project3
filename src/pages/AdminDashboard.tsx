import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  MapPin, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  BarChart4, 
  TrendingUp,
  Download,
  DollarSign,
  Calendar,
  ShoppingBag,
  Settings
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { NewsManagement } from '../components/admin/NewsManagement';
import AdminMaintenanceManagement from '../components/admin/AdminMaintenanceManagement';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';

interface AdminStats {
  totalUsers: number;
  totalParks: number;
  pendingParks: number;
  pendingVaccines: number;
  totalReservations: number;
  monthlyRevenue: number;
  lastMonthRevenue: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  newUsersThisMonth: number;
  unreadMessages: number;
}

interface AdminStatsResponse {
  total_users: number;
  total_parks: number;
  pending_parks: number;
  pending_vaccines: number;
  total_reservations: number;
  monthly_revenue: number;
  last_month_revenue: number;
  total_subscriptions: number;
  active_subscriptions: number;
  new_users_this_month: number;
  unread_messages: number;
}

export function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'parks' | 'vaccines' | 'users' | 'maintenance'>('overview');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalParks: 0,
    pendingParks: 0,
    pendingVaccines: 0,
    totalReservations: 0,
    monthlyRevenue: 0,
    lastMonthRevenue: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    newUsersThisMonth: 0,
    unreadMessages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [processingError, setProcessingError] = useState('');
  const [processingSuccess, setProcessingSuccess] = useState('');

  useEffect(() => {
    // 管理者権限チェック
    if (!isAdmin) {
      navigate('/');
      return;
    }
    
    void fetchAdminData();
  }, [isAdmin, navigate]);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      setProcessingError('');
      setProcessingSuccess('');
      
      // 管理者統計情報を取得
      const { data: statsData, error: statsError } = await supabase.rpc('get_admin_stats');
      
      if (statsError) throw statsError;
      
      const typedStatsData = statsData as AdminStatsResponse | null;
      
      setStats({
        totalUsers: typedStatsData?.total_users || 0,
        totalParks: typedStatsData?.total_parks || 0,
        pendingParks: typedStatsData?.pending_parks || 0,
        pendingVaccines: typedStatsData?.pending_vaccines || 0,
        totalReservations: typedStatsData?.total_reservations || 0,
        monthlyRevenue: typedStatsData?.monthly_revenue || 0,
        lastMonthRevenue: typedStatsData?.last_month_revenue || 0,
        totalSubscriptions: typedStatsData?.total_subscriptions || 0,
        activeSubscriptions: typedStatsData?.active_subscriptions || 0,
        newUsersThisMonth: typedStatsData?.new_users_this_month || 0,
        unreadMessages: typedStatsData?.unread_messages || 0
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setProcessingError('統計データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Shield className="w-8 h-8 text-red-600 mr-3" />
            管理者ダッシュボード
          </h1>
          <p className="text-gray-600">システム全体の管理と監視</p>
        </div>
        <div className="text-sm text-gray-500">
          最終更新: {new Date().toLocaleString('ja-JP')}
        </div>
      </div>

      {/* 処理結果メッセージ */}
      {processingError && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{processingError}</p>
        </div>
      )}
      
      {processingSuccess && (
        <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{processingSuccess}</p>
        </div>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/admin/users">
          <Card className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
                <p className="text-xs text-green-600">+{stats.newUsersThisMonth} 今月</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
        </Link>

        <Link to="/admin/parks">
          <Card className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総ドッグラン数</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalParks}</p>
                {stats.pendingParks > 0 && (
                  <p className="text-xs text-orange-600">承認待ち: {stats.pendingParks}</p>
                )}
              </div>
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
          </Card>
        </Link>

        <Link to="/admin/reservations">
          <Card className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">今月の予約数</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalReservations}</p>
                <p className="text-xs text-purple-600">サブスク会員: {stats.activeSubscriptions}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
        </Link>

        <Link to="/admin/sales">
          <Card className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">今月の売上</p>
                <p className="text-2xl font-bold text-orange-600">¥{stats.monthlyRevenue.toLocaleString()}</p>
                {stats.lastMonthRevenue > 0 && (
                  <p className="text-xs text-gray-500">
                    前月比: {Math.round((stats.monthlyRevenue / stats.lastMonthRevenue - 1) * 100)}%
                  </p>
                )}
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
        </Link>
      </div>

      {/* 緊急対応が必要な項目 */}
      {(stats.pendingParks > 0 || stats.pendingVaccines > 0) && (
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">緊急対応が必要</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.pendingParks > 0 && (
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <p className="font-medium text-red-900">ドッグラン承認待ち</p>
                <p className="text-2xl font-bold text-red-600">{stats.pendingParks}件</p>
                <Link to="/admin/management">
                  <Button size="sm" className="mt-2">
                    確認する
                  </Button>
                </Link>
              </div>
            )}
            {stats.pendingVaccines > 0 && (
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <p className="font-medium text-red-900">ワクチン証明書承認待ち</p>
                <p className="text-2xl font-bold text-red-600">{stats.pendingVaccines}件</p>
                <Link to="/admin/management">
                  <Button size="sm" className="mt-2">
                    確認する
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 管理メニュー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/admin/management">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <FileCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">ワクチン証明書・ドッグラン管理</h3>
                <p className="text-sm text-gray-600">
                  ワクチン証明書の承認・ドッグランの審査管理
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/admin/shop">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-full">
                <ShoppingBag className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">ショップ管理</h3>
                <p className="text-sm text-gray-600">
                  商品管理・注文管理・在庫管理
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/admin/revenue">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">売上レポート</h3>
                <p className="text-sm text-gray-600">
                  ドッグラン別売上・振込管理
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* タブナビゲーション */}
      <div className="flex space-x-4 border-b">
        <button
          className={`px-4 py-2 font-medium relative flex items-center space-x-2 ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart4 className="w-4 h-4" />
          <span>概要</span>
        </button>
        <button
          className={`px-4 py-2 font-medium relative flex items-center space-x-2 ${
            activeTab === 'parks'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('parks')}
        >
          <MapPin className="w-4 h-4" />
          <span>ドッグラン管理</span>
          {stats.pendingParks > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {stats.pendingParks}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 font-medium relative flex items-center space-x-2 ${
            activeTab === 'vaccines'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('vaccines')}
        >
          <FileCheck className="w-4 h-4" />
          <span>ワクチン承認</span>
          {stats.pendingVaccines > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {stats.pendingVaccines}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 font-medium relative flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="w-4 h-4" />
          <span>ユーザー管理</span>
        </button>
        <button
          className={`px-4 py-2 font-medium relative flex items-center space-x-2 ${
            activeTab === 'maintenance'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('maintenance')}
        >
          <Settings className="w-4 h-4" />
          <span>メンテナンス</span>
        </button>
      </div>

      {/* 概要タブ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">システム概要</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">プラットフォーム統計</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>アクティブユーザー:</span>
                    <span className="font-medium">{stats.totalUsers}人</span>
                  </div>
                  <div className="flex justify-between">
                    <span>承認済みドッグラン:</span>
                    <span className="font-medium">{stats.totalParks - stats.pendingParks}施設</span>
                  </div>
                  <div className="flex justify-between">
                    <span>今月の予約:</span>
                    <span className="font-medium">{stats.totalReservations}件</span>
                  </div>
                  <div className="flex justify-between">
                    <span>今月の売上:</span>
                    <span className="font-medium">¥{stats.monthlyRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>アクティブサブスク:</span>
                    <span className="font-medium">{stats.activeSubscriptions}件</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">承認待ち項目</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>ドッグラン:</span>
                    <span className={`font-medium ${stats.pendingParks > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.pendingParks}件
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ワクチン証明書:</span>
                    <span className={`font-medium ${stats.pendingVaccines > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.pendingVaccines}件
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 売上グラフ（プレースホルダー） */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">売上推移</h3>
              <div className="flex space-x-2">
                <Link to="/admin/revenue">
                  <Button size="sm" variant="secondary">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    詳細レポート
                  </Button>
                </Link>
                <Button size="sm" variant="secondary">
                  <Download className="w-4 h-4 mr-1" />
                  CSV
                </Button>
              </div>
            </div>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">売上グラフ（実装予定）</p>
            </div>
          </Card>

          {/* 新着情報管理 */}
          <NewsManagement />
        </div>
      )}

      {/* 他のタブ */}
      {activeTab === 'parks' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">ドッグラン管理</h3>
          <p className="text-gray-600">
            詳細なドッグラン管理は 
            <Link to="/admin/management" className="text-blue-600 hover:text-blue-800 mx-1">
              管理ページ
            </Link>
            で行えます。
          </p>
            </Card>
      )}

      {activeTab === 'vaccines' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">ワクチン証明書管理</h3>
          <p className="text-gray-600">
            詳細なワクチン証明書管理は 
            <Link to="/admin/management" className="text-blue-600 hover:text-blue-800 mx-1">
              管理ページ
            </Link>
            で行えます。
          </p>
            </Card>
      )}

      {activeTab === 'users' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">ユーザー管理</h3>
          <p className="text-gray-600">
            詳細なユーザー管理は 
            <Link to="/admin/management" className="text-blue-600 hover:text-blue-800 mx-1">
              管理ページ
            </Link>
            で行えます。
          </p>
        </Card>
      )}

      {activeTab === 'maintenance' && (
        <AdminMaintenanceManagement
          onError={setProcessingError}
          onSuccess={setProcessingSuccess}
        />
      )}
    </div>
  );
}
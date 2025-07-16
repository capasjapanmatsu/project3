import {
    AlertTriangle,
    Badge,
    BarChart4,
    Bell,
    Building,
    Calendar,
    CheckCircle,
    DollarSign,
    Download,
    MapPin,
    Settings,
    Shield,
    ShoppingBag,
    TrendingUp,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import AdminMaintenanceManagement from '../components/admin/AdminMaintenanceManagement';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface AdminStats {
  totalUsers: number;
  totalParks: number;
  pendingParks: number;
  pendingVaccines: number;
  pendingFacilities: number;
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
  pending_facilities: number;
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
    pendingFacilities: 0,
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
      
      // ペット関連施設の申請待ち数を取得
      const { data: pendingFacilitiesData, error: pendingFacilitiesError } = await supabase
        .from('pet_facilities')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');
      
      const pendingFacilitiesCount = pendingFacilitiesData?.length || 0;
      
      setStats({
        totalUsers: typedStatsData?.total_users || 0,
        totalParks: typedStatsData?.total_parks || 0,
        pendingParks: typedStatsData?.pending_parks || 0,
        pendingVaccines: typedStatsData?.pending_vaccines || 0,
        pendingFacilities: pendingFacilitiesCount,
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
      {(stats.pendingParks > 0 || stats.pendingVaccines > 0 || stats.pendingFacilities > 0) && (
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">緊急対応が必要</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.pendingParks > 0 && (
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <p className="font-medium text-red-900">ドッグラン承認待ち</p>
                <p className="text-2xl font-bold text-red-600">{stats.pendingParks}件</p>
                <Link to="/admin/parks">
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
                <Link to="/admin/vaccine-approval">
                  <Button size="sm" className="mt-2">
                    確認する
                  </Button>
                </Link>
              </div>
            )}
            {stats.pendingFacilities > 0 && (
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <p className="font-medium text-red-900">ペット関連施設承認待ち</p>
                <p className="text-2xl font-bold text-red-600">{stats.pendingFacilities}件</p>
                <Link to="/admin/facility-approval">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/admin/vaccine-approval">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <Badge className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">ワクチン証明書管理</h3>
                <p className="text-sm text-gray-600">
                  ワクチン証明書の承認・管理
                </p>
                {stats.pendingVaccines > 0 && (
                  <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                    {stats.pendingVaccines}件の承認待ち
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/admin/parks">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-full">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">ドッグラン管理</h3>
                <p className="text-sm text-gray-600">
                  ドッグランの審査・管理
                </p>
                {stats.pendingParks > 0 && (
                  <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                    {stats.pendingParks}件の承認待ち
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/admin/facility-approval">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-100 p-3 rounded-full">
                <Building className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">ペット関連施設承認</h3>
                <p className="text-sm text-gray-600">
                  ペット関連施設の掲載申請承認・管理
                </p>
                {stats.pendingFacilities > 0 && (
                  <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                    {stats.pendingFacilities}件の承認待ち
                  </div>
                )}
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

        <Link to="/admin/news">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-100 p-3 rounded-full">
                <Bell className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold">新着情報管理</h3>
                <p className="text-sm text-gray-600">
                  サイトの新着情報・お知らせを管理
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <div onClick={() => setActiveTab('maintenance')}>
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-3 rounded-full">
                <Settings className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold">メンテナンス管理</h3>
                <p className="text-sm text-gray-600">
                  システムメンテナンス・IP管理
                </p>
              </div>
            </div>
          </Card>
        </div>
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
          <Badge className="w-4 h-4" />
          <span>ワクチン承認</span>
          {stats.pendingVaccines > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {stats.pendingVaccines}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 font-medium relative flex items-center space-x-2 ${
            activeTab === 'facilities'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('facilities')}
        >
          <Building className="w-4 h-4" />
          <span>施設承認</span>
          {stats.pendingFacilities > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {stats.pendingFacilities}
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
                  <div className="flex justify-between">
                    <span>ペット関連施設:</span>
                    <span className={`font-medium ${stats.pendingFacilities > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.pendingFacilities}件
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
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">新着情報管理</h3>
            <p className="text-gray-600">
              サイトの新着情報・お知らせを管理するには 
              <Link to="/admin/news" className="text-blue-600 hover:text-blue-800 mx-1">
                こちら
              </Link>
              からアクセスしてください。
            </p>
          </Card>
        </div>
      )}

      {/* 他のタブ */}
      {activeTab === 'parks' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">ドッグラン管理</h3>
          <p className="text-gray-600">
            詳細なドッグラン管理は 
            <Link to="/admin/parks" className="text-blue-600 hover:text-blue-800 mx-1">
              ドッグラン管理ページ
            </Link>
            で行えます。
          </p>
          {stats.pendingParks > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                <strong>{stats.pendingParks}件</strong>のドッグラン承認待ちがあります。
              </p>
              <Link to="/admin/parks">
                <Button size="sm" className="mt-2">
                  今すぐ確認する
                </Button>
              </Link>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'vaccines' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">ワクチン証明書管理</h3>
          <p className="text-gray-600">
            詳細なワクチン証明書管理は 
            <Link to="/admin/vaccine-approval" className="text-blue-600 hover:text-blue-800 mx-1">
              ワクチン証明書管理ページ
            </Link>
            で行えます。
          </p>
          {stats.pendingVaccines > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                <strong>{stats.pendingVaccines}件</strong>のワクチン証明書承認待ちがあります。
              </p>
              <Link to="/admin/vaccine-approval">
                <Button size="sm" className="mt-2">
                  今すぐ確認する
                </Button>
              </Link>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'facilities' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">ペット関連施設承認管理</h3>
          <p className="text-gray-600">
            詳細なペット関連施設の承認管理は 
            <Link to="/admin/facility-approval" className="text-blue-600 hover:text-blue-800 mx-1">
              施設承認ページ
            </Link>
            で行えます。
          </p>
          {stats.pendingFacilities > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                <strong>{stats.pendingFacilities}件</strong>の施設承認待ちがあります。
              </p>
              <Link to="/admin/facility-approval">
                <Button size="sm" className="mt-2">
                  今すぐ確認する
                </Button>
              </Link>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'users' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">ユーザー管理</h3>
          <p className="text-gray-600">
            詳細なユーザー管理は 
            <Link to="/admin/users" className="text-blue-600 hover:text-blue-800 mx-1">
              ユーザー管理ページ
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
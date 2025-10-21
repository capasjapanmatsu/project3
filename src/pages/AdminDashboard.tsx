import {
    AlertTriangle,
    Badge,
    BarChart4,
    Building,
    CheckCircle,
    DollarSign,
    Eye,
    FileText,
    Mail,
    Monitor,
    Settings,
    Shield,
    ShieldAlert,
    ShoppingBag,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import AdminMaintenanceManagementComponent from '../components/admin/AdminMaintenanceManagement';
import useAuth from '../context/AuthContext';
import { FraudDetectionResult, getFraudDetectionStats, getHighRiskUsers } from '../utils/adminFraudDetection';
import { supabase } from '../utils/supabase';
import AdminFacilityApproval from './AdminFacilityApproval';
import { AdminParkManagement } from './AdminParkManagement';
import AdminVaccineApproval from './AdminVaccineApproval';

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

interface FraudStats {
  totalHighRiskUsers: number;
  totalMediumRiskUsers: number;
  recentDetections: number;
  blockedAttempts: number;
  trialAbuseCount: number;
}

export function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'parks' | 'facilities' | 'users' | 'maintenance' | 'fraud' | 'sponsors' | 'vaccine-approval' | 'inquiries'>('overview');
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
  // 映えスポット通報
  const [spotReports, setSpotReports] = useState<Array<{ id: string; spot_id: string; reason: string; status: string; admin_note: string | null; created_at: string; spot?: { title?: string|null; address?: string|null; is_hidden?: boolean|null } }>>([]);
  const [loadingSpotReports, setLoadingSpotReports] = useState(false);
  const [showClosedReports, setShowClosedReports] = useState(false);

  // 不正検知関連のstate
  const [fraudStats, setFraudStats] = useState<FraudStats | null>(null);
  const [highRiskUsers, setHighRiskUsers] = useState<FraudDetectionResult[]>([]);

  useEffect(() => {
    // 管理者権限チェック
    if (!isAdmin) {
      navigate('/');
      return;
    }

    void fetchAdminData();
    void fetchEmergencyData();
    void fetchFraudStats();
    void fetchSpotReports();
  }, [isAdmin, navigate]);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      setProcessingError('');
      setProcessingSuccess('');

      // 直接vaccine_certificationsテーブルから承認待ち件数を取得
      const { count: vaccineCount, error: vaccineError } = await supabase
        .from('vaccine_certifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      console.log('🔍 ワクチン承認待ち件数（直接取得）:', vaccineCount, 'エラー:', vaccineError);

      // 管理者統計情報を取得
      const { data: statsData, error: statsError } = await supabase.rpc('get_admin_stats');

      if (statsError) throw statsError;

      const typedStatsData = statsData as AdminStatsResponse | null;

      console.log('📊 管理者統計データ:', typedStatsData);

      if (typedStatsData) {
        // 直接取得したワクチン件数を優先的に使用
        const actualPendingVaccines = vaccineCount !== null ? vaccineCount : (typedStatsData.pending_vaccines || 0);
        
        setStats({
          totalUsers: typedStatsData.total_users || 0,
          totalParks: typedStatsData.total_parks || 0,
          pendingParks: typedStatsData.pending_parks || 0,
          pendingVaccines: actualPendingVaccines,
          pendingFacilities: typedStatsData.pending_facilities || 0,
          totalReservations: typedStatsData.total_reservations || 0,
          monthlyRevenue: typedStatsData.monthly_revenue || 0,
          lastMonthRevenue: typedStatsData.last_month_revenue || 0,
          totalSubscriptions: typedStatsData.total_subscriptions || 0,
          activeSubscriptions: typedStatsData.active_subscriptions || 0,
          newUsersThisMonth: typedStatsData.new_users_this_month || 0,
          unreadMessages: typedStatsData.unread_messages || 0
        });
        
        console.log('🔢 申請中件数 - ドッグラン:', typedStatsData.pending_parks, 'その他施設:', typedStatsData.pending_facilities, 'ワクチン(RPC):', typedStatsData.pending_vaccines, 'ワクチン(直接):', actualPendingVaccines);
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      setProcessingError('管理者データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmergencyData = async () => {
    try {
      // 不正検知テーブルの存在確認
      const { data: tablesCheck, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'fraud_detection_logs');

      if (tablesError || !tablesCheck || tablesCheck.length === 0) {
        console.warn('Fraud detection tables not found. Skipping fraud detection features.');
        setHighRiskUsers([]);
        return;
      }

      const [highRiskUsers] = await Promise.all([
        getHighRiskUsers()
      ]);

      setHighRiskUsers(highRiskUsers);
    } catch (error) {
      console.error('Error fetching emergency data:', error);
      setHighRiskUsers([]);
    }
  };

  const fetchFraudStats = async () => {
    try {
      // 不正検知テーブルの存在確認
      const { data: tablesCheck, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'fraud_detection_logs');

      if (tablesError || !tablesCheck || tablesCheck.length === 0) {
        console.warn('Fraud detection tables not found. Skipping fraud statistics.');
        setFraudStats(null);
        return;
      }

      const stats = await getFraudDetectionStats();
      setFraudStats(stats);
    } catch (error) {
      console.error('Error fetching fraud stats:', error);
      setFraudStats(null);
    }
  };

  const fetchSpotReports = async () => {
    try {
      setLoadingSpotReports(true);
      // 1) 通報一覧
      const { data: reports, error: rErr } = await supabase
        .from('spot_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (rErr) throw rErr;
      const list = reports || [];
      // 2) 関連スポット
      const ids = Array.from(new Set(list.map((r: any) => r.spot_id).filter(Boolean)));
      let spotMap: Record<string, { title?: string; address?: string; is_hidden?: boolean }> = {};
      if (ids.length > 0) {
        const { data: spotsData } = await supabase
          .from('spots')
          .select('id,title,address,is_hidden')
          .in('id', ids);
        (spotsData || []).forEach((s: any) => { spotMap[s.id] = { title: s.title, address: s.address, is_hidden: s.is_hidden }; });
      }
      setSpotReports(list.map((r: any) => ({ ...r, spot: spotMap[r.spot_id] })));
    } catch (e) {
      console.error('Failed to fetch spot reports', e);
    } finally {
      setLoadingSpotReports(false);
    }
  };

  const closeReport = async (id: string) => {
    try {
      const { error } = await supabase.from('spot_reports').update({ status: 'closed' }).eq('id', id);
      if (error) throw error;
      await fetchSpotReports();
    } catch (e) {
      console.error('closeReport error', e);
    }
  };

  const saveAdminNote = async (id: string, note: string) => {
    try {
      const { error } = await supabase.from('spot_reports').update({ admin_note: note }).eq('id', id);
      if (error) throw error;
      await fetchSpotReports();
    } catch (e) {
      console.error('saveAdminNote error', e);
    }
  };

  const toggleSpotHidden = async (spotId: string, hide: boolean) => {
    try {
      const { error } = await supabase.from('spots').update({ is_hidden: hide }).eq('id', spotId);
      if (error) throw error;
      await fetchSpotReports();
    } catch (e) {
      console.error('toggleSpotHidden error', e);
    }
  };

  const calculateRevenueGrowth = () => {
    if (stats.lastMonthRevenue === 0) return 0;
    return ((stats.monthlyRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセス拒否</h1>
          <p className="text-gray-600">管理者権限が必要です。</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Settings className="w-8 h-8 text-blue-600 mr-3" />
                管理者ダッシュボード
              </h1>
              <p className="text-gray-600">システム全体の監視と管理</p>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                管理者: {user?.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* エラー・成功メッセージ */}
        {processingError && (
          <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 mb-6">
            <AlertTriangle className="w-5 h-5 inline mr-2" />
            {processingError}
          </div>
        )}

        {processingSuccess && (
          <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 mb-6">
            <CheckCircle className="w-5 h-5 inline mr-2" />
            {processingSuccess}
          </div>
        )}

        {/* 緊急対応が必要な項目 */}
        {(stats.pendingParks > 0 || stats.pendingVaccines > 0 || stats.pendingFacilities > 0 || (fraudStats?.totalHighRiskUsers || 0) > 0) && (
          <Card className="p-6 mb-6 border-red-200 bg-red-50">
            <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
              緊急対応が必要な項目
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {stats.pendingParks > 0 && (
                <Link to="/admin/parks" className="block">
                  <div className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">承認待ちドッグラン</p>
                        <p className="text-2xl font-bold text-red-600">{stats.pendingParks}</p>
                      </div>
                      <Building className="w-8 h-8 text-red-500" />
                    </div>
                  </div>
                </Link>
              )}

              {stats.pendingVaccines > 0 && (
                <Link to="/admin/vaccine-approval" className="block">
                  <div className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">ワクチン証明書承認待ち</p>
                        <p className="text-2xl font-bold text-red-600">{stats.pendingVaccines}</p>
                      </div>
                      <Shield className="w-8 h-8 text-red-500" />
                    </div>
                  </div>
                </Link>
              )}

              {/* 施設承認管理 - 常時表示 */}
              <Link to="/admin/facility-approval" className="block">
                <div className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">施設承認管理</p>
                      <p className={`text-2xl font-bold ${stats.pendingFacilities > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {stats.pendingFacilities > 0 ? stats.pendingFacilities : '0'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {stats.pendingFacilities > 0 ? '件の承認待ち' : '承認待ちなし'}
                      </p>
                    </div>
                    <Building className={`w-8 h-8 ${stats.pendingFacilities > 0 ? 'text-red-500' : 'text-green-500'}`} />
                  </div>
                </div>
              </Link>

              {(fraudStats?.totalHighRiskUsers || 0) > 0 && (
                <Link to="/admin/users?filter=high_risk" className="block">
                  <div className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">高リスクユーザー</p>
                        <p className="text-2xl font-bold text-red-600">{fraudStats?.totalHighRiskUsers || 0}</p>
                      </div>
                      <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                  </div>
                </Link>
              )}

              {/* 新着メッセージ */}
              <Link to="/admin/inquiries" className="block">
                <div className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">新着メッセージ</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.unreadMessages || 0}</p>
                    </div>
                    <Mail className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
              </Link>
            </div>

            {/* 高リスクユーザーの詳細 */}
            {highRiskUsers.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-red-900 mb-3">最新の高リスクユーザー</h3>
                <div className="bg-white rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ユーザー</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">リスクスコア</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">検知タイプ</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">最終検知</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {highRiskUsers.map((user) => (
                        <tr key={user.userId} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                              user.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                              user.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {user.riskScore}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-sm text-gray-900">
                              {user.detectionTypes.join(', ')}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-sm text-gray-900">
                              {new Date(user.lastDetection).toLocaleDateString('ja-JP')}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <Link to={`/admin/users?filter=high_risk`}>
                              <Button variant="secondary" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                詳細
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* タブナビゲーション - 2段表示 */}
        <div className="space-y-2 mb-6">
          {/* 1段目 */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'overview', label: '概要', icon: BarChart4 },
              { id: 'pages', label: 'ページ管理', icon: FileText },
              { id: 'parks', label: 'ドッグラン', icon: Building, badge: stats.pendingParks },
              { id: 'facilities', label: 'その他施設', icon: Building, badge: stats.pendingFacilities },
              { id: 'users', label: 'ユーザー', icon: Users },
              { id: 'vaccine-approval', label: 'ワクチン', icon: Shield, badge: stats.pendingVaccines }
            ].map((tab) => {
              const Icon = tab.icon;
              const hasBadge = tab.badge !== undefined && tab.badge > 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span>{tab.label}</span>
                  {hasBadge && (
                    <span className="ml-2 inline-flex items-center justify-center text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1.5 bg-red-500 shadow-lg animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* 2段目 */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'fraud', label: '不正検知', icon: ShieldAlert },
              { id: 'maintenance', label: 'メンテナンス', icon: Settings },
              { id: 'sponsors', label: 'スポンサー', icon: Monitor },
              // 新着情報（トップページの新着管理画面へリンク）
              { id: 'news-link', label: '新着情報', icon: FileText, to: '/admin/news' },
              { id: 'inquiries', label: 'お問い合わせ', icon: Mail },
              // 売り上げ管理は別ページへリンク
              { id: 'sales-link', label: '売り上げ管理', icon: DollarSign, to: '/admin/sales-overview' },
              // ショップ管理（上部タグ）
              { id: 'shop-link', label: 'ショップ管理', icon: ShoppingBag, to: '/admin/shop' }
            ].map((tab) => {
              const Icon = tab.icon as any;
              // to がある場合はリンク、それ以外はタブ切り替えボタン
              if ((tab as any).to) {
                return (
                  <Link
                    key={tab.id}
                    to={(tab as any).to}
                    className={`relative flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors no-underline hover:no-underline ${
                      'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </Link>
                );
              }
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`relative flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">総ユーザー数</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                    <p className="text-sm text-green-600">
                      今月 +{stats.newUsersThisMonth}人
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">総ドッグラン数</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalParks}</p>
                    {stats.pendingParks > 0 && (
                      <p className="text-sm text-orange-600">
                        承認待ち {stats.pendingParks}件
                      </p>
                    )}
                  </div>
                  <Building className="w-8 h-8 text-green-500" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">月間売上</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats.monthlyRevenue)}
                    </p>
                    <p className={`text-sm ${calculateRevenueGrowth() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      前月比 {calculateRevenueGrowth() >= 0 ? '+' : ''}{calculateRevenueGrowth().toFixed(1)}%
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-500" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">アクティブサブスクリプション</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions}</p>
                    <p className="text-sm text-gray-600">
                      総数 {stats.totalSubscriptions}件
                    </p>
                  </div>
                  <Badge className="w-8 h-8 text-purple-500" />
                </div>
              </Card>
            </div>

            {/* クイックアクション */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/admin/users">
                  <Button className="w-full justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    ユーザー管理
                  </Button>
                </Link>
                <Link to="/admin/parks">
                  <Button className="w-full justify-start">
                    <Building className="w-4 h-4 mr-2" />
                    ドッグラン管理
                  </Button>
                </Link>
                <Link to="/admin/sales">
                  <Button className="w-full justify-start">
                    <BarChart4 className="w-4 h-4 mr-2" />
                    売上レポート
                  </Button>
                </Link>
                <Link to="/admin/shop">
                  <Button className="w-full justify-start">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    ショップ管理
                  </Button>
                </Link>
              </div>
            </Card>

            {/* 映えスポット通報 管理 */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">映えスポット通報</h2>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setShowClosedReports(v=>!v)} className="text-sm text-blue-600 underline">
                    {showClosedReports ? '未対応のみ表示' : '対応済みも表示'}
                  </button>
                  <Button variant="secondary" size="sm" onClick={fetchSpotReports}>再読み込み</Button>
                </div>
              </div>
              {loadingSpotReports ? (
                <div className="text-sm text-gray-600">読み込み中...</div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500">日時</th>
                        <th className="px-3 py-2 text-left text-gray-500">スポット</th>
                        <th className="px-3 py-2 text-left text-gray-500">理由</th>
                        <th className="px-3 py-2 text-left text-gray-500">メモ</th>
                        <th className="px-3 py-2 text-left text-gray-500">状態</th>
                        <th className="px-3 py-2 text-left text-gray-500">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {spotReports
                        .filter(r => showClosedReports ? true : r.status !== 'closed')
                        .map((r) => (
                        <tr key={r.id} className="align-top">
                          <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString('ja-JP')}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{r.spot?.title || r.spot_id}</div>
                            <div className="text-xs text-gray-500">{r.spot?.address || ''}</div>
                          </td>
                          <td className="px-3 py-2 max-w-[260px]">
                            <div className="text-gray-800 break-words">{r.reason}</div>
                          </td>
                          <td className="px-3 py-2 w-[260px]">
                            <textarea defaultValue={r.admin_note || ''} className="w-full border rounded px-2 py-1 text-sm" rows={2}
                              onBlur={(e)=>saveAdminNote(r.id, e.target.value)} placeholder="対応メモ"/>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${r.status==='closed'?'bg-green-100 text-green-700':'bg-orange-100 text-orange-700'}`}>
                              {r.status==='closed'?'対応済み':'未対応'}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Link to={`/spots/${r.spot_id}`} target="_blank" className="text-blue-600 hover:text-blue-800 flex items-center"><Eye className="w-4 h-4 mr-1"/>詳細</Link>
                              {r.spot_id && (
                                <button className="text-gray-700 hover:text-gray-900 flex items-center"
                                  onClick={()=>toggleSpotHidden(r.spot_id, !(r.spot?.is_hidden ?? false))}>
                                  {(r.spot?.is_hidden ?? false) ? '表示する' : '非表示にする'}
                                </button>
                              )}
                              {r.status !== 'closed' && (
                                <button className="text-green-700 hover:text-green-900 flex items-center" onClick={()=>closeReport(r.id)}>
                                  <CheckCircle className="w-4 h-4 mr-1"/>対応済みにする
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {spotReports.filter(r => showClosedReports ? true : r.status !== 'closed').length === 0 && (
                        <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={6}>通報はありません</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ページ管理タブ */}
        {activeTab === 'pages' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ページ管理</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">ランディングページ</h4>
                    </div>
                    <Link to="/landing" target="_blank">
                      <Button className="bg-blue-600 hover:bg-blue-700">開く</Button>
                    </Link>
                  </div>
                </div>
                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">スポンサー向け案内</h4>
                      <p className="text-sm text-gray-600">金額・プラン記載の説明ページ</p>
                    </div>
                    <Link to="/sponsor-application" target="_blank">
                      <Button className="bg-blue-600 hover:bg-blue-700">開く</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 不正検知タブ */}
        {activeTab === 'fraud' && (
          <div className="space-y-6">
            {/* 不正検知統計 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">高リスクユーザー</p>
                    <p className="text-2xl font-bold text-red-600">{fraudStats?.totalHighRiskUsers || 0}</p>
                  </div>
                  <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">中リスクユーザー</p>
                    <p className="text-2xl font-bold text-yellow-600">{fraudStats?.totalMediumRiskUsers || 0}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">最近の検知</p>
                    <p className="text-2xl font-bold text-blue-600">{fraudStats?.recentDetections || 0}</p>
                    <p className="text-xs text-gray-500">過去30日</p>
                  </div>
                  <Eye className="w-8 h-8 text-blue-500" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">ブロック済み</p>
                    <p className="text-2xl font-bold text-green-600">{fraudStats?.blockedAttempts || 0}</p>
                  </div>
                  <Shield className="w-8 h-8 text-green-500" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">トライアル悪用</p>
                    <p className="text-2xl font-bold text-purple-600">{fraudStats?.trialAbuseCount || 0}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-purple-500" />
                </div>
              </Card>
            </div>

            {/* 不正検知管理 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">不正検知管理</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-red-900">高リスクユーザーの監視</h4>
                    <p className="text-sm text-red-700">
                      リスクスコア70以上のユーザーを定期的に確認し、必要に応じて制限措置を実施してください。
                    </p>
                  </div>
                  <Link to="/admin/users?filter=high_risk">
                    <Button className="bg-red-600 hover:bg-red-700">
                      <ShieldAlert className="w-4 h-4 mr-2" />
                      確認する
                    </Button>
                  </Link>
                </div>

                <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-yellow-900">中リスクユーザーの監視</h4>
                    <p className="text-sm text-yellow-700">
                      リスクスコア50-69のユーザーの動向を監視し、パターンを分析してください。
                    </p>
                  </div>
                  <Link to="/admin/users?filter=medium_risk">
                    <Button variant="secondary">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      確認する
                    </Button>
                  </Link>
                </div>

                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-blue-900">全ユーザー管理</h4>
                    <p className="text-sm text-blue-700">
                      すべてのユーザーの不正検知状況を確認し、総合的な監視を行います。
                    </p>
                  </div>
                  <Link to="/admin/users">
                    <Button variant="secondary">
                      <Users className="w-4 h-4 mr-2" />
                      ユーザー一覧
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>

            {/* 重複していたページ管理（ランディングページ）は削除しました */}
          </div>
        )}

        {/* スポンサー管理タブ */}
        {activeTab === 'sponsors' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">スポンサー広告お問い合わせ管理</h3>
            <p className="text-gray-600 mb-4">
              スポンサー広告のお問い合わせを管理できます。
            </p>
            <Link to="/admin/sponsors" className="text-blue-600 hover:text-blue-800">
              詳細な管理画面へ →
            </Link>
          </Card>
        )}

        {/* 施設承認管理タブ */}
        {activeTab === 'facilities' && (
          <AdminFacilityApproval />
        )}

        {/* ドッグラン承認管理タブ */}
        {activeTab === 'parks' && (
          <AdminParkManagement />
        )}

        {activeTab === 'vaccine-approval' && (
          <AdminVaccineApproval />
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
          <div>
            <AdminMaintenanceManagementComponent 
              onError={setProcessingError} 
              onSuccess={setProcessingSuccess} 
            />
          </div>
        )}
        
        {/* お問い合わせタブ */}
        {activeTab === 'inquiries' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">お問い合わせ（ユーザー⇄管理者）</h3>
            <p className="text-gray-600 mb-4">ユーザーからの問い合わせ・DMを一覧管理します。</p>
            <Link to="/admin/inquiries" className="inline-block">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Mail className="w-4 h-4 mr-2" />
                お問い合わせ一覧へ
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

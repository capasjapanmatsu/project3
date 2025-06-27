import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  MapPin, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Eye, 
  BarChart4, 
  Settings, 
  MapPin as MapPinIcon, 
  Clock, 
  AlertTriangle as AlertTriangleIcon,
  TrendingUp,
  Download,
  FileText,
  Image,
  Camera,
  Plus,
  User,
  DollarSign,
  Calendar
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import type { DogPark, VaccineCertification, Profile, Dog } from '../types';

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

interface PendingPark extends DogPark {
  owner: Profile;
}

interface PendingVaccine extends VaccineCertification {
  dog: Dog & { owner: Profile };
}

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'parks' | 'vaccines' | 'users'>('overview');
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
  const [pendingParks, setPendingParks] = useState<PendingPark[]>([]);
  const [pendingVaccines, setPendingVaccines] = useState<PendingVaccine[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPark, setSelectedPark] = useState<PendingPark | null>(null);
  const [selectedVaccine, setSelectedVaccine] = useState<PendingVaccine | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState('');
  const [processingSuccess, setProcessingSuccess] = useState('');

  useEffect(() => {
    // 管理者権限チェック（実際の実装では適切な権限チェックが必要）
    if (user?.email !== 'capasjapan@gmail.com') {
      // 管理者でない場合はリダイレクト
      navigate('/');
      return;
    }
    
    fetchAdminData();
  }, [user, navigate]);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      setProcessingError('');
      setProcessingSuccess('');
      
      // 管理者統計情報を取得
      const { data: statsData, error: statsError } = await supabase.rpc('get_admin_stats');
      
      if (statsError) throw statsError;
      
      setStats({
        totalUsers: statsData.total_users || 0,
        totalParks: statsData.total_parks || 0,
        pendingParks: statsData.pending_parks || 0,
        pendingVaccines: statsData.pending_vaccines || 0,
        totalReservations: statsData.total_reservations || 0,
        monthlyRevenue: statsData.monthly_revenue || 0,
        lastMonthRevenue: statsData.last_month_revenue || 0,
        totalSubscriptions: statsData.total_subscriptions || 0,
        activeSubscriptions: statsData.active_subscriptions || 0,
        newUsersThisMonth: statsData.new_users_this_month || 0,
        unreadMessages: statsData.unread_messages || 0
      });

      const [
        pendingParksResponse,
        pendingVaccinesResponse,
        usersResponse
      ] = await Promise.all([
        supabase
          .from('dog_parks')
          .select('*, owner:profiles(*)')
          .eq('status', 'pending'),
        
        supabase
          .from('vaccine_certifications')
          .select('*, dog:dogs(*, owner:profiles(*))')
          .eq('status', 'pending'),
        
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (pendingParksResponse.error) throw pendingParksResponse.error;
      if (pendingVaccinesResponse.error) throw pendingVaccinesResponse.error;
      if (usersResponse.error) throw usersResponse.error;

      setPendingParks(pendingParksResponse.data || []);
      setPendingVaccines(pendingVaccinesResponse.data || []);
      setUsers(usersResponse.data || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const approvePark = async (parkId: string) => {
    try {
      setIsProcessing(true);
      setProcessingError('');
      setProcessingSuccess('');
      
      // Update park status to first_stage_passed
      const { error } = await supabase
        .from('dog_parks')
        .update({ status: 'first_stage_passed' })
        .eq('id', parkId);

      if (error) throw error;
      
      // Create review stage record
      const { error: stageError } = await supabase
        .from('dog_park_review_stages')
        .insert([{
          park_id: parkId,
          first_stage_passed_at: new Date().toISOString()
        }]);
        
      if (stageError) throw stageError;
      
      // Get park details for notification
      const { data: parkData, error: parkError } = await supabase
        .from('dog_parks')
        .select('name, owner_id')
        .eq('id', parkId)
        .single();
        
      if (parkError) throw parkError;
      
      // Create notification for owner
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert([{
          user_id: parkData.owner_id,
          type: 'park_approval_required',
          title: '第一審査通過のお知らせ',
          message: `${parkData.name}の第一審査が通過しました。第二審査の詳細情報を入力してください。`,
          data: { park_id: parkId }
        }]);
        
      if (notifyError) throw notifyError;
      
      await fetchAdminData();
      setSelectedPark(null);
      setProcessingSuccess('ドッグランを承認しました。');
      
      // 3秒後に成功メッセージをクリア
      setTimeout(() => {
        setProcessingSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('Error approving park:', error);
      setProcessingError('承認に失敗しました: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectPark = async (parkId: string) => {
    try {
      setIsProcessing(true);
      setProcessingError('');
      setProcessingSuccess('');
      
      const { error } = await supabase
        .from('dog_parks')
        .update({ status: 'rejected' })
        .eq('id', parkId);

      if (error) throw error;
      
      // Get park details for notification
      const { data: parkData, error: parkError } = await supabase
        .from('dog_parks')
        .select('name, owner_id')
        .eq('id', parkId)
        .single();
        
      if (parkError) throw parkError;
      
      // Create notification for owner
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert([{
          user_id: parkData.owner_id,
          type: 'park_approval_required',
          title: 'ドッグラン審査結果のお知らせ',
          message: `${parkData.name}の審査が却下されました。詳細はダッシュボードをご確認ください。`,
          data: { park_id: parkId }
        }]);
        
      if (notifyError) throw notifyError;
      
      await fetchAdminData();
      setSelectedPark(null);
      setProcessingSuccess('ドッグランを却下しました。');
      
      // 3秒後に成功メッセージをクリア
      setTimeout(() => {
        setProcessingSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('Error rejecting park:', error);
      setProcessingError('却下に失敗しました: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const approveVaccine = async (vaccineId: string) => {
    try {
      setIsProcessing(true);
      setProcessingError('');
      setProcessingSuccess('');
      
      const { error } = await supabase
        .from('vaccine_certifications')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', vaccineId);

      if (error) throw error;
      
      // Get vaccine details for notification
      const { data: vaccineData, error: vaccineError } = await supabase
        .from('vaccine_certifications')
        .select('*, dog:dogs(name, owner_id)')
        .eq('id', vaccineId)
        .single();
        
      if (vaccineError) throw vaccineError;
      
      // Create notification for owner
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert([{
          user_id: vaccineData.dog.owner_id,
          type: 'vaccine_approval_required',
          title: 'ワクチン証明書承認のお知らせ',
          message: `${vaccineData.dog.name}ちゃんのワクチン証明書が承認されました。ドッグランを利用できるようになりました。`,
          data: { dog_id: vaccineData.dog_id }
        }]);
        
      if (notifyError) throw notifyError;
      
      await fetchAdminData();
      setSelectedVaccine(null);
      setProcessingSuccess('ワクチン証明書を承認しました。');
      
      // 3秒後に成功メッセージをクリア
      setTimeout(() => {
        setProcessingSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('Error approving vaccine:', error);
      setProcessingError('承認に失敗しました: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectVaccine = async (vaccineId: string) => {
    try {
      setIsProcessing(true);
      setProcessingError('');
      setProcessingSuccess('');
      
      const { error } = await supabase
        .from('vaccine_certifications')
        .update({ status: 'rejected' })
        .eq('id', vaccineId);

      if (error) throw error;
      
      // Get vaccine details for notification
      const { data: vaccineData, error: vaccineError } = await supabase
        .from('vaccine_certifications')
        .select('*, dog:dogs(name, owner_id)')
        .eq('id', vaccineId)
        .single();
        
      if (vaccineError) throw vaccineError;
      
      // Create notification for owner
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert([{
          user_id: vaccineData.dog.owner_id,
          type: 'vaccine_approval_required',
          title: 'ワクチン証明書却下のお知らせ',
          message: `${vaccineData.dog.name}ちゃんのワクチン証明書が却下されました。詳細はマイページをご確認ください。`,
          data: { dog_id: vaccineData.dog_id }
        }]);
        
      if (notifyError) throw notifyError;
      
      await fetchAdminData();
      setSelectedVaccine(null);
      setProcessingSuccess('ワクチン証明書を却下しました。');
      
      // 3秒後に成功メッセージをクリア
      setTimeout(() => {
        setProcessingSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('Error rejecting vaccine:', error);
      setProcessingError('却下に失敗しました: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
              <p className="text-xs text-green-600">+{stats.newUsersThisMonth} 今月</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
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

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">今月の予約数</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalReservations}</p>
              <p className="text-xs text-purple-600">サブスク会員: {stats.activeSubscriptions}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6">
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
      </div>

      {/* 緊急対応が必要な項目 */}
      {(stats.pendingParks > 0 || stats.pendingVaccines > 0 || stats.unreadMessages > 0) && (
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
                <Link to="/admin/management">
                  <Button 
                    size="sm" 
                    className="mt-2"
                  >
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
                  <Button 
                    size="sm" 
                    className="mt-2"
                  >
                    確認する
                  </Button>
                </Link>
              </div>
            )}
            {stats.unreadMessages > 0 && (
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <p className="font-medium text-red-900">未読お問い合わせ</p>
                <p className="text-2xl font-bold text-red-600">{stats.unreadMessages}件</p>
                <Button 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate('/admin/contact')}
                >
                  確認する
                </Button>
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
                    <span>未読お問い合わせ:</span>
                    <span className={`font-medium ${stats.unreadMessages > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.unreadMessages}件
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

          {/* クイックアクセス */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/admin/management">
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <FileCheck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">ワクチン・ドッグラン管理</h3>
                    <p className="text-sm text-gray-600">承認・審査管理</p>
                  </div>
                </div>
              </Card>
            </Link>
            <Link to="/admin/shop">
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-3 rounded-full">
                    <ShoppingBag className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">ショップ管理</h3>
                    <p className="text-sm text-gray-600">注文・商品管理</p>
                  </div>
                </div>
              </Card>
            </Link>
            <Link to="/admin/revenue">
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">売上レポート</h3>
                    <p className="text-sm text-gray-600">ドッグラン別売上・振込管理</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* ドッグラン管理タブ */}
      {activeTab === 'parks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">ドッグラン承認管理</h3>
            <div className="text-sm text-gray-500">
              承認待ち: {stats.pendingParks}件
            </div>
          </div>

          {pendingParks.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">承認待ちのドッグランはありません</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingParks.map(park => (
                <Card key={park.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold mb-2">{park.name}</h4>
                      <p className="text-gray-600 mb-2">{park.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">住所:</span> {park.address}
                        </div>
                        <div>
                          <span className="font-medium">料金:</span> ¥{park.price}/時間
                        </div>
                        <div>
                          <span className="font-medium">最大収容:</span> {park.max_capacity}人
                        </div>
                        <div>
                          <span className="font-medium">オーナー:</span> {park.owner?.name || '未設定'}
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">
                          申請日: {new Date(park.created_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedPark(park)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        詳細
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approvePark(park.id)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isProcessing}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        承認
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => rejectPark(park.id)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isProcessing}
                      >
                        <X className="w-4 h-4 mr-1" />
                        却下
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ワクチン承認タブ */}
      {activeTab === 'vaccines' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">ワクチン証明書承認</h3>
            <div className="text-sm text-gray-500">
              承認待ち: {stats.pendingVaccines}件
            </div>
          </div>

          {pendingVaccines.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">承認待ちのワクチン証明書はありません</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingVaccines.map((vaccine) => (
                <Card key={vaccine.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold mb-2">{vaccine.dog.name}のワクチン証明書</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">犬種:</span> {vaccine.dog.breed}
                        </div>
                        <div>
                          <span className="font-medium">性別:</span> {vaccine.dog.gender}
                        </div>
                        <div>
                          <span className="font-medium">飼い主:</span> {vaccine.dog.owner.name}
                        </div>
                        <div>
                          <span className="font-medium">申請日:</span> {new Date(vaccine.created_at).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedVaccine(vaccine)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        詳細
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveVaccine(vaccine.id)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isProcessing}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        承認
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => rejectVaccine(vaccine.id)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isProcessing}
                      >
                        <X className="w-4 h-4 mr-1" />
                        却下
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ユーザー管理タブ */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">ユーザー管理</h3>
            <div className="w-64">
              <Input
                label=""
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ユーザー名またはIDで検索..."
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredUsers.map(user => (
              <Card key={user.id} className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">{user.name || 'ユーザー名未設定'}</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>ID: {user.id}</p>
                      <p>タイプ: {user.user_type === 'owner' ? '施設オーナー' : user.user_type === 'admin' ? '管理者' : '利用者'}</p>
                      <p>登録日: {new Date(user.created_at).toLocaleDateString('ja-JP')}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary">
                      <Eye className="w-4 h-4 mr-1" />
                      詳細
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ドッグラン詳細モーダル */}
      {selectedPark && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">ドッグラン詳細</h2>
                <button
                  onClick={() => setSelectedPark(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">基本情報</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">施設名</label>
                      <p className="text-gray-900">{selectedPark.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">料金</label>
                      <p className="text-gray-900">¥{selectedPark.price}/時間</p>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">住所</label>
                      <p className="text-gray-900">{selectedPark.address}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">説明</label>
                      <p className="text-gray-900">{selectedPark.description}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">設備情報</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries({
                      parking: '駐車場',
                      shower: 'シャワー設備',
                      restroom: 'トイレ',
                      agility: 'アジリティ設備',
                      rest_area: '休憩スペース',
                      water_station: '給水設備',
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded ${
                          selectedPark.facilities[key as keyof typeof selectedPark.facilities] 
                            ? 'bg-green-500' 
                            : 'bg-gray-300'
                        }`} />
                        <span className="text-sm">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedPark(null)}
                  >
                    閉じる
                  </Button>
                  <Button
                    onClick={() => rejectPark(selectedPark.id)}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isProcessing}
                  >
                    却下
                  </Button>
                  <Button
                    onClick={() => approvePark(selectedPark.id)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={isProcessing}
                  >
                    承認
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ワクチン詳細モーダル */}
      {selectedVaccine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">ワクチン証明書詳細</h2>
                <button
                  onClick={() => setSelectedVaccine(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">犬の情報</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">名前</label>
                      <p className="text-gray-900">{selectedVaccine.dog.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">犬種</label>
                      <p className="text-gray-900">{selectedVaccine.dog.breed}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">性別</label>
                      <p className="text-gray-900">{selectedVaccine.dog.gender}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">生年月日</label>
                      <p className="text-gray-900">{new Date(selectedVaccine.dog.birth_date).toLocaleDateString('ja-JP')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">飼い主</label>
                      <p className="text-gray-900">{selectedVaccine.dog.owner.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">申請日</label>
                      <p className="text-gray-900">{new Date(selectedVaccine.created_at).toLocaleDateString('ja-JP')}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">ワクチン証明書画像</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedVaccine.rabies_vaccine_image && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">狂犬病ワクチン</label>
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <p className="text-sm text-gray-600">画像ファイル: {selectedVaccine.rabies_vaccine_image}</p>
                          <p className="text-xs text-gray-500 mt-1">※ 実際の画像確認は別途システムで行ってください</p>
                        </div>
                      </div>
                    )}
                    {selectedVaccine.combo_vaccine_image && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">混合ワクチン</label>
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <p className="text-sm text-gray-600">画像ファイル: {selectedVaccine.combo_vaccine_image}</p>
                          <p className="text-xs text-gray-500 mt-1">※ 実際の画像確認は別途システムで行ってください</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedVaccine(null)}
                  >
                    閉じる
                  </Button>
                  <Button
                    onClick={() => rejectVaccine(selectedVaccine.id)}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isProcessing}
                  >
                    却下
                  </Button>
                  <Button
                    onClick={() => approveVaccine(selectedVaccine.id)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={isProcessing}
                  >
                    承認
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ShoppingBag component for the missing icon
function ShoppingBag({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <path d="M16 10a4 4 0 0 1-8 0"></path>
    </svg>
  );
}

// Package component for the missing icon
function Package({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  );
}
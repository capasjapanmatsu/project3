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
  TrendingUp,
  Download,
  DollarSign,
  Calendar,
  ShoppingBag,
  Bell,
  Edit,
  Plus,
  FileText,
  Megaphone,
  Tag
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import type { DogPark, VaccineCertification, Profile, Dog, NewsAnnouncement } from '../types';

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
  const { user, isAdmin } = useAuth();
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
  
  // 新着情報管理の状態
  const [newsList, setNewsList] = useState<NewsAnnouncement[]>([]);
  const [newsFormData, setNewsFormData] = useState({
    title: '',
    content: '',
    category: 'news' as 'news' | 'announcement' | 'sale',
    is_important: false,
    image_url: '',
    link_url: ''
  });
  const [selectedNews, setSelectedNews] = useState<NewsAnnouncement | null>(null);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [isUpdatingNews, setIsUpdatingNews] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [newsSuccess, setNewsSuccess] = useState('');

  useEffect(() => {
    // 管理者権限チェック
    if (!isAdmin) {
      // 管理者でない場合はリダイレクト
      navigate('/');
      return;
    }
    
    fetchAdminData();
  }, [isAdmin, navigate]);

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
    } catch (error) {
      console.error('Error approving park:', error);
      setProcessingError('承認に失敗しました: ' + (error as Error).message);
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
    } catch (error) {
      console.error('Error rejecting park:', error);
      setProcessingError('却下に失敗しました: ' + (error as Error).message);
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
    } catch (error) {
      console.error('Error approving vaccine:', error);
      setProcessingError('承認に失敗しました: ' + (error as Error).message);
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
    } catch (error) {
      console.error('Error rejecting vaccine:', error);
      setProcessingError('却下に失敗しました: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 新着情報の取得（改善版）
  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNewsList(data || []);
      setNewsError('');
    } catch (error) {
      console.error('Error fetching news:', error);
      setNewsError('新着情報の取得に失敗しました。');
    }
  };

  // 新着情報の追加・更新（改善版）
  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!newsFormData.title.trim()) {
      setNewsError('タイトルを入力してください。');
      return;
    }
    if (!newsFormData.content.trim()) {
      setNewsError('内容を入力してください。');
      return;
    }

    try {
      setIsUpdatingNews(true);
      setNewsError('');
      setNewsSuccess('');

      if (selectedNews) {
        // 更新
        const { error } = await supabase
          .from('news_announcements')
          .update({
            title: newsFormData.title,
            content: newsFormData.content,
            category: newsFormData.category,
            is_important: newsFormData.is_important,
            image_url: newsFormData.image_url || null,
            link_url: newsFormData.link_url || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedNews.id);

        if (error) throw error;
        setNewsSuccess('新着情報を更新しました。');
      } else {
        // 新規追加
        const { error } = await supabase
          .from('news_announcements')
          .insert([{
            title: newsFormData.title,
            content: newsFormData.content,
            category: newsFormData.category,
            is_important: newsFormData.is_important,
            image_url: newsFormData.image_url || null,
            link_url: newsFormData.link_url || null,
            created_by: user?.id
          }]);

        if (error) throw error;
        setNewsSuccess('新着情報を追加しました。');
      }

      // フォームリセット
      setNewsFormData({
        title: '',
        content: '',
        category: 'news',
        is_important: false,
        image_url: '',
        link_url: ''
      });
      setSelectedNews(null);
      setShowNewsModal(false);
      
      // 新着情報一覧を更新
      await fetchNews();

      // 3秒後に成功メッセージを消去
      setTimeout(() => {
        setNewsSuccess('');
      }, 3000);

    } catch (error) {
      console.error('Error saving news:', error);
      setNewsError('新着情報の保存に失敗しました。');
    } finally {
      setIsUpdatingNews(false);
    }
  };

  // 新着情報の削除（改善版）
  const handleDeleteNews = async (id: string) => {
    if (!confirm('この新着情報を削除してもよろしいですか？')) return;

    try {
      setIsUpdatingNews(true);
      setNewsError('');

      const { error } = await supabase
        .from('news_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNewsSuccess('新着情報を削除しました。');
      await fetchNews();

      // 3秒後に成功メッセージを消去
      setTimeout(() => {
        setNewsSuccess('');
      }, 3000);

    } catch (error) {
      console.error('Error deleting news:', error);
      setNewsError('新着情報の削除に失敗しました。');
    } finally {
      setIsUpdatingNews(false);
    }
  };

  // 新着情報の編集準備
  const handleEditNews = (news: NewsAnnouncement) => {
    setSelectedNews(news);
    setNewsFormData({
      title: news.title,
      content: news.content,
      category: news.category,
      is_important: news.is_important || false,
      image_url: news.image_url || '',
      link_url: news.link_url || ''
    });
    setShowNewsModal(true);
  };

  // カテゴリーラベルとカラーの取得
  const getCategoryLabel = (category: string) => {
    const labels = {
      news: 'お知らせ',
      announcement: '重要なお知らせ',
      sale: 'セール情報'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      news: 'bg-blue-100 text-blue-800',
      announcement: 'bg-red-100 text-red-800',
      sale: 'bg-green-100 text-green-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'news':
        return <FileText className="w-4 h-4" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4" />;
      case 'sale':
        return <Tag className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
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
                <Link to="/admin/tasks?tab=parks">
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
                <Link to="/admin/tasks?tab=vaccines">
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
                <Link to="/admin/tasks?tab=messages">
                  <Button 
                    size="sm" 
                    className="mt-2"
                  >
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

          <Card className="p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <Bell className="w-5 h-5 text-blue-600 mr-2" />
                新着情報管理
              </h2>
              <Button
                onClick={() => {
                  setSelectedNews(null);
                  setNewsFormData({
                    title: '',
                    content: '',
                    category: 'news',
                    is_important: false,
                    image_url: '',
                    link_url: ''
                  });
                  setShowNewsModal(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                新着情報を追加
              </Button>
            </div>

            {/* エラー・成功メッセージ */}
            {newsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-red-800">{newsError}</p>
              </div>
            )}
            
            {newsSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-green-800">{newsSuccess}</p>
              </div>
            )}

            {/* 新着情報一覧 */}
            <div className="space-y-4">
              {newsList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  新着情報がありません
                </div>
              ) : (
                newsList.map(news => (
                  <div key={news.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getCategoryColor(news.category)}`}>
                            {getCategoryIcon(news.category)}
                            <span>{getCategoryLabel(news.category)}</span>
                          </span>
                          {news.is_important && (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                              重要
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-lg mb-2">{news.title}</h3>
                        <p className="text-sm text-gray-700 mb-2 line-clamp-2">{news.content}</p>
                        {news.image_url && (
                          <p className="text-xs text-gray-500 mb-1">画像URL: {news.image_url}</p>
                        )}
                        {news.link_url && (
                          <p className="text-xs text-gray-500 mb-1">リンクURL: {news.link_url}</p>
                        )}
                        <div className="text-xs text-gray-500">
                          作成日: {new Date(news.created_at).toLocaleString('ja-JP')}
                          {news.updated_at !== news.created_at && (
                            <span> / 更新日: {new Date(news.updated_at).toLocaleString('ja-JP')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditNews(news)}
                          disabled={isUpdatingNews}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          編集
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteNews(news.id)}
                          disabled={isUpdatingNews}
                        >
                          <X className="w-4 h-4 mr-1" />
                          削除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

      {/* 新着情報追加・編集モーダル */}
      {showNewsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {selectedNews ? '新着情報を編集' : '新着情報を追加'}
                </h2>
                <button
                  onClick={() => setShowNewsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={isUpdatingNews}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleNewsSubmit}>
                <div className="space-y-4">
                  <Input
                    label="タイトル *"
                    value={newsFormData.title}
                    onChange={(e) => setNewsFormData({ ...newsFormData, title: e.target.value })}
                    required
                    disabled={isUpdatingNews}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      内容 *
                    </label>
                    <textarea
                      value={newsFormData.content}
                      onChange={(e) => setNewsFormData({ ...newsFormData, content: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={6}
                      required
                      disabled={isUpdatingNews}
                    />
                  </div>
                  
                  <Select
                    label="カテゴリー *"
                    options={[
                      { value: 'news', label: 'お知らせ' },
                      { value: 'announcement', label: '重要なお知らせ' },
                      { value: 'sale', label: 'セール情報' }
                    ]}
                    value={newsFormData.category}
                    onChange={(e) => setNewsFormData({ ...newsFormData, category: e.target.value as 'news' | 'announcement' | 'sale' })}
                    required
                    disabled={isUpdatingNews}
                  />
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_important"
                      checked={newsFormData.is_important}
                      onChange={(e) => setNewsFormData({ ...newsFormData, is_important: e.target.checked })}
                      className="rounded text-blue-600"
                      disabled={isUpdatingNews}
                    />
                    <label htmlFor="is_important" className="text-sm text-gray-700">
                      重要なお知らせとして表示する
                    </label>
                  </div>
                  
                  <Input
                    label="画像URL（任意）"
                    value={newsFormData.image_url}
                    onChange={(e) => setNewsFormData({ ...newsFormData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    disabled={isUpdatingNews}
                  />
                  
                  <Input
                    label="リンクURL（任意）"
                    value={newsFormData.link_url}
                    onChange={(e) => setNewsFormData({ ...newsFormData, link_url: e.target.value })}
                    placeholder="https://example.com/page"
                    disabled={isUpdatingNews}
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowNewsModal(false)}
                    disabled={isUpdatingNews}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isUpdatingNews}
                  >
                    {selectedNews ? '更新する' : '追加する'}
                  </Button>
                </div>
              </form>
            </div>
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
                        <Eye className="w-4 h-4 mr-1" />
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
                        <Eye className="w-4 h-4 mr-1" />
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
                  <Eye className="w-6 h-6" />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedVaccine.rabies_vaccine_image && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          狂犬病ワクチン証明書
                        </label>
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={selectedVaccine.rabies_vaccine_image}
                            alt="狂犬病ワクチン証明書"
                            className="w-full h-64 object-contain bg-white"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling!.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden p-4 text-center">
                            <p className="text-sm text-gray-600">画像の読み込みに失敗しました</p>
                            <a 
                              href={selectedVaccine.rabies_vaccine_image}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              直接リンクで確認
                            </a>
                          </div>
                        </div>
                        {selectedVaccine.rabies_expiry_date && (
                          <p className="text-sm text-gray-600 mt-2">
                            有効期限: {new Date(selectedVaccine.rabies_expiry_date).toLocaleDateString('ja-JP')}
                          </p>
                        )}
                      </div>
                    )}
                    {selectedVaccine.combo_vaccine_image && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          混合ワクチン証明書
                        </label>
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={selectedVaccine.combo_vaccine_image}
                            alt="混合ワクチン証明書"
                            className="w-full h-64 object-contain bg-white"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling!.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden p-4 text-center">
                            <p className="text-sm text-gray-600">画像の読み込みに失敗しました</p>
                            <a 
                              href={selectedVaccine.combo_vaccine_image}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              直接リンクで確認
                            </a>
                          </div>
                        </div>
                        {selectedVaccine.combo_expiry_date && (
                          <p className="text-sm text-gray-600 mt-2">
                            有効期限: {new Date(selectedVaccine.combo_expiry_date).toLocaleDateString('ja-JP')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedVaccine.temp_storage && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <span className="font-medium">⚠️ 一時保管中:</span> 
                        この証明書は一時保管されています。承認または却下後に自動的に削除されます。
                      </p>
                    </div>
                  )}
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


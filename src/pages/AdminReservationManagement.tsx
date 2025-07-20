import {
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    Calendar,
    CheckCircle,
    Clock,
    Crown,
    DollarSign,
    Download,
    Eye,
    Search,
    XCircle
} from 'lucide-react';
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface ReservationData {
  id: string;
  user_name: string;
  user_email: string;
  park_name: string;
  park_id: string;
  reservation_date: string;
  start_time: string;
  duration: number;
  total_price: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  is_subscription: boolean;
  created_at: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  dog_count: number;
}

interface ReservationStats {
  daily_stats: Array<{
    date: string;
    count: number;
    revenue: number;
    cancellation_rate: number;
  }>;
  top_parks: Array<{
    park_name: string;
    reservation_count: number;
    revenue: number;
  }>;
  user_segments: {
    subscription: number;
    regular: number;
  };
}

export function AdminReservationManagement() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'cancelled' | 'completed'>('all');
  const [filterDate, setFilterDate] = useState('');
  const [sortBy, setSortBy] = useState<'reservation_date' | 'created_at' | 'total_price'>('reservation_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ✨ React 18 Concurrent Features for large datasets
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredFilterStatus = useDeferredValue(filterStatus);
  const deferredFilterDate = useDeferredValue(filterDate);
  const deferredSortBy = useDeferredValue(sortBy);
  const deferredSortOrder = useDeferredValue(sortOrder);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchReservations();
    fetchStats();
  }, [isAdmin, navigate]);

  // ✨ Optimized filtering with useMemo for performance
  const filteredReservations = useMemo(() => {
    console.log(`🔍 Filtering ${reservations.length} reservations...`);
    
    let filtered = [...reservations];

    // Search filter with deferred value
    if (deferredSearchTerm) {
      filtered = filtered.filter(reservation =>
        reservation.user_name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
        reservation.user_email.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
        reservation.park_name.toLowerCase().includes(deferredSearchTerm.toLowerCase())
      );
    }

    // Status filter
    if (deferredFilterStatus !== 'all') {
      filtered = filtered.filter(reservation => reservation.status === deferredFilterStatus);
    }

    // Date filter
    if (deferredFilterDate) {
      const filterDateObj = new Date(deferredFilterDate);
      filtered = filtered.filter(reservation => {
        const reservationDate = new Date(reservation.reservation_date);
        return reservationDate.toDateString() === filterDateObj.toDateString();
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any = a[deferredSortBy];
      let bValue: any = b[deferredSortBy];

      if (deferredSortBy === 'reservation_date' || deferredSortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (deferredSortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    console.log(`✅ Filtered to ${filtered.length} reservations`);
    return filtered;
  }, [reservations, deferredSearchTerm, deferredFilterStatus, deferredFilterDate, deferredSortBy, deferredSortOrder]);

  // ✨ Optimized handlers with startTransition
  const handleSearchChange = (value: string) => {
    setSearchTerm(value); // Immediate update for input responsiveness
    
    startTransition(() => {
      console.log(`🔍 Searching reservations for "${value}"`);
    });
  };

  const handleStatusFilter = (status: typeof filterStatus) => {
    startTransition(() => {
      setFilterStatus(status);
    });
  };

  const handleDateFilter = (date: string) => {
    startTransition(() => {
      setFilterDate(date);
    });
  };

  const handleSortChange = (sort: typeof sortBy) => {
    startTransition(() => {
      setSortBy(sort);
    });
  };

  const handleSortOrderChange = (order: typeof sortOrder) => {
    startTransition(() => {
      setSortOrder(order);
    });
  };

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      setError('');

      // 予約データを取得
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          id,
          user_id,
          park_id,
          dog_id,
          date,
          start_time,
          duration,
          status,
          total_amount,
          reservation_type,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (reservationsError) {
        console.error('Reservations error:', reservationsError);
        throw new Error('予約情報の取得に失敗しました');
      }

      if (!reservationsData || reservationsData.length === 0) {
        setReservations([]);
        return;
      }

      // auth.usersテーブルからメール情報を取得（管理者権限があれば）
      let authUsers: any = null;
      try {
        const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError) {
          authUsers = authUsersData;
          console.log('Successfully fetched auth users for reservations');
        } else {
          console.warn('Auth users fetch failed for reservations:', authError);
        }
      } catch (authError) {
        console.warn('Auth admin API not available for reservations:', authError);
      }

      // 各予約の詳細データを取得
      const reservationPromises = reservationsData.map(async (reservation) => {
        try {
          // ユーザー情報を取得
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('name, user_type')
            .eq('id', reservation.user_id)
            .single();

          // ドッグラン情報を取得
          const { data: parkData } = await supabase
            .from('dog_parks')
            .select('name, address')
            .eq('id', reservation.park_id)
            .single();

          // 犬の情報を取得
          const { data: dogData } = await supabase
            .from('dogs')
            .select('name, breed')
            .eq('id', reservation.dog_id)
            .single();

          // サブスクリプション情報を取得
          let subscription = null;
          try {
            const { data: subscriptionData } = await supabase
              .from('stripe_subscriptions')
              .select('status')
              .eq('user_id', reservation.user_id)
              .eq('status', 'active')
              .maybeSingle();
            subscription = subscriptionData;
          } catch (subscriptionError) {
            console.warn('Stripe subscriptions table not available:', subscriptionError);
            // テーブルが存在しない場合はスキップ
          }

          // auth.usersからユーザーのメール情報を取得（利用可能な場合）
          const authUser = authUsers?.users?.find((u: any) => u.id === reservation.user_id);
          const actualEmail = authUser?.email;

          return {
            id: reservation.id,
            user_name: userProfile?.name || 'Unknown',
            user_email: actualEmail || `user_${reservation.user_id.slice(0, 8)}@unknown.com`,
            park_id: reservation.park_id,
            park_name: parkData?.name || 'Unknown Park',
            park_address: parkData?.address || 'Unknown Address',
            dog_name: dogData?.name || 'Unknown Dog',
            dog_breed: dogData?.breed || 'Unknown Breed',
            dog_count: 1,
            reservation_date: reservation.date,
            start_time: reservation.start_time,
            duration: reservation.duration || 1,
            total_price: reservation.total_amount || 0,
            status: reservation.status,
            reservation_type: reservation.reservation_type,
            is_subscription: !!subscription,
            payment_status: reservation.total_amount > 0 ? 'paid' : 'pending',
            created_at: reservation.created_at,
            updated_at: reservation.updated_at
          } as ReservationData;
        } catch (err) {
          console.error(`Error fetching data for reservation ${reservation.id}:`, err);
          return {
            id: reservation.id,
            user_name: 'Unknown',
            user_email: `user_${reservation.user_id.slice(0, 8)}@unknown.com`,
            park_id: reservation.park_id,
            park_name: 'Unknown Park',
            park_address: 'Unknown Address',
            dog_name: 'Unknown Dog',
            dog_breed: 'Unknown Breed',
            dog_count: 1,
            reservation_date: reservation.date,
            start_time: reservation.start_time,
            duration: reservation.duration || 1,
            total_price: reservation.total_amount || 0,
            status: reservation.status,
            reservation_type: reservation.reservation_type,
            is_subscription: false,
            payment_status: 'pending',
            created_at: reservation.created_at,
            updated_at: reservation.updated_at
          } as ReservationData;
        }
      });

      const reservationsWithDetails = await Promise.all(reservationPromises);
      setReservations(reservationsWithDetails);
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setError(`予約データの取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error: statsError } = await supabase
        .rpc('get_admin_reservation_stats');

      if (statsError) throw statsError;

      setStats(data);
    } catch (err) {
      console.error('Error fetching reservation stats:', err);
    }
  };

  const exportToCSV = () => {
    const headers = ['予約ID', 'ユーザー名', 'メール', 'ドッグラン', '予約日', '開始時間', '時間', '料金', 'ステータス', '支払状況', '登録日'];
    const csvData = filteredReservations.map(reservation => [
      reservation.id,
      reservation.user_name,
      reservation.user_email,
      reservation.park_name,
      new Date(reservation.reservation_date).toLocaleDateString('ja-JP'),
      `${reservation.start_time}:00`,
      `${reservation.duration}時間`,
      `¥${reservation.total_price.toLocaleString()}`,
      getStatusLabel(reservation.status),
      getPaymentStatusLabel(reservation.payment_status),
      new Date(reservation.created_at).toLocaleDateString('ja-JP')
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reservations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      confirmed: '確定',
      cancelled: 'キャンセル',
      completed: '完了'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels = {
      pending: '未払い',
      paid: '支払済み',
      refunded: '返金済み'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
      completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.confirmed;
    const IconComponent = config.icon;

    return (
      <div className="flex items-center space-x-1">
        <IconComponent className="w-4 h-4" />
        <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
          {getStatusLabel(status)}
        </span>
      </div>
    );
  };

  const getPaymentBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      refunded: { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <div className="flex items-center space-x-1">
        <IconComponent className="w-4 h-4" />
        <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
          {getPaymentStatusLabel(status)}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  const totalRevenue = filteredReservations.reduce((sum, res) => sum + res.total_price, 0);
  const averagePrice = filteredReservations.length > 0 
    ? totalRevenue / filteredReservations.length 
    : 0;
  const subscriptionReservations = filteredReservations.filter(r => r.is_subscription).length;
  const cancellationRate = reservations.length > 0 
    ? (reservations.filter(r => r.status === 'cancelled').length / reservations.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link to="/admin" className="flex items-center text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          ダッシュボードに戻る
        </Link>
      </div>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Calendar className="w-8 h-8 text-purple-600 mr-3" />
            予約管理
          </h1>
          <p className="text-gray-600">予約の詳細情報と統計分析</p>
        </div>
        <div className="text-sm text-gray-500">
          総予約数: {reservations.length}件
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総予約数</p>
              <p className="text-xl font-bold text-purple-600">{reservations.length}</p>
            </div>
            <Calendar className="w-6 h-6 text-purple-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">サブスク予約</p>
              <p className="text-xl font-bold text-blue-600">
                {subscriptionReservations}
              </p>
              <p className="text-xs text-gray-500">
                {reservations.length > 0 ? Math.round((subscriptionReservations / reservations.length) * 100) : 0}%
              </p>
            </div>
            <Crown className="w-6 h-6 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">平均単価</p>
              <p className="text-xl font-bold text-green-600">
                ¥{Math.round(averagePrice).toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">キャンセル率</p>
              <p className="text-xl font-bold text-orange-600">
                {cancellationRate.toFixed(1)}%
              </p>
            </div>
            <BarChart3 className="w-6 h-6 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* 日別統計グラフ */}
      {stats && stats.daily_stats.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">日別予約統計（直近30日）</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">平均日次予約数</p>
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(stats.daily_stats.reduce((sum, day) => sum + day.count, 0) / stats.daily_stats.length)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">平均日次売上</p>
              <p className="text-2xl font-bold text-green-600">
                ¥{Math.round(stats.daily_stats.reduce((sum, day) => sum + day.revenue, 0) / stats.daily_stats.length).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">平均キャンセル率</p>
              <p className="text-2xl font-bold text-orange-600">
                {(stats.daily_stats.reduce((sum, day) => sum + day.cancellation_rate, 0) / stats.daily_stats.length).toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 人気ドッグランランキング */}
      {stats && stats.top_parks.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">人気ドッグランランキング</h3>
          <div className="space-y-3">
            {stats.top_parks.slice(0, 5).map((park, index) => (
              <div key={park.park_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{park.park_name}</p>
                    <p className="text-sm text-gray-600">{park.reservation_count}件の予約</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">¥{park.revenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">売上</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 検索・フィルター */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <Input
              label="検索"
              placeholder="ユーザー名、メール、ドッグラン名で検索..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              icon={<Search className="w-4 h-4 text-gray-500" />}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              value={filterStatus}
              onChange={(e) => handleStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">すべて</option>
              <option value="confirmed">確定</option>
              <option value="cancelled">キャンセル</option>
              <option value="completed">完了</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              予約日
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => handleDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              並び順
            </label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                handleSortChange(field as any);
                handleSortOrderChange(order as any);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="reservation_date-desc">予約日（新しい順）</option>
              <option value="reservation_date-asc">予約日（古い順）</option>
              <option value="created_at-desc">登録日（新しい順）</option>
              <option value="created_at-asc">登録日（古い順）</option>
              <option value="total_price-desc">料金（高い順）</option>
              <option value="total_price-asc">料金（低い順）</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-600">
            {filteredReservations.length}件の予約が見つかりました
            {filteredReservations.length > 0 && (
              <span className="ml-2">
                （合計売上: ¥{totalRevenue.toLocaleString()}）
              </span>
            )}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={exportToCSV}
          >
            <Download className="w-4 h-4 mr-1" />
            CSV出力
          </Button>
        </div>
      </Card>

      {/* 予約一覧 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ユーザー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ドッグラン
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  予約日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  料金
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  支払状況
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {reservation.user_name}
                        </div>
                        {reservation.is_subscription && (
                          <Crown className="w-4 h-4 text-purple-600 ml-2" />
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {reservation.user_email}
                      </div>
                      <div className="text-xs text-gray-400">
                        犬: {reservation.dog_count}匹
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {reservation.park_name}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1 text-sm">
                      <div className="text-gray-900">
                        {new Date(reservation.reservation_date).toLocaleDateString('ja-JP')}
                      </div>
                      <div className="text-gray-500">
                        {reservation.start_time}:00 ({reservation.duration}時間)
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ¥{reservation.total_price.toLocaleString()}
                    </div>
                    {reservation.is_subscription && (
                      <div className="text-xs text-purple-600">
                        サブスク割引適用
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(reservation.status)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPaymentBadge(reservation.payment_status)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/parks/${reservation.park_id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
} 
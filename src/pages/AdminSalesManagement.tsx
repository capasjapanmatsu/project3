import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  DollarSign, 
  ArrowLeft, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  ShoppingBag,
  MapPin,
  Filter,
  Download,
  BarChart3,
  PieChart,
  Crown,
  Users
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';

interface SalesData {
  id: string;
  transaction_type: 'reservation' | 'shop_order' | 'subscription';
  amount: number;
  user_name: string;
  user_email: string;
  park_name?: string;
  product_name?: string;
  quantity?: number;
  transaction_date: string;
  payment_method: string;
  is_subscription_user: boolean;
  commission_rate: number;
  net_amount: number;
}

interface SalesStats {
  daily_revenue: Array<{
    date: string;
    total_revenue: number;
    reservation_revenue: number;
    shop_revenue: number;
    subscription_revenue: number;
    transaction_count: number;
  }>;
  top_products: Array<{
    product_name: string;
    sales_count: number;
    total_revenue: number;
  }>;
  top_parks: Array<{
    park_name: string;
    revenue: number;
    commission_earned: number;
  }>;
  payment_methods: Array<{
    method: string;
    count: number;
    total_amount: number;
  }>;
}

export function AdminSalesManagement() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState<SalesData[]>([]);
  const [filteredSales, setFilteredSales] = useState<SalesData[]>([]);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'reservation' | 'shop_order' | 'subscription'>('all');
  const [filterDate, setFilterDate] = useState('');
  const [sortBy, setSortBy] = useState<'transaction_date' | 'amount' | 'net_amount'>('transaction_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchSalesData();
    fetchStats();
  }, [isAdmin, navigate]);

  useEffect(() => {
    filterAndSortSales();
  }, [sales, searchTerm, filterType, filterDate, sortBy, sortOrder]);

  const fetchSalesData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // 予約からの売上データを取得
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          id,
          user_id,
          park_id,
          total_amount,
          status,
          reservation_type,
          created_at
        `)
        .not('total_amount', 'is', null)
        .order('created_at', { ascending: false });

      if (reservationsError) {
        console.error('Reservations error:', reservationsError);
        throw new Error('予約売上データの取得に失敗しました');
      }

      // サブスクリプション売上データを取得
      let subscriptionData = null;
      let subscriptionError = null;
      
      try {
        // 従来のテーブルが利用できない場合はstripe_subscriptionsを使用
        const { data: stripeSubscriptionData, error: stripeError } = await supabase
          .from('stripe_subscriptions')
          .select(`
            id,
            customer_id,
            status,
            current_period_start,
            current_period_end,
            created_at
          `)
          .in('status', ['active', 'trialing', 'past_due', 'canceled'])
          .not('deleted_at', 'is', null);
        
        subscriptionData = stripeSubscriptionData;
        subscriptionError = stripeError;
      } catch (tableError) {
        console.warn('Stripe subscriptions table not available:', tableError);
        // テーブルが存在しない場合はスキップ
        subscriptionData = [];
        subscriptionError = null;
      }

      // auth.usersテーブルからメール情報を取得（管理者権限があれば）
      let authUsers: any = null;
      try {
        const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError) {
          authUsers = authUsersData;
          console.log('Successfully fetched auth users for sales');
        } else {
          console.warn('Auth users fetch failed for sales:', authError);
        }
      } catch (authError) {
        console.warn('Auth admin API not available for sales:', authError);
      }

      // 予約売上データを変換
      const reservationSales = await Promise.all(
        (reservationsData || []).map(async (reservation) => {
          try {
            // ユーザー情報を取得
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', reservation.user_id)
              .single();

            // ドッグラン情報を取得
            const { data: parkData } = await supabase
              .from('dog_parks')
              .select('name')
              .eq('id', reservation.park_id)
              .single();

            const amount = reservation.total_amount || 0;
            const commission = Math.round(amount * 0.2); // 20%の手数料
            const netAmount = amount - commission;

            // auth.usersからユーザーのメール情報を取得（利用可能な場合）
            const authUser = authUsers?.users?.find((u: any) => u.id === reservation.user_id);
            const actualEmail = authUser?.email;

            return {
              id: reservation.id,
              user_name: userProfile?.name || 'Unknown',
              user_email: actualEmail || `user_${reservation.user_id.slice(0, 8)}@unknown.com`,
              transaction_type: 'reservation',
              transaction_date: reservation.created_at,
              amount: amount,
              commission: commission,
              commission_rate: 0.2,
              net_amount: netAmount,
              payment_method: 'card',
              payment_status: reservation.status === 'confirmed' ? 'paid' : 'pending',
              description: `${parkData?.name || 'Unknown Park'} - 予約料金`,
              is_subscription_user: reservation.reservation_type === 'subscription',
              created_at: reservation.created_at
            } as SalesData;
          } catch (err) {
            console.error(`Error processing reservation ${reservation.id}:`, err);
            return {
              id: reservation.id,
              user_name: 'Unknown',
              user_email: `user_${reservation.user_id.slice(0, 8)}@unknown.com`,
              transaction_type: 'reservation',
              transaction_date: reservation.created_at,
              amount: reservation.total_amount || 0,
              commission: 0,
              commission_rate: 0.2,
              net_amount: reservation.total_amount || 0,
              payment_method: 'card',
              payment_status: 'pending',
              description: '予約料金',
              is_subscription_user: false,
              created_at: reservation.created_at
            } as SalesData;
          }
        })
      );

      // サブスクリプション売上データを変換
      const subscriptionSales = await Promise.all(
        (subscriptionData || []).map(async (subscription) => {
          try {
            let userId = null;
            
            // 従来のsubscriptionsテーブルの場合、user_idが直接存在
            if ('user_id' in subscription) {
              userId = subscription.user_id;
            } else {
              // stripe_subscriptionsテーブルの場合、customer_idから取得
              const { data: customerData } = await supabase
                .from('stripe_customers')
                .select('user_id')
                .eq('customer_id', subscription.customer_id)
                .not('deleted_at', 'is', null)
                .single();
              userId = customerData?.user_id;
            }

            if (!userId) {
              throw new Error('User ID not found for subscription');
            }

            // ユーザー情報を取得
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', userId)
              .single();

            // 月額サブスクリプション料金（仮定）
            const amount = 2980; // 月額2980円
            const commission = Math.round(amount * 0.1); // 10%の手数料
            const netAmount = amount - commission;

            // auth.usersからユーザーのメール情報を取得（利用可能な場合）
            const authUser = authUsers?.users?.find((u: any) => u.id === userId);
            const actualEmail = authUser?.email;

            return {
              id: subscription.id,
              user_name: userProfile?.name || 'Unknown',
              user_email: actualEmail || `user_${userId.slice(0, 8)}@unknown.com`,
              transaction_type: 'subscription',
              transaction_date: subscription.created_at,
              amount: amount,
              commission: commission,
              commission_rate: 0.1,
              net_amount: netAmount,
              payment_method: 'card',
              payment_status: subscription.status === 'active' ? 'paid' : 'pending',
              description: `月額サブスクリプション - ${subscription.status}`,
              is_subscription_user: true,
              created_at: subscription.created_at
            } as SalesData;
          } catch (err) {
            console.error(`Error processing subscription ${subscription.id}:`, err);
            return {
              id: subscription.id,
              user_name: 'Unknown',
              user_email: 'unknown@unknown.com',
              transaction_type: 'subscription',
              transaction_date: subscription.created_at,
              amount: 2980,
              commission: 298,
              commission_rate: 0.1,
              net_amount: 2682,
              payment_method: 'card',
              payment_status: 'pending',
              description: '月額サブスクリプション',
              is_subscription_user: true,
              created_at: subscription.created_at
            } as SalesData;
          }
        })
      );

      // 全売上データを結合
      const allSales = [...reservationSales, ...subscriptionSales];
      allSales.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

      setSales(allSales);
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(`売上データの取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // 今月の開始日と終了日を計算
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // 今月の予約売上を取得
      const { data: monthlyReservations } = await supabase
        .from('reservations')
        .select('total_amount')
        .gte('created_at', startOfMonth.toISOString())
        .not('total_amount', 'is', null);

      // 先月の予約売上を取得
      const { data: previousMonthReservations } = await supabase
        .from('reservations')
        .select('total_amount')
        .gte('created_at', startOfPreviousMonth.toISOString())
        .lt('created_at', endOfPreviousMonth.toISOString())
        .not('total_amount', 'is', null);

      // 今月のサブスクリプション売上を取得
      const { count: activeSubscriptions } = await supabase
        .from('stripe_subscriptions')
        .select('id', { count: 'exact' })
        .eq('status', 'active')
        .gte('created_at', startOfMonth.toISOString());

      // 先月のサブスクリプション売上を取得
      const { count: previousMonthSubscriptions } = await supabase
        .from('stripe_subscriptions')
        .select('id', { count: 'exact' })
        .eq('status', 'active')
        .gte('created_at', startOfPreviousMonth.toISOString())
        .lt('created_at', endOfPreviousMonth.toISOString());

      // 売上を計算
      const monthlyReservationSales = (monthlyReservations || [])
        .reduce((sum, res) => sum + (res.total_amount || 0), 0);
      
      const previousMonthReservationSales = (previousMonthReservations || [])
        .reduce((sum, res) => sum + (res.total_amount || 0), 0);

      const monthlySubscriptionSales = (activeSubscriptions || 0) * 2980; // 月額2980円
      const previousMonthSubscriptionSales = (previousMonthSubscriptions || 0) * 2980;

      const monthlySales = monthlyReservationSales + monthlySubscriptionSales;
      const previousMonthlySales = previousMonthReservationSales + previousMonthSubscriptionSales;

      // 平均取引額を計算
      const { count: monthlyTransactions } = await supabase
        .from('reservations')
        .select('id', { count: 'exact' })
        .gte('created_at', startOfMonth.toISOString());

      const totalTransactions = (monthlyTransactions || 0) + (activeSubscriptions || 0);
      const averageTransaction = totalTransactions > 0 ? Math.round(monthlySales / totalTransactions) : 0;

      // 手数料収入を計算
      const commissionIncome = Math.round(monthlyReservationSales * 0.2 + monthlySubscriptionSales * 0.1);

      // 純売上を計算
      const netRevenue = monthlySales - commissionIncome;

      // 成長率を計算
      const growthRate = previousMonthlySales > 0 
        ? ((monthlySales - previousMonthlySales) / previousMonthlySales) * 100
        : 0;

      setStats({
        daily_revenue: [],
        top_products: [],
        top_parks: [],
        payment_methods: [
          { method: 'card', count: totalTransactions, total_amount: monthlySales }
        ]
      });

    } catch (err) {
      console.error('Error fetching sales stats:', err);
    }
  };

  const filterAndSortSales = () => {
    let filtered = [...sales];

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(sale =>
        sale.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.park_name && sale.park_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.product_name && sale.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // タイプフィルター
    if (filterType !== 'all') {
      filtered = filtered.filter(sale => sale.transaction_type === filterType);
    }

    // 日付フィルター
    if (filterDate) {
      const filterDateObj = new Date(filterDate);
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.transaction_date);
        return saleDate.toDateString() === filterDateObj.toDateString();
      });
    }

    // ソート
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'transaction_date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredSales(filtered);
  };

  const exportToCSV = () => {
    const headers = ['取引ID', 'タイプ', 'ユーザー名', 'メール', '商品/施設', '金額', '手数料', '純売上', '決済方法', '取引日'];
    const csvData = filteredSales.map(sale => [
      sale.id,
      getTypeLabel(sale.transaction_type),
      sale.user_name,
      sale.user_email,
      sale.park_name || sale.product_name || '-',
      `¥${sale.amount.toLocaleString()}`,
      `${(sale.commission_rate * 100).toFixed(1)}%`,
      `¥${sale.net_amount.toLocaleString()}`,
      sale.payment_method,
      new Date(sale.transaction_date).toLocaleDateString('ja-JP')
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      reservation: 'ドッグラン予約',
      shop_order: 'ショップ注文',
      subscription: 'サブスクリプション'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      reservation: { color: 'bg-blue-100 text-blue-800', icon: MapPin },
      shop_order: { color: 'bg-green-100 text-green-800', icon: ShoppingBag },
      subscription: { color: 'bg-purple-100 text-purple-800', icon: Crown }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.reservation;
    const IconComponent = config.icon;

    return (
      <div className="flex items-center space-x-1">
        <IconComponent className="w-4 h-4" />
        <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
          {getTypeLabel(type)}
        </span>
      </div>
    );
  };

  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalCommission = filteredSales.reduce((sum, sale) => sum + (sale.amount - sale.net_amount), 0);
  const netRevenue = filteredSales.reduce((sum, sale) => sum + sale.net_amount, 0);
  const averageTransaction = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const thisMonthSales = sales.filter(sale => {
    const saleDate = new Date(sale.transaction_date);
    return saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear;
  });
  
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
  const lastMonthSales = sales.filter(sale => {
    const saleDate = new Date(sale.transaction_date);
    return saleDate.getMonth() === lastMonth && saleDate.getFullYear() === lastMonthYear;
  });

  const thisMonthRevenue = thisMonthSales.reduce((sum, sale) => sum + sale.amount, 0);
  const lastMonthRevenue = lastMonthSales.reduce((sum, sale) => sum + sale.amount, 0);
  const growthRate = calculateGrowthRate(thisMonthRevenue, lastMonthRevenue);

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
            <DollarSign className="w-8 h-8 text-orange-600 mr-3" />
            売上管理
          </h1>
          <p className="text-gray-600">売上の詳細分析と収益レポート</p>
        </div>
        <div className="text-sm text-gray-500">
          総取引数: {sales.length}件
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
              <p className="text-sm text-gray-600">今月の売上</p>
              <p className="text-xl font-bold text-orange-600">
                ¥{thisMonthRevenue.toLocaleString()}
              </p>
              <div className="flex items-center mt-1">
                {growthRate >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                )}
                <span className={`text-xs ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(growthRate).toFixed(1)}% vs 前月
                </span>
              </div>
            </div>
            <DollarSign className="w-6 h-6 text-orange-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">平均取引額</p>
              <p className="text-xl font-bold text-blue-600">
                ¥{Math.round(averageTransaction).toLocaleString()}
              </p>
            </div>
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">手数料収入</p>
              <p className="text-xl font-bold text-green-600">
                ¥{totalCommission.toLocaleString()}
              </p>
            </div>
            <PieChart className="w-6 h-6 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">純売上</p>
              <p className="text-xl font-bold text-purple-600">
                ¥{netRevenue.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* 売上タイプ別分析 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center">
            <MapPin className="w-5 h-5 text-blue-600 mr-2" />
            ドッグラン予約
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">取引数:</span>
              <span className="font-medium">
                {sales.filter(s => s.transaction_type === 'reservation').length}件
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">売上:</span>
              <span className="font-medium text-blue-600">
                ¥{sales.filter(s => s.transaction_type === 'reservation')
                  .reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center">
            <ShoppingBag className="w-5 h-5 text-green-600 mr-2" />
            ショップ注文
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">取引数:</span>
              <span className="font-medium">
                {sales.filter(s => s.transaction_type === 'shop_order').length}件
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">売上:</span>
              <span className="font-medium text-green-600">
                ¥{sales.filter(s => s.transaction_type === 'shop_order')
                  .reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center">
            <Crown className="w-5 h-5 text-purple-600 mr-2" />
            サブスクリプション
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">取引数:</span>
              <span className="font-medium">
                {sales.filter(s => s.transaction_type === 'subscription').length}件
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">売上:</span>
              <span className="font-medium text-purple-600">
                ¥{sales.filter(s => s.transaction_type === 'subscription')
                  .reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 検索・フィルター */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <Input
              label="検索"
              placeholder="ユーザー名、メール、商品名、施設名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4 text-gray-500" />}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              取引タイプ
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">すべて</option>
              <option value="reservation">ドッグラン予約</option>
              <option value="shop_order">ショップ注文</option>
              <option value="subscription">サブスクリプション</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              取引日
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="transaction_date-desc">取引日（新しい順）</option>
              <option value="transaction_date-asc">取引日（古い順）</option>
              <option value="amount-desc">金額（高い順）</option>
              <option value="amount-asc">金額（低い順）</option>
              <option value="net_amount-desc">純売上（高い順）</option>
              <option value="net_amount-asc">純売上（低い順）</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-600">
            {filteredSales.length}件の取引が見つかりました
            {filteredSales.length > 0 && (
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

      {/* 売上一覧 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ユーザー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  取引タイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  商品/施設
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  取引日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  手数料・純売上
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  決済方法
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {sale.user_name}
                        </div>
                        {sale.is_subscription_user && (
                          <Crown className="w-4 h-4 text-purple-600 ml-2" />
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {sale.user_email}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(sale.transaction_type)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {sale.park_name || sale.product_name || '-'}
                    </div>
                    {sale.quantity && (
                      <div className="text-sm text-gray-500">
                        数量: {sale.quantity}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sale.transaction_date).toLocaleDateString('ja-JP')}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ¥{sale.amount.toLocaleString()}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1 text-sm">
                      <div className="text-gray-500">
                        手数料: {(sale.commission_rate * 100).toFixed(1)}%
                      </div>
                      <div className="font-medium text-green-600">
                        純売上: ¥{sale.net_amount.toLocaleString()}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sale.payment_method}
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

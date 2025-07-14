import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  ArrowLeft, 
  Search, 
  Calendar, 
  Building,
  Users,
  DollarSign,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { supabase, supabaseAdmin, isAdminClientAvailable } from '../utils/supabase';
import useAuth from '../context/AuthContext';

interface ParkData {
  id: string;
  name: string;
  address: string;
  created_at: string;
  status: 'pending' | 'first_stage_passed' | 'second_stage_review' | 'qr_testing' | 'approved' | 'rejected';
  owner_name: string;
  owner_email: string;
  price: number;
  max_capacity: number;
  average_rating: number;
  review_count: number;
  monthly_revenue: number;
  monthly_reservations: number;
  total_revenue: number;
  facilities: {
    parking: boolean;
    shower: boolean;
    restroom: boolean;
    agility: boolean;
    rest_area: boolean;
    water_station: boolean;
  };
}

export function AdminParkManagement() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [parks, setParks] = useState<ParkData[]>([]);
  const [filteredParks, setFilteredParks] = useState<ParkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'monthly_revenue' | 'average_rating'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!isAdmin) {
      console.warn('❌ 管理者権限がありません。ホームページにリダイレクトします。');
      navigate('/');
      return;
    }
    
    console.log('✅ 管理者権限を確認しました。データ取得を開始します。');
    fetchParks();
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (parks.length > 0) {
      console.log('🔄 パークデータが更新されました。フィルタリングを実行します。');
      filterAndSortParks();
    }
  }, [parks, searchTerm, filterStatus, sortBy, sortOrder]);

  const fetchParks = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('🔍 管理者パーク管理: データ取得開始');
      
      // 管理者クライアントが利用可能かチェック
      const adminClient = supabaseAdmin || supabase;
      if (!supabaseAdmin) {
        console.warn('⚠️ 管理者クライアントが利用できません。通常のクライアントを使用します。');
      }

      // ドッグラン情報を取得
      const { data: parksData, error: parksError } = await adminClient
        .from('dog_parks')
        .select(`
          id,
          name,
          address,
          created_at,
          status,
          owner_id,
          price,
          max_capacity,
          description,
          facilities,
          image_url,
          cover_image_url
        `);

      if (parksError) {
        console.error('❌ Parks error:', parksError);
        throw new Error(`ドッグラン情報の取得に失敗しました: ${parksError.message}`);
      }

      if (!parksData || parksData.length === 0) {
        console.log('ℹ️ パークデータが見つかりません');
        setParks([]);
        return;
      }

      console.log(`✅ ${parksData.length} 件のパークデータを取得しました`);

      // 各ドッグランの詳細データを取得
      const parkPromises = parksData.map(async (park) => {
        try {
          console.log(`🔍 パーク詳細取得中: ${park.name} (ID: ${park.id})`);
          
          // オーナー情報を取得（owner_idが存在する場合のみ）
          let ownerProfile = null;
          if (park.owner_id) {
            try {
              const { data: profileData, error: profileError } = await adminClient
                .from('profiles')
                .select('name, user_type, email')
                .eq('id', park.owner_id)
                .single();
              
              if (profileError) {
                console.warn(`⚠️ プロファイル取得エラー (park: ${park.id}):`, profileError);
              } else {
                ownerProfile = profileData;
              }
            } catch (profileError) {
              console.warn(`⚠️ プロファイル取得例外 (park: ${park.id}):`, profileError);
            }
          }

          // 予約数を取得（今月）
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          let reservationCount = 0;
          let monthlyRevenue = 0;
          let totalRevenue = 0;
          
          try {
            const { count } = await adminClient
              .from('reservations')
              .select('id', { count: 'exact' })
              .eq('park_id', park.id)
              .gte('created_at', startOfMonth.toISOString());
            
            reservationCount = count || 0;

            // 売上を取得（今月）
            const { data: reservationRevenue } = await adminClient
              .from('reservations')
              .select('total_amount')
              .eq('park_id', park.id)
              .gte('created_at', startOfMonth.toISOString())
              .not('total_amount', 'is', null);

            monthlyRevenue = (reservationRevenue || []).reduce(
              (sum, res) => sum + (res.total_amount || 0), 0
            );

            // 総売上を取得
            const { data: totalRevenueData } = await adminClient
              .from('reservations')
              .select('total_amount')
              .eq('park_id', park.id)
              .not('total_amount', 'is', null);

            totalRevenue = (totalRevenueData || []).reduce(
              (sum, res) => sum + (res.total_amount || 0), 0
            );
          } catch (reservationError) {
            console.warn(`⚠️ 予約データ取得エラー (park: ${park.id}):`, reservationError);
          }

          // レビュー情報を取得
          let reviewCount = 0;
          let averageRating = 0;
          
          try {
            const { data: reviewsData } = await adminClient
              .from('dog_park_reviews')
              .select('rating')
              .eq('park_id', park.id);

            reviewCount = reviewsData?.length || 0;
            averageRating = reviewCount > 0 
              ? (reviewsData || []).reduce((sum, review) => sum + review.rating, 0) / reviewCount
              : 0;
          } catch (reviewError) {
            console.warn(`⚠️ レビューデータ取得エラー (park: ${park.id}):`, reviewError);
          }

          // 結果を構築
          const parkResult: ParkData = {
            id: park.id,
            name: park.name,
            address: park.address,
            created_at: park.created_at,
            status: park.status,
            owner_name: ownerProfile?.name || 'Unknown',
            owner_email: ownerProfile?.email || `owner_${park.owner_id?.slice(0, 8) || 'unknown'}@example.com`,
            price: park.price || 0,
            max_capacity: park.max_capacity || 0,
            average_rating: parseFloat(averageRating.toFixed(1)),
            review_count: reviewCount,
            monthly_revenue: monthlyRevenue,
            monthly_reservations: reservationCount,
            total_revenue: totalRevenue,
            facilities: park.facilities || {
              parking: false,
              shower: false,
              restroom: false,
              agility: false,
              rest_area: false,
              water_station: false
            }
          };

          console.log(`✅ パーク詳細取得完了: ${park.name}`);
          return parkResult;
        } catch (err) {
          console.error(`❌ パーク詳細取得エラー (park: ${park.id}):`, err);
          
          // エラーが発生した場合でも基本的な情報だけ返す
          return {
            id: park.id,
            name: park.name || 'Unknown Park',
            address: park.address || 'Unknown Address',
            created_at: park.created_at,
            status: park.status || 'pending',
            owner_name: 'Unknown',
            owner_email: `owner_${park.owner_id?.slice(0, 8) || 'unknown'}@example.com`,
            price: park.price || 0,
            max_capacity: park.max_capacity || 0,
            average_rating: 0,
            review_count: 0,
            monthly_revenue: 0,
            monthly_reservations: 0,
            total_revenue: 0,
            facilities: {
              parking: false,
              shower: false,
              restroom: false,
              agility: false,
              rest_area: false,
              water_station: false
            }
          } as ParkData;
        }
      });

      console.log('🔄 全パークの詳細データを並列取得中...');
      const parksWithDetails = await Promise.all(parkPromises);
      
      console.log(`✅ ${parksWithDetails.length} 件のパーク詳細データを取得完了`);
      setParks(parksWithDetails);
    } catch (err) {
      console.error('❌ パーク取得エラー:', err);
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(`ドッグランデータの取得に失敗しました: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortParks = () => {
    let filtered = [...parks];

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(park =>
        park.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        park.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        park.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ステータスフィルター
    switch (filterStatus) {
      case 'pending':
        filtered = filtered.filter(park => 
          ['pending', 'first_stage_passed', 'second_stage_review', 'qr_testing'].includes(park.status)
        );
        break;
      case 'approved':
        filtered = filtered.filter(park => park.status === 'approved');
        break;
      case 'rejected':
        filtered = filtered.filter(park => park.status === 'rejected');
        break;
    }

    // ソート
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredParks(filtered);
  };

  const exportToCSV = () => {
    const headers = ['施設名', '住所', 'オーナー', 'ステータス', '登録日', '料金', '定員', '評価', '月間売上', '月間予約数'];
    const csvData = filteredParks.map(park => [
      park.name,
      park.address,
      park.owner_name,
      getStatusLabel(park.status),
      new Date(park.created_at).toLocaleDateString('ja-JP'),
      `¥${park.price.toLocaleString()}`,
      `${park.max_capacity}人`,
      `${park.average_rating.toFixed(1)} (${park.review_count}件)`,
      `¥${park.monthly_revenue.toLocaleString()}`,
      `${park.monthly_reservations}件`
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `parks_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: '第一審査待ち',
      first_stage_passed: '第二審査準備中',
      second_stage_review: '第二審査中',
      qr_testing: 'QR実証検査中',
      approved: '承認済み',
      rejected: '却下'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      first_stage_passed: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      second_stage_review: { color: 'bg-purple-100 text-purple-800', icon: Clock },
      qr_testing: { color: 'bg-orange-100 text-orange-800', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
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

  const getFacilityBadges = (facilities: ParkData['facilities']) => {
    const facilityLabels = {
      parking: '駐車場',
      shower: 'シャワー',
      restroom: 'トイレ',
      agility: 'アジリティ',
      rest_area: '休憩所',
      water_station: '給水所'
    };

    const availableFacilities = Object.entries(facilities)
      .filter(([_, available]) => available)
      .map(([key, _]) => facilityLabels[key as keyof typeof facilityLabels]);

    return availableFacilities.slice(0, 3).join(', ') + 
           (availableFacilities.length > 3 ? ` +${availableFacilities.length - 3}` : '');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">🔄 ドッグランデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-2" />
            <h3 className="text-red-800 font-medium">エラーが発生しました</h3>
          </div>
          <p className="text-red-700 mt-2">{error}</p>
          <div className="mt-4 space-x-2">
            <Button 
              onClick={() => fetchParks()}
              size="sm"
              className="bg-red-600 hover:bg-red-700"
            >
              🔄 再試行
            </Button>
            <Button 
              onClick={() => navigate('/admin')}
              size="sm"
              variant="secondary"
            >
              ← 管理者ダッシュボードに戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = parks.reduce((sum, park) => sum + park.monthly_revenue, 0);
  const averageRating = parks.length > 0 
    ? parks.reduce((sum, park) => sum + park.average_rating, 0) / parks.length 
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
            <MapPin className="w-8 h-8 text-green-600 mr-3" />
            ドッグラン管理
          </h1>
          <p className="text-gray-600">ドッグラン施設の詳細情報と管理</p>
        </div>
        <div className="text-sm text-gray-500">
          総施設数: {parks.length}施設
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
              <p className="text-sm text-gray-600">総施設数</p>
              <p className="text-xl font-bold text-green-600">{parks.length}</p>
            </div>
            <Building className="w-6 h-6 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">承認済み</p>
              <p className="text-xl font-bold text-blue-600">
                {parks.filter(p => p.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">平均評価</p>
              <p className="text-xl font-bold text-yellow-600">
                {averageRating.toFixed(1)}
              </p>
            </div>
            <Star className="w-6 h-6 text-yellow-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">月間総売上</p>
              <p className="text-xl font-bold text-orange-600">
                ¥{totalRevenue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-6 h-6 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* 検索・フィルター */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              label="検索"
              placeholder="施設名、住所、オーナー名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4 text-gray-500" />}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">すべて</option>
              <option value="pending">審査中</option>
              <option value="approved">承認済み</option>
              <option value="rejected">却下</option>
            </select>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="created_at-desc">登録日（新しい順）</option>
              <option value="created_at-asc">登録日（古い順）</option>
              <option value="name-asc">施設名（昇順）</option>
              <option value="name-desc">施設名（降順）</option>
              <option value="monthly_revenue-desc">売上（高い順）</option>
              <option value="monthly_revenue-asc">売上（低い順）</option>
              <option value="average_rating-desc">評価（高い順）</option>
              <option value="average_rating-asc">評価（低い順）</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-600">
            {filteredParks.length}件の施設が見つかりました
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

      {/* ドッグラン一覧 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  施設情報
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  オーナー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  登録日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  料金・定員
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  評価・売上
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredParks.map((park) => (
                <tr key={park.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {park.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {park.address}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        設備: {getFacilityBadges(park.facilities)}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {park.owner_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {park.owner_email}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(park.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(park.status)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1 text-sm">
                      <div className="text-gray-900">
                        ¥{park.price.toLocaleString()}/日
                      </div>
                      <div className="text-gray-500">
                        定員: {park.max_capacity}人
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center text-gray-900">
                        <Star className="w-4 h-4 mr-1 text-yellow-400 fill-current" />
                        {park.average_rating.toFixed(1)} ({park.review_count}件)
                      </div>
                      <div className="text-gray-500">
                        売上: ¥{park.monthly_revenue.toLocaleString()}/月
                      </div>
                      <div className="text-gray-500">
                        予約: {park.monthly_reservations}件/月
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/parks/${park.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/admin/parks/${park.id}/analytics`)}
                      >
                        <TrendingUp className="w-4 h-4" />
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
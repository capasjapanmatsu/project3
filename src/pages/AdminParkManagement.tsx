import {
    AlertTriangle,
    Building,
    Calendar,
    Check,
    DollarSign,
    Eye,
    FileText,
    MapPin,
    Search,
    SortAsc,
    SortDesc,
    Star,
    User,
    Users,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminParkApproval } from '../components/admin/AdminParkApproval';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import useAuth from '../context/AuthContext';
import { useAdminData } from '../hooks/useAdminData';
import { supabase } from '../utils/supabase';

// Park data interface
interface ParkData {
  id: string;
  name: string;
  description: string;
  address: string;
  price: number;
  status: 'pending' | 'approved' | 'rejected' | 'first_stage_passed' | 'second_stage_review';
  owner_id: string;
  owner_name: string;
  owner_email: string;
  owner_phone?: string;
  created_at: string;
  max_capacity: number;
  large_dog_area: boolean;
  small_dog_area: boolean;
  private_booths: boolean;
  facilities: {
    parking: boolean;
    shower: boolean;
    restroom: boolean;
    agility: boolean;
    rest_area: boolean;
    water_station: boolean;
  };
  monthly_revenue?: number;
  average_rating?: number;
  review_count?: number;
  facility_details?: string;
  business_license?: string;
  identity_verification?: string;
  private_booth_count?: number;
}

export function AdminParkManagement() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'parks' | 'applications'>('parks');
  const [parks, setParks] = useState<ParkData[]>([]);
  const [filteredParks, setFilteredParks] = useState<ParkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'first_stage_passed' | 'second_stage_review'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'monthly_revenue' | 'average_rating'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ドッグラン申請データ用のカスタムフック
  const adminData = useAdminData('parks');

  // メッセージ管理
  const showSuccess = (message: string) => {
    setSuccess(message);
    setError('');
    setTimeout(() => setSuccess(''), 5000);
  };

  const showError = (message: string) => {
    setError(message);
    setSuccess('');
    setTimeout(() => setError(''), 8000);
  };

  useEffect(() => {
    if (!isAdmin) {
      console.warn('❌ 管理者権限がありません。ホームページにリダイレクトします。');
      navigate('/');
      return;
    }
    
    console.log('✅ 管理者権限を確認しました。データ取得を開始します。');
    if (activeTab === 'parks') {
      fetchParks();
    }
  }, [isAdmin, navigate, activeTab]);

  useEffect(() => {
    if (parks.length > 0) {
      console.log('🔄 パークデータが更新されました。フィルタリングを実行します。');
      filterAndSortParks();
    }
  }, [parks, searchTerm, filterStatus, sortBy, sortOrder]);

  const fetchParks = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('📡 ドッグラン一覧を取得中...');
      
      // 実際のSupabaseクエリでdog_parksテーブルからデータを取得
      const { data: parksData, error: parksError } = await supabase
        .from('dog_parks')
        .select(`
          *,
          owner:profiles (
            id,
            name,
            email,
            phone_number
          )
        `)
        .order('created_at', { ascending: false });

      if (parksError) throw parksError;

      // データを整形
      const formattedParks: ParkData[] = (parksData || []).map((park: any) => ({
        id: park.id,
        name: park.name || '不明',
        description: park.description || '',
        address: park.address || '不明',
        price: park.price || 0,
        status: park.status || 'pending',
        owner_id: park.owner_id,
        owner_name: park.owner?.name || '不明',
        owner_email: park.owner?.email || '不明',
        owner_phone: park.owner?.phone_number || '',
        created_at: park.created_at,
        max_capacity: park.max_capacity || 0,
        large_dog_area: park.large_dog_area || false,
        small_dog_area: park.small_dog_area || false,
        private_booths: park.private_booths || false,
        facilities: park.facilities || {
          parking: false,
          shower: false,
          restroom: false,
          agility: false,
          rest_area: false,
          water_station: false
        },
        monthly_revenue: park.monthly_revenue || 0,
        average_rating: park.average_rating || 0,
        review_count: park.review_count || 0,
        facility_details: park.facility_details || '',
        business_license: park.business_license || '',
        identity_verification: park.identity_verification || '',
        private_booth_count: park.private_booth_count || 0
      }));
      
      console.log('✅ ドッグラン一覧を取得しました:', formattedParks.length, '件');
      setParks(formattedParks);
      
    } catch (err) {
      console.error('❌ ドッグラン一覧の取得に失敗しました:', err);
      showError('ドッグラン一覧の取得に失敗しました。');
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
    if (filterStatus !== 'all') {
      filtered = filtered.filter(park => park.status === filterStatus);
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

  const handleApprove = async (parkId: string) => {
    try {
      console.log('✅ ドッグランを承認中:', parkId);
      
      // 実際のSupabaseクエリでデータベースを更新
      const { error: updateError } = await supabase
        .from('dog_parks')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', parkId);

      if (updateError) throw updateError;

      // 通知を送信
      const park = parks.find(p => p.id === parkId);
      if (park) {
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert([{
            user_id: park.owner_id,
            type: 'park_approval',
            title: 'ドッグラン申請が承認されました',
            message: `${park.name}の申請が承認されました。おめでとうございます！`,
            data: { park_id: parkId }
          }]);

        if (notifyError) console.error('通知送信エラー:', notifyError);
      }
      
      // ローカル状態を更新
      setParks(prev => prev.map(park => 
        park.id === parkId 
          ? { ...park, status: 'approved' as const }
          : park
      ));
      
      showSuccess('ドッグランを承認しました');
      
    } catch (err) {
      console.error('❌ ドッグランの承認に失敗しました:', err);
      showError('ドッグランの承認に失敗しました');
    }
  };

  const handleReject = async (parkId: string) => {
    try {
      console.log('❌ ドッグランを却下中:', parkId);
      
      // 実際のSupabaseクエリでデータベースを更新
      const { error: updateError } = await supabase
        .from('dog_parks')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', parkId);

      if (updateError) throw updateError;

      // 通知を送信
      const park = parks.find(p => p.id === parkId);
      if (park) {
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert([{
            user_id: park.owner_id,
            type: 'park_rejection',
            title: 'ドッグラン申請について',
            message: `${park.name}の申請が却下されました。詳細については管理者までお問い合わせください。`,
            data: { park_id: parkId }
          }]);

        if (notifyError) console.error('通知送信エラー:', notifyError);
      }
      
      // ローカル状態を更新
      setParks(prev => prev.map(park => 
        park.id === parkId 
          ? { ...park, status: 'rejected' as const }
          : park
      ));
      
      showSuccess('ドッグランを却下しました');
      
    } catch (err) {
      console.error('❌ ドッグランの却下に失敗しました:', err);
      showError('ドッグランの却下に失敗しました');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'first_stage_passed': return 'bg-blue-100 text-blue-800';
      case 'second_stage_review': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return '承認済み';
      case 'pending': return '審査中';
      case 'rejected': return '却下';
      case 'first_stage_passed': return '1次審査通過';
      case 'second_stage_review': return '2次審査中';
      default: return '不明';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`;
  };

  // ロード中表示
  if (isLoading && activeTab === 'parks') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">ドッグラン管理</h1>
              <p className="text-gray-600">ドッグラン施設の詳細情報と申請管理</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">総施設数: {parks.length}施設</p>
            </div>
          </div>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('parks')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'parks'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Building className="w-5 h-5 inline mr-2" />
                ドッグラン一覧
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'applications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-5 h-5 inline mr-2" />
                ドッグラン申請
                {adminData.pendingParks.length > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {adminData.pendingParks.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* コンテンツ */}
        {activeTab === 'parks' && (
          <div className="space-y-6">
            
            {/* 検索・フィルター */}
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    label=""
                    placeholder="施設名、住所、オーナー名で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select
                  label=""
                  options={[
                    { value: 'all', label: '全ステータス' },
                    { value: 'pending', label: '審査中' },
                    { value: 'first_stage_passed', label: '1次審査通過' },
                    { value: 'second_stage_review', label: '2次審査中' },
                    { value: 'approved', label: '承認済み' },
                    { value: 'rejected', label: '却下' }
                  ]}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                />
                
                <Select
                  label=""
                  options={[
                    { value: 'created_at', label: '作成日時' },
                    { value: 'name', label: '施設名' },
                    { value: 'monthly_revenue', label: '月間収益' },
                    { value: 'average_rating', label: '平均評価' }
                  ]}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                />
                
                <Button
                  variant="secondary"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center justify-center"
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
                  {sortOrder === 'asc' ? '昇順' : '降順'}
                </Button>
              </div>
            </Card>

            {/* パーク一覧 */}
            {filteredParks.length === 0 ? (
              <Card className="text-center py-12">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm || filterStatus !== 'all' 
                    ? '条件に一致するドッグランが見つかりません' 
                    : 'ドッグランが登録されていません'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredParks.map((park) => (
                  <Card key={park.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">{park.name}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(park.status)}`}>
                            {getStatusLabel(park.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <MapPin className="w-4 h-4 mr-1" />
                              {park.address}
                            </div>
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <DollarSign className="w-4 h-4 mr-1" />
                              {formatPrice(park.price)}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(park.created_at)}
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <User className="w-4 h-4 mr-1" />
                              {park.owner_name}
                            </div>
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <Users className="w-4 h-4 mr-1" />
                              定員: {park.max_capacity}頭
                            </div>
                            {park.average_rating && park.average_rating > 0 && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Star className="w-4 h-4 mr-1" />
                                {park.average_rating.toFixed(1)} ({park.review_count || 0}件)
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {park.description && (
                          <p className="text-sm text-gray-600 mb-3">{park.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          {park.large_dog_area && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">大型犬エリア</span>
                          )}
                          {park.small_dog_area && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">小型犬エリア</span>
                          )}
                          {park.private_booths && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">個室あり</span>
                          )}
                          {park.facilities.parking && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">駐車場</span>
                          )}
                          {park.facilities.shower && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">シャワー</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/admin/parks/${park.id}`}
                          className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          詳細
                        </Link>
                        {park.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(park.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              承認
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleReject(park.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4 mr-1" />
                              却下
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <AdminParkApproval
            pendingParks={adminData.pendingParks}
            isLoading={adminData.isLoading}
            onApprovalComplete={showSuccess}
            onError={showError}
          />
        )}
      </div>
    </div>
  );
} 
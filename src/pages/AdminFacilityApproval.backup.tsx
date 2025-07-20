import { createClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  Building,
  Calendar,
  Check,
  Eye,
  FileText,
  Globe,
  MapPin,
  Phone,
  Search,
  SortAsc,
  SortDesc,
  Trash2,
  User,
  X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import useAuth from '../context/AuthContext';

// 環境変数から設定を読み込み
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// クライアント初期化
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface FacilityApplication {
  id: string;
  name: string;
  category_id: string;
  address: string;
  phone?: string;
  website?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  category_name?: string;
}

const CATEGORY_NAMES: { [key: string]: string } = {
  pet_hotel: 'ペットホテル',
  pet_salon: 'ペットサロン',
  veterinary: '動物病院',
  pet_cafe: 'ペットカフェ',
  pet_restaurant: 'ペット同伴レストラン',
  pet_shop: 'ペットショップ',
  pet_accommodation: 'ペット同伴宿泊'
};

export default function AdminFacilityApproval() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'applications' | 'facilities'>('applications');
  const [applications, setApplications] = useState<FacilityApplication[]>([]);
  const [approvedFacilities, setApprovedFacilities] = useState<FacilityApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<FacilityApplication[]>([]);
  const [filteredFacilities, setFilteredFacilities] = useState<FacilityApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<FacilityApplication | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  console.log('AdminFacilityApproval コンポーネント読み込み');

  // フィルタリング・ソート用のstate
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'category_id'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {    
    if (!isAdmin) {
      console.log('管理者権限なし - リダイレクト');
      navigate('/');
      return;
    }

    console.log('管理者権限確認完了 - データフェッチ開始');
    fetchApplications();
  }, [isAdmin, navigate, user]);

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

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      setError('');

      // 申請中の施設を取得（AdminDashboardと同じ方法）
      const { data: pendingData, error: pendingError } = await supabase
        .from('pet_facilities')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error('申請中データ取得エラー:', pendingError);
        throw pendingError;
      }

      // 承認済みの施設を取得
      const { data: approvedData, error: approvedError } = await supabase
        .from('pet_facilities')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (approvedError) {
        console.error('承認済みデータ取得エラー:', approvedError);
        throw approvedError;
      }

      // データを整形
      const formatFacilities = (data: any[]): FacilityApplication[] => {
        if (!data || !Array.isArray(data)) return [];
        
        return data.map((facility: any) => ({
          id: facility.id,
          name: facility.name,
          category_id: facility.category_id,
          address: facility.address,
          phone: facility.phone,
          website: facility.website,
          description: facility.description,
          status: facility.status,
          created_at: facility.created_at,
          owner_id: facility.owner_id,
          owner_name: '取得中...', 
          owner_email: '取得中...',
          category_name: CATEGORY_NAMES[facility.category_id] || facility.category_id,
        }));
      };

      const pendingApplications = formatFacilities(pendingData || []);
      const approvedApplications = formatFacilities(approvedData || []);

      console.log('施設データ取得完了:', {
        申請中: pendingApplications.length,
        承認済み: approvedApplications.length
      });

      // 状態更新
      setApplications(pendingApplications);
      setApprovedFacilities(approvedApplications);
      setFilteredApplications(pendingApplications);
      setFilteredFacilities(approvedApplications);

    } catch (err) {
      console.error('データフェッチエラー:', err);
      const errorMessage = err instanceof Error ? err.message : '申請データの取得に失敗しました';
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (applicationId: string, approved: boolean) => {
    try {
      setProcessingId(applicationId);
      setError('');

      const { error: updateError } = await supabase
        .from('pet_facilities')
        .update({
          status: approved ? 'approved' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) {
        throw updateError;
      }

      showSuccess(`施設申請を${approved ? '承認' : '拒否'}しました`);
      setSelectedApplication(null);

      // データを再取得
      await fetchApplications();

    } catch (err) {
      console.error('Error updating application:', err);
      showError(err instanceof Error ? err.message : '申請の処理に失敗しました');
    } finally {
      setProcessingId(null);
    }
  };

  // 削除機能
  const handleDelete = async (facilityId: string, facilityName: string) => {
    
    const confirmDelete = window.confirm(
      `「${facilityName}」を完全に削除してもよろしいですか？\n\n` +
      'この操作は取り消せません。関連する以下のデータも削除されます：\n' +
      '• 施設画像\n' +
      '• 関連通知\n' +
      '• その他の関連データ'
    );
    
    if (!confirmDelete) {
      return;
    }


    try {
      setDeletingId(facilityId);
      setError('');
      setSuccess('');

        facilityId, 
        facilityName, 
        supabaseUrl: supabaseUrl.substring(0, 20) + '...', 
        userRole: isAdmin ? 'admin' : 'user' 
      });

      // まず施設が存在するか確認
      const { data: existingFacility, error: checkError } = await supabase
        .from('pet_facilities')
        .select('id, name, owner_id')
        .eq('id', facilityId)
        .single();

      if (checkError) {
        console.error('❌ 施設存在確認エラー:', checkError);
        throw new Error(`施設の確認に失敗しました: ${checkError.message}`);
      }

      if (!existingFacility) {
        console.error('❌ 施設が見つかりません:', facilityId);
        throw new Error('指定された施設が見つかりません');
      }


      // 1. 関連する施設画像を削除（テーブルが存在する場合）
      try {
        const { data: imageData, error: imagesError } = await supabase
          .from('facility_images')
          .delete()
          .eq('facility_id', facilityId)
          .select();

        if (imagesError && imagesError.code !== '42P01') { // テーブルが存在しない場合のエラーコードを除外
          console.error('❌ 施設画像削除エラー:', imagesError);
          console.warn('⚠️ 画像削除エラーですが処理を続行します');
        } else {
        }
      } catch (error) {
        console.warn('⚠️ 施設画像削除処理をスキップ:', error);
      }

      // 2. メイン施設データを削除
      const { data: deletedData, error: facilityError } = await supabase
        .from('pet_facilities')
        .delete()
        .eq('id', facilityId)
        .select();

      if (facilityError) {
        console.error('❌ 施設削除エラー:', {
          error: facilityError,
          code: facilityError.code,
          message: facilityError.message,
          details: facilityError.details,
          hint: facilityError.hint
        });
        throw new Error(`施設の削除に失敗しました: ${facilityError.message}`);
      }

      
      if (!deletedData || deletedData.length === 0) {
        console.warn('⚠️ 削除されたデータが返されませんでした');
        // 削除確認のため再度検索
        const { data: checkDeleted, error: verifyError } = await supabase
          .from('pet_facilities')
          .select('id')
          .eq('id', facilityId);
          
        if (verifyError) {
          console.error('❌ 削除確認エラー:', verifyError);
        } else if (checkDeleted && checkDeleted.length > 0) {
          console.error('❌ 削除に失敗: 施設がまだ存在します');
          throw new Error('削除に失敗しました。施設がまだ存在しています。');
        } else {
        }
      }

      showSuccess(`施設「${facilityName}」を削除しました`);
      
      // モーダルを閉じる
      setSelectedApplication(null);
      
      // データを再取得
      await fetchApplications();

    } catch (error) {
      console.error('❌ 削除処理エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '施設の削除に失敗しました';
      showError(`削除エラー: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  // タブ切り替え時にフィルターをリセット
  useEffect(() => {
    if (activeTab === 'applications') {
      setFilterStatus('all'); // 申請タブでは全ステータス表示
    } else {
      setFilterStatus('all'); // 施設一覧タブでも全ステータス表示
    }
  }, [activeTab]);

  // フィルタリング・ソート機能
  const applyFiltersAndSort = useCallback((data: FacilityApplication[]): FacilityApplication[] => {
    let filtered = data.filter(facility => {
      const matchesSearch = !searchTerm ||
        facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.category_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || facility.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    // ソート機能
    filtered = filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'category_id':
          aValue = a.category_name || '';
          bValue = b.category_name || '';
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [searchTerm, filterStatus, sortBy, sortOrder]);

  // フィルタリング更新
  useEffect(() => {
    if (activeTab === 'applications') {
      setFilteredApplications(applyFiltersAndSort(applications));
    } else {
      setFilteredFacilities(applyFiltersAndSort(approvedFacilities));
    }
  }, [searchTerm, filterStatus, sortBy, sortOrder, applications, approvedFacilities, activeTab]);

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ステータス色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '承認待ち';
      case 'approved': return '承認済み';
      case 'rejected': return '却下';
      default: return '不明';
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="p-6">
          <div className="flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mr-4" />
            <div>
              <h2 className="text-xl font-semibold text-red-700">アクセス権限がありません</h2>
              <p className="text-red-600">このページは管理者のみアクセス可能です。</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">申請データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">ペット関連施設管理</h1>
            <p className="text-gray-600">登録されたペット関連施設の承認・管理を行います</p>
          </div>

          {/* エラー・成功メッセージ */}
          {error && (
            <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="px-6 py-4 bg-green-50 border-l-4 border-green-400">
              <div className="flex">
                <Check className="h-5 w-5 text-green-400 mr-2" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

          {/* タブナビゲーション */}
          <div className="px-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('applications')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'applications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-5 h-5 inline mr-2" />
                施設申請
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {applications.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('facilities')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'facilities'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Building className="w-5 h-5 inline mr-2" />
                施設一覧
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {approvedFacilities.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* コンテンツ */}
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
                  ...(activeTab === 'applications' 
                    ? [{ value: 'pending', label: '承認待ち' }]
                    : [{ value: 'approved', label: '承認済み' }]
                  )
                ]}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              />

              <Select
                label=""
                options={[
                  { value: 'created_at', label: '作成日時' },
                  { value: 'name', label: '施設名' },
                  { value: 'category_id', label: 'カテゴリ' }
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

          {/* 申請中施設一覧 */}
          {activeTab === 'applications' && (
            <>
              {filteredApplications.length === 0 ? (
                <Card className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchTerm || filterStatus !== 'all'
                      ? '条件に一致する申請が見つかりません'
                      : '承認待ちの申請がありません'}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {filteredApplications.map((application) => (
                    <Card key={application.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">{application.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)}`}>
                              {getStatusLabel(application.status)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">申請者情報</h4>
                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <User className="w-4 h-4 mr-2" />
                                  {application.owner_name}
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  申請日: {formatDate(application.created_at)}
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">施設情報</h4>
                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Building className="w-4 h-4 mr-2" />
                                  {application.category_name}
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  {application.address}
                                </div>
                                {application.phone && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Phone className="w-4 h-4 mr-2" />
                                    {application.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {application.description && (
                            <div className="mb-4">
                              <h4 className="font-medium text-gray-900 mb-2">施設説明</h4>
                              <p className="text-sm text-gray-600 line-clamp-2">{application.description}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedApplication(application)}
                            className="flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            詳細確認
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleDelete(application.id, application.name)}
                            disabled={deletingId === application.id}
                            className="flex items-center bg-red-100 hover:bg-red-200 text-red-800 border-red-200"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {deletingId === application.id ? '削除中...' : '削除'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 承認済み施設一覧 */}
          {activeTab === 'facilities' && (
            <>
              {filteredFacilities.length === 0 ? (
                <Card className="text-center py-12">
                  <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchTerm || filterStatus !== 'all'
                      ? '条件に一致する施設が見つかりません'
                      : '承認済みの施設がありません'}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {filteredFacilities.map((facility) => (
                    <Card key={facility.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">{facility.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(facility.status)}`}>
                              {getStatusLabel(facility.status)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <div className="flex items-center text-sm text-gray-600 mb-1">
                                <Building className="w-4 h-4 mr-1" />
                                {facility.category_name}
                              </div>
                              <div className="flex items-center text-sm text-gray-600 mb-1">
                                <MapPin className="w-4 h-4 mr-1" />
                                {facility.address}
                              </div>
                              {facility.phone && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="w-4 h-4 mr-1" />
                                  {facility.phone}
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center text-sm text-gray-600 mb-1">
                                <User className="w-4 h-4 mr-1" />
                                {facility.owner_name}
                              </div>
                              <div className="flex items-center text-sm text-gray-600 mb-1">
                                <Calendar className="w-4 h-4 mr-1" />
                                {formatDate(facility.created_at)}
                              </div>
                              {facility.website && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Globe className="w-4 h-4 mr-1" />
                                  <a href={facility.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                                    ウェブサイト
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          {facility.description && (
                            <div className="mb-4">
                              <p className="text-sm text-gray-600 line-clamp-2">{facility.description}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedApplication(facility)}
                            className="flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            詳細確認
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleDelete(facility.id, facility.name)}
                            disabled={deletingId === facility.id}
                            className="flex items-center bg-red-100 hover:bg-red-200 text-red-800 border-red-200"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {deletingId === facility.id ? '削除中...' : '削除'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 詳細モーダル */}
        {selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedApplication.name}
                </h2>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* 基本情報 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">基本情報</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        施設名
                      </label>
                      <p className="text-gray-900">{selectedApplication.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        カテゴリ
                      </label>
                      <p className="text-gray-900">{selectedApplication.category_name}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        住所
                      </label>
                      <p className="text-gray-900">{selectedApplication.address}</p>
                    </div>
                    {selectedApplication.phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          電話番号
                        </label>
                        <p className="text-gray-900">{selectedApplication.phone}</p>
                      </div>
                    )}
                    {selectedApplication.website && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ウェブサイト
                        </label>
                        <a
                          href={selectedApplication.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {selectedApplication.website}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {selectedApplication.description && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        施設の説明
                      </label>
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {selectedApplication.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* 申請者情報 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">申請者情報</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        申請者名
                      </label>
                      <p className="text-gray-900">{selectedApplication.owner_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        メールアドレス
                      </label>
                      <p className="text-gray-900">{selectedApplication.owner_email || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        申請日時
                      </label>
                      <p className="text-gray-900">
                        {formatDate(selectedApplication.created_at)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ステータス
                      </label>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedApplication.status)}`}>
                        {getStatusLabel(selectedApplication.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 操作ボタン */}
                <div className="flex space-x-4 pt-6 border-t">
                  {/* 削除ボタン（常に表示） */}
                  <Button
                    onClick={() => void handleDelete(selectedApplication.id, selectedApplication.name)}
                    disabled={deletingId === selectedApplication.id}
                    variant="secondary"
                    className="bg-red-100 hover:bg-red-200 text-red-800 border-red-200"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deletingId === selectedApplication.id ? '削除中...' : '削除'}
                  </Button>

                  {/* 承認・拒否ボタン（申請中の場合のみ） */}
                  {selectedApplication.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => void handleApproval(selectedApplication.id, false)}
                        disabled={processingId === selectedApplication.id}
                        variant="secondary"
                        className="bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-200"
                      >
                        <X className="w-4 h-4 mr-2" />
                        {processingId === selectedApplication.id ? '処理中...' : '拒否'}
                      </Button>
                      <Button
                        onClick={() => void handleApproval(selectedApplication.id, true)}
                        disabled={processingId === selectedApplication.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {processingId === selectedApplication.id ? '処理中...' : '承認'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Trash2, Phone, MapPin, Clock,
  Building, Calendar, Check, FileText, Globe, SortAsc, SortDesc,
  X, AlertTriangle
} from 'lucide-react';
import Layout from '../components/Layout';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

// 簡単なログ関数
const log = (message: string, ...args: unknown[]) => {
  console.log(`[AdminFacilityApproval] ${message}`, ...args);
};
const CATEGORY_NAMES: Record<string, string> = {
  'dog_park': 'ドッグパーク',
  'veterinary': '動物病院',
  'pet_hotel': 'ペットホテル',
  'pet_shop': 'ペットショップ',
  'grooming': 'トリミングサロン',
  'pet_cafe': 'ペットカフェ',
  'training': 'ドッグトレーニング',
  'other': 'その他'
};

// 型定義
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
  category_name?: string;
}

interface DatabaseFacility {
  id: string;
  name: string;
  category_id: string;
  address: string;
  phone?: string;
  website?: string;
  description?: string;
  status: string;
  created_at: string;
  owner_id: string;
}

const AdminFacilityApproval: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [applications, setApplications] = useState<FacilityApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'category'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 管理者権限チェックとリダイレクト
  useEffect(() => {
    log('AdminFacilityApproval コンポーネント読み込み');
    
    if (!user) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      log('管理者権限なし - リダイレクト');
      navigate('/');
      return;
    }

    log('管理者権限確認完了 - データフェッチ開始');
    void fetchApplications();
  }, [isAdmin, navigate, user, fetchApplications]);

  // 施設申請データの取得
  const fetchApplications = useCallback(async () => {
    if (!user || !isAdmin) {
      return;
    }

    setLoading(true);
    try {
      log('🔍 施設データ取得開始');

      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false }) as { data: DatabaseFacility[] | null; error: any };

      if (facilitiesError) {
        log('❌ 施設データ取得エラー:', facilitiesError);
        throw facilitiesError;
      }

      log('📋 取得した施設データ:', {
        total: facilitiesData?.length || 0,
        sample: facilitiesData?.slice(0, 3) || []
      });

      if (!facilitiesData) {
        log('⚠️ 施設データが空です');
        setApplications([]);
        setLoading(false);
        return;
      }

      // データの型変換とフォーマット
      const formatFacilities = (data: DatabaseFacility[]): FacilityApplication[] => {
        log('🔄 施設データフォーマット開始');
        
        return data.map((facility: DatabaseFacility) => ({
          id: facility.id,
          name: facility.name,
          category_id: facility.category_id,
          address: facility.address,
          phone: facility.phone,
          website: facility.website,
          description: facility.description,
          status: facility.status as 'pending' | 'approved' | 'rejected',
          created_at: facility.created_at,
          owner_id: facility.owner_id,
          // カテゴリー名の変換
          category_name: CATEGORY_NAMES[facility.category_id] || facility.category_id,
        }));
      };

      const formattedData = formatFacilities(facilitiesData);
      
      log('施設データ取得完了:', {
        total: formattedData.length,
        pending: formattedData.filter(f => f.status === 'pending').length,
        approved: formattedData.filter(f => f.status === 'approved').length,
        rejected: formattedData.filter(f => f.status === 'rejected').length
      });

      setApplications(formattedData);
    } catch (error) {
      log('❌ 施設データ取得でエラーが発生:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  // ステータス更新関数
  const updateApplicationStatus = useCallback(async (
    facilityId: string, 
    newStatus: 'approved' | 'rejected',
    facilityName: string
  ) => {
    if (!user?.id) {
      log('❌ ユーザー情報がありません');
      return;
    }

    try {
      log('🔄 ステータス更新開始:', { facilityId, newStatus, facilityName });

      const { error } = await supabase
        .from('facilities')
        .update({ status: newStatus })
        .eq('id', facilityId);

      if (error) {
        log('❌ ステータス更新エラー:', error);
        throw error;
      }

      log('✅ ステータス更新完了');
      
      // データを再取得して画面を更新
      await fetchApplications();
      
    } catch (error) {
      log('❌ ステータス更新でエラーが発生:', error);
    }
  }, [user, fetchApplications]);

  // 削除関数
  const deleteFacility = useCallback(async (facilityId: string, facilityName: string) => {
    log('🚀 削除機能開始:', { facilityId, facilityName, user: user?.id });

    if (!user?.id) {
      log('❌ ユーザー情報がありません');
      return;
    }

    if (!facilityId) {
      log('❌ 施設IDがありません');
      return;
    }

    // 削除確認
    const isConfirmed = window.confirm(
      `「${facilityName}」を完全に削除しますか？\n\nこの操作は取り消せません。`
    );

    if (!isConfirmed) {
      log('❌ 削除キャンセル');
      return;
    }

    log('✅ 削除確認済み、処理開始');

    try {
      // 1. 施設情報の取得と存在確認
      log('🗑️ 施設削除開始:', {
        facilityId,
        facilityName,
        userId: user.id,
      });

      log('🔍 施設存在確認...');
      
      const { data: existingFacility, error: facilityError } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', facilityId)
        .single() as { data: DatabaseFacility | null; error: any };

      if (facilityError) {
        if (facilityError.code === 'PGRST116') {
          log('⚠️ 施設が見つかりません（既に削除済み）');
          await fetchApplications();
          return;
        }
        log('❌ 施設取得エラー:', facilityError);
        throw facilityError;
      }

      log('✅ 施設存在確認完了:', existingFacility);

      // 2. 関連画像の削除
      log('🖼️ 関連画像削除開始...');
      
      const { data: imageData, error: imageSelectError } = await supabase
        .from('facility_images')
        .select('image_url')
        .eq('facility_id', facilityId);

      if (!imageSelectError && imageData) {
        const { error: imageDeleteError } = await supabase
          .from('facility_images')
          .delete()
          .eq('facility_id', facilityId);

        if (!imageDeleteError) {
          log('✅ 施設画像削除完了:', imageData?.length || 0, '件');
        }
      }

      // 3. メイン施設データの削除
      log('🏢 メイン施設データ削除開始...');
      
      const { error: deleteError } = await supabase
        .from('facilities')
        .delete()
        .eq('id', facilityId);

      if (deleteError) {
        log('❌ 施設削除エラー:', deleteError);
        throw deleteError;
      }

      log('🎉 施設削除完了:', { facilityId, facilityName });

      // 4. データ再取得
      await fetchApplications();
      
    } catch (error) {
      log('❌ 削除処理でエラーが発生:', error);
    }
  }, [user, fetchApplications]);

  // フィルタリングとソート
  const filteredAndSortedApplications = React.useMemo(() => {
    const filtered = applications.filter(app => {
      const matchesTab = app.status === activeTab;
      const matchesSearch = searchTerm === '' || 
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === '' || app.category_id === categoryFilter;
      
      return matchesTab && matchesSearch && matchesCategory;
    });

    // ソート
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'created_at':
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'category':
          compareValue = (a.category_name || '').localeCompare(b.category_name || '');
          break;
        default:
          compareValue = 0;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [applications, activeTab, searchTerm, categoryFilter, sortBy, sortOrder]);

  // 統計データ
  const stats = React.useMemo(() => {
    const pending = applications.filter(app => app.status === 'pending').length;
    const approved = applications.filter(app => app.status === 'approved').length;
    const rejected = applications.filter(app => app.status === 'rejected').length;
    
    return { pending, approved, rejected, total: applications.length };
  }, [applications]);

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ヘッダー */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              施設申請管理
            </h1>
            <p className="text-gray-600">
              ペット関連施設の申請を確認・承認します
            </p>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">承認待ち</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">承認済み</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">却下済み</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">総申請数</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
          </div>

          {/* タブ */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'pending'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  承認待ち ({stats.pending})
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'approved'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  承認済み ({stats.approved})
                </button>
              </nav>
            </div>

            {/* フィルター・検索 */}
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="施設名・住所で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全カテゴリー</option>
                  {Object.entries(CATEGORY_NAMES).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'created_at' | 'category')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="created_at">申請日時</option>
                  <option value="name">施設名</option>
                  <option value="category">カテゴリー</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sortOrder === 'asc' ? (
                    <SortAsc className="h-5 w-5" />
                  ) : (
                    <SortDesc className="h-5 w-5" />
                  )}
                  <span className="ml-2">
                    {sortOrder === 'asc' ? '昇順' : '降順'}
                  </span>
                </button>
              </div>
            </div>

            {/* 申請リスト */}
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">読み込み中...</p>
                </div>
              ) : filteredAndSortedApplications.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    申請がありません
                  </h3>
                  <p className="text-gray-500">
                    {activeTab === 'pending' ? '承認待ちの申請はありません' : '承認済みの申請はありません'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAndSortedApplications.map((application) => (
                    <div
                      key={application.id}
                      className="bg-gray-50 rounded-lg p-6 border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {application.name}
                            </h3>
                            <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {application.category_name}
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              {application.address}
                            </div>
                            
                            {application.phone && (
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-2" />
                                {application.phone}
                              </div>
                            )}
                            
                            {application.website && (
                              <div className="flex items-center">
                                <Globe className="h-4 w-4 mr-2" />
                                <a
                                  href={application.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {application.website}
                                </a>
                              </div>
                            )}
                            
                            {application.description && (
                              <div className="mt-3">
                                <h4 className="font-medium text-gray-700 mb-1">説明</h4>
                                <p className="text-gray-600">{application.description}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center text-xs text-gray-500 mt-3">
                              <Calendar className="h-4 w-4 mr-1" />
                              申請日: {new Date(application.created_at).toLocaleDateString('ja-JP')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-6 flex flex-col space-y-2">
                          {activeTab === 'pending' && (
                            <>
                              <button
                                onClick={() => void updateApplicationStatus(application.id, 'approved', application.name)}
                                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                承認
                              </button>
                              <button
                                onClick={() => void updateApplicationStatus(application.id, 'rejected', application.name)}
                                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                              >
                                <X className="h-4 w-4 mr-1" />
                                却下
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={() => void deleteFacility(application.id, application.name)}
                            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminFacilityApproval;

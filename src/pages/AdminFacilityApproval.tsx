import {
    AlertCircle,
    Building,
    Calendar,
    Check,
    CheckCircle,
    Clock,
    Globe,
    MapPin,
    Phone,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface FacilityImage {
  id: string;
  image_data: string;
  is_primary: boolean;
}

interface PetFacility {
  id: string;
  name: string;
  category_id: string;
  address: string;
  phone?: string;
  website?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  owner_id: string;
  images: FacilityImage[];
}

const CATEGORY_LABELS: { [key: string]: string } = {
  'pet_hotel': 'ペットホテル',
  'pet_salon': 'ペットサロン',
  'veterinary': '動物病院',
  'pet_cafe': 'ペットカフェ',
  'pet_restaurant': 'ペット同伴レストラン',
  'pet_shop': 'ペットショップ',
  'pet_accommodation': 'ペット同伴宿泊'
};

export default function AdminFacilityApproval() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [facilities, setFacilities] = useState<PetFacility[]>([]);
  const [pendingFacilities, setPendingFacilities] = useState<PetFacility[]>([]);
  const [approvedFacilities, setApprovedFacilities] = useState<PetFacility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<PetFacility | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  // 管理者権限確認
  useEffect(() => {
    if (!isAdmin) {
      showError('管理者権限が必要です');
      return;
    }
    fetchFacilities();
  }, [isAdmin]);

  useEffect(() => {
    if (facilities.length > 0) {
      separateFacilities();
    }
  }, [facilities]);

  const fetchFacilities = async () => {
    try {
      setIsLoading(true);
      setError('');

      // 施設データを取得
      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from('pet_facilities')
        .select('*')
        .order('created_at', { ascending: false });

      if (facilitiesError) {
        console.error('Facilities fetch error:', facilitiesError);
        throw facilitiesError;
      }

      // 各施設の画像を取得
      const facilitiesWithImages = await Promise.all(
        (facilitiesData || []).map(async (facility) => {
          const { data: images, error: imagesError } = await supabase
            .from('facility_images')
            .select('*')
            .eq('facility_id', facility.id)
            .order('is_primary', { ascending: false });

          if (imagesError) {
            console.error('Images fetch error:', imagesError);
            return { ...facility, images: [] };
          }

          return { ...facility, images: images || [] };
        })
      );

      setFacilities(facilitiesWithImages);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      showError(error instanceof Error ? error.message : 'データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const separateFacilities = () => {
    const pending = facilities.filter(facility => facility.status === 'pending');
    const approved = facilities.filter(facility => facility.status === 'approved');
    
    setPendingFacilities(pending);
    setApprovedFacilities(approved);
  };

  const handleApprove = async (facilityId: string) => {
    const confirmApprove = window.confirm('この施設を承認してもよろしいですか？');
    if (!confirmApprove) return;

    try {
      setActionLoading(true);
      setError('');

      const { error } = await supabase
        .from('pet_facilities')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', facilityId);

      if (error) throw error;

      showSuccess('施設を承認しました。');
      
      // 承認後にリストを更新
      setFacilities(prevFacilities => 
        prevFacilities.map(facility => 
          facility.id === facilityId 
            ? { ...facility, status: 'approved' as const }
            : facility
        )
      );
      
      setShowModal(false);
      setSelectedFacility(null);
    } catch (error) {
      console.error('Error approving facility:', error);
      showError('施設の承認に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

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
            <AlertCircle className="w-12 h-12 text-red-500 mr-4" />
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">ペット関連施設承認管理</h1>
            <p className="text-gray-600">登録されたペット関連施設の承認・却下を管理します</p>
          </div>
          
          {/* エラー・成功メッセージ */}
          {error && (
            <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
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
                onClick={() => setActiveTab('pending')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="w-5 h-5 inline mr-2" />
                承認待ち
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {pendingFacilities.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'approved'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Building className="w-5 h-5 inline mr-2" />
                掲載中施設
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {approvedFacilities.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* コンテンツ */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            {/* 承認待ち施設一覧 */}
            {pendingFacilities.length === 0 ? (
              <Card className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">承認待ちの施設がありません</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingFacilities.map((facility) => (
                  <Card key={facility.id} className="overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {facility.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {CATEGORY_LABELS[facility.category_id] || facility.category_id}
                          </p>
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(facility.status)}`}>
                            <Clock className="w-3 h-3 mr-1" />
                            {getStatusLabel(facility.status)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span className="truncate">{facility.address}</span>
                        </div>
                        {facility.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-4 h-4 mr-2" />
                            <span>{facility.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>{new Date(facility.created_at).toLocaleDateString('ja-JP')}</span>
                        </div>
                      </div>

                      {/* 画像プレビュー */}
                      {facility.images.length > 0 && (
                        <div className="mb-4">
                          <div className="grid grid-cols-3 gap-2">
                            {facility.images.slice(0, 3).map((image, index) => (
                              <img
                                key={image.id}
                                src={image.image_data}
                                alt={`施設画像 ${index + 1}`}
                                className="w-full h-16 object-cover rounded border"
                              />
                            ))}
                          </div>
                          {facility.images.length > 3 && (
                            <p className="text-xs text-gray-500 mt-1">
                              +{facility.images.length - 3}枚の画像
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button
                          onClick={() => {
                            setSelectedFacility(facility);
                            setShowModal(true);
                          }}
                          className="flex-1"
                          size="sm"
                          variant="secondary"
                        >
                          詳細を確認
                        </Button>
                        <Button
                          onClick={() => handleApprove(facility.id)}
                          disabled={actionLoading}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          承認
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'approved' && (
          <div className="space-y-6">
            {/* 掲載中施設一覧 */}
            {approvedFacilities.length === 0 ? (
              <Card className="text-center py-12">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">掲載中の施設がありません</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedFacilities.map((facility) => (
                  <Card key={facility.id} className="overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {facility.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {CATEGORY_LABELS[facility.category_id] || facility.category_id}
                          </p>
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(facility.status)}`}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {getStatusLabel(facility.status)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span className="truncate">{facility.address}</span>
                        </div>
                        {facility.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-4 h-4 mr-2" />
                            <span>{facility.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>{new Date(facility.created_at).toLocaleDateString('ja-JP')}</span>
                        </div>
                      </div>

                      {/* 画像プレビュー */}
                      {facility.images.length > 0 && (
                        <div className="mb-4">
                          <div className="grid grid-cols-3 gap-2">
                            {facility.images.slice(0, 3).map((image, index) => (
                              <img
                                key={image.id}
                                src={image.image_data}
                                alt={`施設画像 ${index + 1}`}
                                className="w-full h-16 object-cover rounded border"
                              />
                            ))}
                          </div>
                          {facility.images.length > 3 && (
                            <p className="text-xs text-gray-500 mt-1">
                              +{facility.images.length - 3}枚の画像
                            </p>
                          )}
                        </div>
                      )}

                      <Button
                        onClick={() => {
                          setSelectedFacility(facility);
                          setShowModal(true);
                        }}
                        className="w-full"
                        size="sm"
                        variant="secondary"
                      >
                        詳細を確認
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 詳細モーダル */}
        {showModal && selectedFacility && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedFacility.name}
                    </h2>
                    <p className="text-gray-600">
                      {CATEGORY_LABELS[selectedFacility.category_id] || selectedFacility.category_id}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">基本情報</h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 text-gray-500 mr-3" />
                        <span>{selectedFacility.address}</span>
                      </div>
                      {selectedFacility.phone && (
                        <div className="flex items-center">
                          <Phone className="w-5 h-5 text-gray-500 mr-3" />
                          <span>{selectedFacility.phone}</span>
                        </div>
                      )}
                      {selectedFacility.website && (
                        <div className="flex items-center">
                          <Globe className="w-5 h-5 text-gray-500 mr-3" />
                          <a
                            href={selectedFacility.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {selectedFacility.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">ステータス</h3>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedFacility.status)}`}>
                      {selectedFacility.status === 'pending' && <Clock className="w-4 h-4 mr-2" />}
                      {selectedFacility.status === 'approved' && <CheckCircle className="w-4 h-4 mr-2" />}
                      {selectedFacility.status === 'rejected' && <XCircle className="w-4 h-4 mr-2" />}
                      {getStatusLabel(selectedFacility.status)}
                    </div>
                  </div>
                </div>

                {selectedFacility.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">施設紹介</h3>
                    <p className="text-gray-700 whitespace-pre-line">
                      {selectedFacility.description}
                    </p>
                  </div>
                )}

                {selectedFacility.images.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">
                      施設画像 ({selectedFacility.images.length}枚)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedFacility.images.map((image, index) => (
                        <div key={image.id} className="relative">
                          <img
                            src={image.image_data}
                            alt={`施設画像 ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          {image.is_primary && (
                            <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                              メイン
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedFacility.status === 'pending' && (
                  <div className="flex space-x-4">
                    <Button
                      onClick={() => handleApprove(selectedFacility.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      承認する
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
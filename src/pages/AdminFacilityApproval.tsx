import React, { useState, useEffect } from 'react';
import { 
  Building, 
  MapPin, 
  Phone, 
  Globe, 
  Image,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Info
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';

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
  const [facilities, setFacilities] = useState<PetFacility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<PetFacility | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // 管理者権限確認
  useEffect(() => {
    if (!isAdmin) {
      setError('管理者権限が必要です');
      return;
    }
    fetchFacilities();
  }, [isAdmin]);

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
      setError(error instanceof Error ? error.message : 'データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (facilityId: string) => {
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

      await fetchFacilities();
      setShowModal(false);
      setSelectedFacility(null);
    } catch (error) {
      console.error('Error approving facility:', error);
      setError('施設の承認に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (facilityId: string) => {
    if (!rejectionReason.trim()) {
      setError('却下理由を入力してください');
      return;
    }

    try {
      setActionLoading(true);
      setError('');

      const { error } = await supabase
        .from('pet_facilities')
        .update({
          status: 'rejected',
          admin_notes: rejectionReason,
          approved_at: null,
          approved_by: null
        })
        .eq('id', facilityId);

      if (error) throw error;

      await fetchFacilities();
      setShowModal(false);
      setSelectedFacility(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting facility:', error);
      setError('施設の却下に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredFacilities = facilities.filter(facility => {
    if (filter === 'all') return true;
    return facility.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
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

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ペット関連施設 承認管理</h1>
        <p className="text-gray-600">
          登録されたペット関連施設の承認・却下を管理します。
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div className="mb-6">
        <div className="flex space-x-4">
          {[
            { key: 'all', label: 'すべて', count: facilities.length },
            { key: 'pending', label: '承認待ち', count: facilities.filter(f => f.status === 'pending').length },
            { key: 'approved', label: '承認済み', count: facilities.filter(f => f.status === 'approved').length },
            { key: 'rejected', label: '却下', count: facilities.filter(f => f.status === 'rejected').length }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFacilities.map((facility) => (
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
                      {facility.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                      {facility.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {facility.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
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
                >
                  詳細を確認
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredFacilities.length === 0 && !isLoading && (
        <div className="text-center py-20">
          <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            施設がありません
          </h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? '登録された施設がありません' 
              : `${getStatusLabel(filter)}の施設がありません`}
          </p>
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
                  {selectedFacility.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">
                        <strong>却下理由:</strong> {selectedFacility.rejection_reason}
                      </p>
                    </div>
                  )}
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
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      却下理由（却下する場合のみ）
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="却下する理由を入力してください"
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <Button
                      onClick={() => handleApprove(selectedFacility.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      承認する
                    </Button>
                    <Button
                      onClick={() => handleReject(selectedFacility.id)}
                      disabled={actionLoading || !rejectionReason.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      却下する
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
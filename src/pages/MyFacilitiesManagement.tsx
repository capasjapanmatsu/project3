import {
    AlertTriangle,
    ArrowLeft,
    Building,
    CheckCircle,
    Clock,
    Edit,
    Eye,
    Globe,
    MapPin,
    Phone,
    Plus
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { SEO } from '../components/SEO';
import useAuth from '../context/AuthContext';
import { FACILITY_CATEGORY_LABELS, PetFacility } from '../types/facilities';
import { supabase } from '../utils/supabase';

interface PetFacilityFromDB {
  id: string;
  name: string;
  description?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  category_id: string;
  created_at: string;
  updated_at?: string;
}

export function MyFacilitiesManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<PetFacility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacilities = async () => {
      if (!user) return;

      try {
        // 正しいテーブル名とカラム名でクエリ
        const { data: facilitiesData, error } = await supabase
          .from('pet_facilities')
          .select(`
            id,
            name,
            description,
            address,
            latitude,
            longitude,
            phone,
            website,
            status,
            category_id,
            created_at,
            updated_at
          `)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching facilities:', error);
          return;
        }

        const processedFacilities: PetFacility[] = (facilitiesData as PetFacilityFromDB[])?.map((facility) => ({
          ...facility,
          category: facility.category_id,
          category_name: FACILITY_CATEGORY_LABELS[facility.category_id as keyof typeof FACILITY_CATEGORY_LABELS] || 'その他施設'
        })) || [];

        console.log('✅ Facilities data:', processedFacilities);
        setFacilities(processedFacilities);
      } catch (error) {
        console.error('Error in fetchFacilities:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchFacilities();
  }, [user]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        label: '公開中',
        icon: CheckCircle 
      },
      pending: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800', 
        label: '審査中',
        icon: Clock 
      },
      rejected: { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        label: '却下',
        icon: AlertTriangle 
      },
      suspended: { 
        bg: 'bg-gray-100', 
        text: 'text-gray-800', 
        label: '停止中',
        icon: AlertTriangle 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${config.bg} ${config.text}`}>
        <IconComponent className="w-4 h-4" />
        <span>{config.label}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="管理中ペット関連施設一覧"
        description="あなたが管理するペット関連施設の一覧と詳細管理ページです。"
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              マイページに戻る
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <Building className="w-8 h-8 text-teal-600 mr-3" />
                管理中ペット関連施設一覧
              </h1>
              <p className="text-gray-600 mt-2">
                あなたが管理するペット関連施設 ({facilities.length}施設) の詳細管理
              </p>
            </div>
            
            <Link to="/facility-registration">
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                新規施設登録
              </Button>
            </Link>
          </div>
        </div>

        {/* 施設一覧 */}
        {facilities.length === 0 ? (
          <Card className="p-12 text-center">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              管理中のペット関連施設がありません
            </h3>
            <p className="text-gray-600 mb-6">
              ペットショップ、動物病院、トリミングサロンなどの施設を登録しましょう。
            </p>
            <Link to="/facility-registration">
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                施設登録を始める
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {facilities.map((facility) => (
              <Card key={facility.id} className="hover:shadow-lg transition-all duration-200">
                <div className="p-6">
                  {/* ヘッダー部分 */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {facility.name}
                      </h3>
                      <div className="flex items-center text-gray-600 mb-2">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="text-sm">{facility.address}</span>
                      </div>
                      <div className="text-sm text-teal-600 font-medium mb-3">
                        {facility.category_name}
                      </div>
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(facility.status)}
                    </div>
                  </div>

                  {/* 説明文 */}
                  {facility.description && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {facility.description}
                      </p>
                    </div>
                  )}

                  {/* 連絡先情報 */}
                  <div className="space-y-2 mb-6">
                    {facility.phone && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        <span className="text-sm">{facility.phone}</span>
                      </div>
                    )}
                    {facility.website && (
                      <div className="flex items-center text-gray-600">
                        <Globe className="w-4 h-4 mr-2" />
                        <a 
                          href={facility.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-teal-600 hover:text-teal-800 underline"
                        >
                          公式サイト
                        </a>
                      </div>
                    )}
                  </div>

                  {/* 統計情報 */}
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600">登録日</div>
                      <div className="font-semibold">
                        {facility.created_at ? new Date(facility.created_at).toLocaleDateString() : '不明'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">ステータス</div>
                      <div className="mt-1">
                        {getStatusBadge(facility.status)}
                      </div>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex space-x-3">
                    <Button 
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
                      onClick={() => navigate(`/facilities/${facility.id}/edit`)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      管理・修正
                    </Button>
                    
                    {facility.status === 'approved' && (
                      <Button 
                        variant="secondary" 
                        className="px-4"
                        onClick={() => navigate(`/parks?view=facilities&facility=${facility.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        公開ページ
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
} 
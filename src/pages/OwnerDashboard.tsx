import { AlertTriangle, BarChart4, Building, Camera, CheckCircle, ChevronRight, Clock, DollarSign, Edit, Eye, FileText, Globe, MapPin, PlusCircle, RefreshCw, Shield, Star, Trash2, TrendingUp, Upload, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import useAuth from '../context/AuthContext';
import type { DogPark } from '../types';
import type { FacilityImage, PetFacility } from '../types/facilities';
import { supabase } from '../utils/supabase';

export function OwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [parks, setParks] = useState<DogPark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalReservations, setTotalReservations] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // ペット施設管理用のstate
  const [facilities, setFacilities] = useState<PetFacility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<PetFacility | null>(null);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [isUpdatingFacility, setIsUpdatingFacility] = useState(false);
  const [facilityImages, setFacilityImages] = useState<FacilityImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [facilityFormData, setFacilityFormData] = useState({
    name: '',
    description: '',
    website: '',
    phone: '',
    status: 'approved' as 'pending' | 'approved' | 'rejected' | 'suspended'
  });

  // データ取得関数を分離
  const fetchParks = async () => {
    try {

      const { data, error } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {

        throw error;
      }


      setParks(data || []);

      // 仮のデータを設定（実際の実装ではデータベースから取得）
      setTotalRevenue(25600);
      setTotalReservations(32);
      setTotalUsers(128);
    } catch (error) {

      setError('ドッグランの取得に失敗しました');
    }
  };

  // ペット施設データ取得関数
  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase
        .from('pet_facilities')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setFacilities(data || []);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      setError('ペット施設の取得に失敗しました');
    }
  };

  // 施設編集ハンドラー
  const handleEditFacility = (facility: any) => {
    setSelectedFacility(facility);
    setFacilityFormData({
      name: facility.name,
      description: facility.description || '',
      website: facility.website || '',
      phone: facility.phone || '',
      status: facility.status
    });
    setShowFacilityModal(true);
  };

  // 公開・非公開トグル
  const handleTogglePublic = async (facilityId: string, isPublic: boolean) => {
    try {
      const { error } = await supabase
        .from('pet_facilities')
        .update({ 
          status: isPublic ? 'approved' : 'suspended',
          updated_at: new Date().toISOString()
        })
        .eq('id', facilityId)
        .eq('owner_id', user?.id);

      if (error) throw error;

      await fetchFacilities();
      setSuccess('公開設定を更新しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error toggling facility status:', error);
      setError('公開設定の更新に失敗しました');
      setTimeout(() => setError(''), 3000);
    }
  };

  // 施設情報更新
  const handleUpdateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility) return;

    try {
      setIsUpdatingFacility(true);
      setError('');

      const { error } = await supabase
        .from('pet_facilities')
        .update({
          name: facilityFormData.name,
          description: facilityFormData.description,
          website: facilityFormData.website,
          phone: facilityFormData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFacility.id)
        .eq('owner_id', user?.id);

      if (error) throw error;

      await fetchFacilities();
      setShowFacilityModal(false);
      setSuccess('施設情報を更新しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating facility:', error);
      setError('施設情報の更新に失敗しました');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsUpdatingFacility(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: '第一審査中',
          description: '申請内容を審査中です。しばらくお待ちください。',
          color: 'bg-yellow-100 text-yellow-800'
        };
      case 'first_stage_passed':
        return {
          icon: CheckCircle,
          label: '第一審査通過（旧）',
          description: '第一審査を通過しました。（旧システム）',
          color: 'bg-blue-100 text-blue-800'
        };
      case 'second_stage_waiting':
        return {
          icon: AlertTriangle,
          label: '二次審査申し込み',
          description: '第一審査通過！スマートロックを購入し、第二審査を提出してください。',
          color: 'bg-orange-100 text-orange-800',
          showSmartLockPurchase: true
        };
      case 'second_stage_review':
        return {
          icon: FileText,
          label: '第二審査中',
          description: '第二審査を実施中です。審査結果をお待ちください。',
          color: 'bg-purple-100 text-purple-800'
        };
      case 'smart_lock_testing':
        return {
          icon: Shield,
          label: 'スマートロック認証待ち',
          description: 'スマートロックの動作確認を行ってください。',
          color: 'bg-indigo-100 text-indigo-800'
        };
      case 'approved':
        return {
          icon: CheckCircle,
          label: '承認済み・公開可能',
          description: 'ドッグランの運営を開始できます！',
          color: 'bg-green-100 text-green-800'
        };
      case 'rejected':
        return {
          icon: AlertTriangle,
          label: '却下',
          description: '申請が却下されました。詳細をご確認ください。',
          color: 'bg-red-100 text-red-800'
        };
      default:
        return {
          icon: Clock,
          label: '不明',
          description: 'ステータスが不明です。',
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'first_stage_passed': return 'bg-blue-100 text-blue-800';
      case 'second_stage_waiting': return 'bg-orange-100 text-orange-800';
      case 'second_stage_review': return 'bg-purple-100 text-purple-800';
      case 'smart_lock_testing': return 'bg-indigo-100 text-indigo-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeletePark = async (parkId: string) => {
    try {
      setIsDeleting(true);
      setError('');

      // First, check if there are any related facility images
      const { data: facilityImages } = await supabase
        .from('dog_park_facility_images')
        .select('id')
        .eq('park_id', parkId);


      // If there are facility images, delete them first
      if (facilityImages && facilityImages.length > 0) {
        const { error: deleteImagesError } = await supabase
          .from('dog_park_facility_images')
          .delete()
          .eq('park_id', parkId);

        if (deleteImagesError) {

          throw new Error('施設画像の削除に失敗しました。');
        }
      }

      // Check for review stages
      const { data: reviewStages } = await supabase
        .from('dog_park_review_stages')
        .select('id')
        .eq('park_id', parkId);


      // Delete review stages if they exist
      if (reviewStages && reviewStages.length > 0) {
        const { error: deleteStagesError } = await supabase
          .from('dog_park_review_stages')
          .delete()
          .eq('park_id', parkId);

        if (deleteStagesError) {

          throw new Error('審査ステージの削除に失敗しました。');
        }
      }

      // Now delete the park
      const { error } = await supabase
        .from('dog_parks')
        .delete()
        .eq('id', parkId)
        .eq('owner_id', user?.id); // Ensure the user owns the park

      if (error) {

        throw error;
      }

      // Update the parks list by refetching
      await fetchParks();
      setShowConfirmDelete(null);
      setConfirmDelete(false);

      // Get park name for success message
      const deletedPark = parks.find(p => p.id === parkId);
      const parkName = deletedPark?.name || 'ドッグラン';
      setSuccess(`${parkName}の申請を完全に削除しました。再度ご利用の際は新規申請が必要です。`);


      // Clear success message after 5 seconds (longer for important message)
      setTimeout(() => {
        setSuccess('');
      }, 5000);

    } catch (err) {

      setError((err as Error).message || 'エラーが発生しました');

      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {

    if (!user) {
      navigate('/login');
      return;
    }


    const loadData = async () => {
      try {
        setIsLoading(true);
        setError('');

        await fetchParks();
        await fetchFacilities(); // ペット施設データも取得

      } catch (error) {
        console.error('Error loading data:', error);
        setError('データの取得に失敗しました。ページを再読み込みしてください。');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData(); // void演算子でPromise警告を回避

    // Supabaseリアルタイム機能を追加
    const subscription = supabase
      .channel('dog_parks_changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dog_parks',
          filter: `owner_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Dog parks changed:', payload);
          // データが変更されたらリフレッシュ
          void fetchParks(); // void演算子でPromise警告を回避
        }
      )
      .subscribe();

    // クリーンアップ
    return () => {
      subscription.unsubscribe();
    };
  }, [user, navigate]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: '第一審査中',
          description: '申請内容を審査中です。しばらくお待ちください。',
          color: 'bg-yellow-100 text-yellow-800'
        };
      case 'first_stage_passed':
        return {
          icon: CheckCircle,
          label: '第一審査通過（旧）',
          description: '第一審査を通過しました。（旧システム）',
          color: 'bg-blue-100 text-blue-800'
        };
      case 'second_stage_waiting':
        return {
          icon: AlertTriangle,
          label: '二次審査申し込み',
          description: '第一審査通過！スマートロックを購入し、第二審査を提出してください。',
          color: 'bg-orange-100 text-orange-800',
          showSmartLockPurchase: true
        };
      case 'second_stage_review':
        return {
          icon: FileText,
          label: '第二審査中',
          description: '第二審査を実施中です。審査結果をお待ちください。',
          color: 'bg-purple-100 text-purple-800'
        };
      case 'smart_lock_testing':
        return {
          icon: Shield,
          label: 'スマートロック認証待ち',
          description: 'スマートロックの動作確認を行ってください。',
          color: 'bg-indigo-100 text-indigo-800'
        };
      case 'approved':
        return {
          icon: CheckCircle,
          label: '承認済み・公開可能',
          description: 'ドッグランの運営を開始できます！',
          color: 'bg-green-100 text-green-800'
        };
      case 'rejected':
        return {
          icon: AlertTriangle,
          label: '却下',
          description: '申請が却下されました。詳細をご確認ください。',
          color: 'bg-red-100 text-red-800'
        };
      default:
        return {
          icon: Clock,
          label: '不明',
          description: 'ステータスが不明です。',
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'first_stage_passed': return 'bg-blue-100 text-blue-800';
      case 'second_stage_waiting': return 'bg-orange-100 text-orange-800';
      case 'second_stage_review': return 'bg-purple-100 text-purple-800';
      case 'smart_lock_testing': return 'bg-indigo-100 text-indigo-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeletePark = async (parkId: string) => {
    try {
      setIsDeleting(true);
      setError('');

      // First, check if there are any related facility images
      const { data: facilityImages } = await supabase
        .from('dog_park_facility_images')
        .select('id')
        .eq('park_id', parkId);


      // If there are facility images, delete them first
      if (facilityImages && facilityImages.length > 0) {
        const { error: deleteImagesError } = await supabase
          .from('dog_park_facility_images')
          .delete()
          .eq('park_id', parkId);

        if (deleteImagesError) {

          throw new Error('施設画像の削除に失敗しました。');
        }
      }

      // Check for review stages
      const { data: reviewStages } = await supabase
        .from('dog_park_review_stages')
        .select('id')
        .eq('park_id', parkId);


      // Delete review stages if they exist
      if (reviewStages && reviewStages.length > 0) {
        const { error: deleteStagesError } = await supabase
          .from('dog_park_review_stages')
          .delete()
          .eq('park_id', parkId);

        if (deleteStagesError) {

          throw new Error('審査ステージの削除に失敗しました。');
        }
      }

      // Now delete the park
      const { error } = await supabase
        .from('dog_parks')
        .delete()
        .eq('id', parkId)
        .eq('owner_id', user?.id); // Ensure the user owns the park

      if (error) {

        throw error;
      }

      // Update the parks list by refetching
      await fetchParks();
      setShowConfirmDelete(null);
      setConfirmDelete(false);

      // Get park name for success message
      const deletedPark = parks.find(p => p.id === parkId);
      const parkName = deletedPark?.name || 'ドッグラン';
      setSuccess(`${parkName}の申請を完全に削除しました。再度ご利用の際は新規申請が必要です。`);


      // Clear success message after 5 seconds (longer for important message)
      setTimeout(() => {
        setSuccess('');
      }, 5000);

    } catch (err) {

      setError((err as Error).message || 'エラーが発生しました');

      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    setError('ユーザー情報が取得できません');
    return;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">オーナーダッシュボード</h1>
          <p className="text-gray-600">ドッグランの登録・管理を行います</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            className="flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
          <Link to="/owner-payment-system">
            <Button variant="secondary" className="flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              収益システム
            </Button>
          </Link>
          <Link to="/register-park">
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              ドッグランを登録
            </Button>
          </Link>
        </div>
      </div>

      {/* エラー・成功メッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* デバッグ情報 */}
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">デバッグ情報</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
          >
            {showDebugInfo ? '隠す' : '表示'}
          </Button>
        </div>

        {showDebugInfo && (
          <div className="space-y-2">
            <div className="text-sm">
              <strong>ユーザーID:</strong> {user?.id}
            </div>
            <div className="text-sm">
              <strong>パーク数:</strong> {parks.length}
            </div>
            <div className="text-sm">
              <strong>最終更新:</strong> {new Date().toLocaleString()}
            </div>
            {parks.map(park => (
              <div key={park.id} className="bg-white p-3 rounded border text-sm">
                <div><strong>名前:</strong> {park.name}</div>
                <div><strong>ID:</strong> {park.id}</div>
                <div><strong>ステータス:</strong> {park.status}</div>
                <div><strong>作成日:</strong> {new Date(park.created_at).toLocaleString()}</div>
                <div><strong>更新日:</strong> {park.updated_at ? new Date(park.updated_at).toLocaleString() : 'なし'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 統計カード */}
      {parks.some(park => park.status === 'approved') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">今月の収益</p>
                <p className="text-2xl font-bold text-green-600">¥{totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-green-600">前月比 +8%</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div className="mt-3 text-blue-600 text-sm flex items-center">
              <Link to="/owner-payment-system" className="flex items-center">
                <span>詳細を見る</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">今月の予約</p>
                <p className="text-2xl font-bold text-blue-600">{totalReservations}件</p>
                <p className="text-xs text-blue-600">前月比 +12%</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-3 text-blue-600 text-sm flex items-center">
              <span>詳細を見る</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">利用者数</p>
                <p className="text-2xl font-bold text-purple-600">{totalUsers}人</p>
                <p className="text-xs text-purple-600">前月比 +15%</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <div className="mt-3 text-blue-600 text-sm flex items-center">
              <span>詳細を見る</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </Card>
        </div>
      )}

      {/* 収益概要カード */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-full">
              <BarChart4 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">収益システム</h2>
              <p className="text-sm opacity-90">
                売上の80%がオーナー様に支払われます
              </p>
            </div>
          </div>
          <Link to="/owner-payment-system">
            <Button className="bg-white text-gray-900 hover:bg-gray-100 hover:text-gray-900 font-bold">
              <TrendingUp className="w-4 h-4 mr-2" />
              詳細を見る
            </Button>
          </Link>
        </div>
      </Card>

      {/* 審査プロセスの説明 */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <FileText className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">審査プロセス</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-blue-800">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <span>第一審査（基本条件確認）</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <span>第二審査（書類審査）</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <span>QRコード実証検査</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                <span>掲載・運営開始</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {parks.length === 0 ? (
        <Card className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">まだドッグランが登録されていません</h2>
          <p className="text-gray-600 mb-6">新しいドッグランを登録して、多くの愛犬家に利用してもらいましょう</p>
          <Link to="/register-park">
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              ドッグランを登録する
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {parks.map((park) => {
            const statusInfo = getStatusInfo(park.status);
            const StatusIcon = statusInfo.icon;

            return (
              <Card key={park.id} className="hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{park.name}</h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${statusInfo.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        <span>{statusInfo.label}</span>
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{statusInfo.description}</p>
                  </div>
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2">{park.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="text-sm">{park.address}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span className="text-sm">24時間営業</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>収容人数: {park.max_capacity}人</div>
                    <div>現在の利用者: {park.current_occupancy}人</div>
                  </div>
                </div>

                {/* 運営中の場合の統計情報 */}
                {park.status === 'approved' && (
                  <div className="bg-green-50 p-3 rounded-lg mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>評価: ★{park.average_rating.toFixed(1)}</span>
                      </div>
                      <div>
                        <span>レビュー: {park.review_count}件</span>
                      </div>
                      <div>
                        <span>現在の利用者: {park.current_occupancy}人</span>
                      </div>
                      <div>
                        <span>利用率: {Math.round((park.current_occupancy / park.max_capacity) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ステータス別の案内 */}
                {park.status === 'pending' && (
                  <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">第一審査待ち</p>
                        <p>管理者による審査をお待ちください。通常3-5営業日で結果をお知らせします。</p>
                      </div>
                    </div>
                  </div>
                )}

                {park.status === 'second_stage_waiting' && (
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-4">
                    <div className="flex items-start space-x-3">
                      <Shield className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm text-orange-800">
                          <p className="font-bold mb-2 text-base">🎉 第一審査通過おめでとうございます！</p>
                          <p className="mb-3">二次審査の申し込みが可能になりました。</p>

                          {/* 申し込みボタンを目立つように配置 */}
                          <div className="mb-4 text-center">
                            <Link to={`/parks/${park.id}/second-stage`}>
                              <Button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium">
                                <FileText className="w-4 h-4 mr-2" />
                                二次審査申し込み
                              </Button>
                            </Link>
                          </div>

                          {/* プログレスバー */}
                          <div className="mb-4 p-3 bg-white rounded-lg border border-orange-200">
                            <div className="flex items-center justify-between text-xs text-orange-700 mb-2">
                              <span>進捗状況</span>
                              <span>1/3ステップ完了</span>
                            </div>
                            <div className="w-full bg-orange-200 rounded-full h-2">
                              <div className="bg-orange-600 h-2 rounded-full" style={{ width: '33%' }}></div>
                            </div>
                          </div>

                          <p className="mb-3">次のステップに進むため、以下の手順を完了してください：</p>
                          <div className="space-y-3 mb-4">
                            <div className="flex items-start space-x-3 p-2 bg-green-50 rounded-lg border border-green-200">
                              <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</div>
                              <div className="flex-1">
                                <span className="font-semibold text-green-800">第一審査通過</span>
                                <p className="text-xs text-green-700 mt-1">基本情報の審査が完了しました</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 p-2 bg-orange-50 rounded-lg border-2 border-orange-300">
                              <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                              <div className="flex-1">
                                <span className="font-semibold text-orange-800">スマートロックの購入・設置</span>
                                <p className="text-xs text-orange-700 mt-1">ペットショップでスマートロックを購入し、設置してください</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                              <div className="flex-1">
                                <span className="font-semibold text-gray-600">第二審査（設備画像）の提出</span>
                                <p className="text-xs text-gray-500 mt-1">設置完了後、設備画像をアップロードしてください</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Link to="/pet-shop" className="flex-1">
                              <Button className="w-full bg-orange-600 hover:bg-orange-700">
                                <DollarSign className="w-4 h-4 mr-2" />
                                ペットショップでスマートロック購入
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {park.status === 'first_stage_passed' && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">第一審査通過！（旧システム）</p>
                        <p>第二審査の詳細情報を入力してください。</p>
                      </div>
                    </div>
                  </div>
                )}

                {park.status === 'second_stage_review' && (
                  <div className="bg-purple-50 p-3 rounded-lg mb-4">
                    <div className="flex items-start space-x-2">
                      <Clock className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-purple-800">
                        <p className="font-medium mb-1">第二審査中</p>
                        <p>提出いただいた設備画像を審査中です。結果をお待ちください。</p>
                      </div>
                    </div>
                  </div>
                )}

                {park.status === 'smart_lock_testing' && (
                  <div className="bg-indigo-50 p-3 rounded-lg mb-4">
                    <div className="flex items-start space-x-2">
                      <Shield className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-indigo-800">
                        <p className="font-medium mb-1">スマートロック動作確認</p>
                        <p>スマートロックの動作確認を行い、正常に作動することを確認してください。</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* アクションボタン */}
                <div className="flex space-x-2">
                  {park.status === 'qr_testing_ready' && (
                    <div className="flex justify-between w-full space-x-2">
                      <Link to={`/parks/${park.id}/publish-setup`} className="flex-1">
                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                          <Shield className="w-4 h-4 mr-1" />
                          公開準備を開始
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowConfirmDelete(park.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {park.status === 'editing' && (
                    <div className="flex justify-between w-full space-x-2">
                      <Link to={`/parks/${park.id}/publish-setup`} className="flex-1">
                        <Button size="sm" className="w-full bg-yellow-600 hover:bg-yellow-700">
                          <Edit className="w-4 h-4 mr-1" />
                          編集を続ける
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowConfirmDelete(park.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {park.status === 'ready_to_publish' && (
                    <div className="flex justify-between w-full space-x-2">
                      <Link to={`/parks/${park.id}/publish-setup`} className="flex-1">
                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                          <Eye className="w-4 h-4 mr-1" />
                          公開する
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowConfirmDelete(park.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {park.status === 'approved' && (
                    <div className="flex justify-between w-full">
                      <Link to={`/parks/${park.id}`}>
                        <Button size="sm" variant="secondary">
                          <Eye className="w-4 h-4 mr-1" />
                          公開ページを見る
                        </Button>
                      </Link>
                      <Link to={`/parks/${park.id}/manage`}>
                        <Button size="sm">
                          管理する
                        </Button>
                      </Link>
                    </div>
                  )}

                  {park.status === 'first_stage_passed' && (
                    <div className="flex justify-between w-full space-x-2">
                      <Link to={`/parks/${park.id}/second-stage`} className="flex-1">
                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                          <Camera className="w-4 h-4 mr-1" />
                          画像アップロード
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowConfirmDelete(park.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {park.status === 'second_stage_waiting' && (
                    <div className="flex justify-end w-full">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowConfirmDelete(park.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {park.status === 'pending' && (
                    <div className="flex justify-between w-full space-x-2">
                      <div className="flex-1 text-center py-2 text-gray-600 text-sm">
                        第一審査待ち
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowConfirmDelete(park.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {park.status === 'second_stage_review' && (
                    <div className="flex justify-between w-full space-x-2">
                      <div className="flex-1 text-center py-2 text-gray-600 text-sm">
                        第二審査中
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowConfirmDelete(park.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {park.status === 'rejected' && (
                    <div className="flex justify-between w-full space-x-2">
                      <div className="flex-1 text-center py-2 text-red-600 text-sm">
                        申請却下
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowConfirmDelete(park.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 管理中のその他施設一覧 */}
      <Card>
        <div className="mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <Building className="w-6 h-6 text-blue-600 mr-2" />
            管理中のその他施設 ({facilities.length}施設)
          </h2>
          <p className="text-gray-600 mt-1">ペットショップ、動物病院、トリミングサロンなどの施設管理</p>
        </div>

        {facilities.length === 0 ? (
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">まだその他施設が登録されていません</h3>
            <p className="text-gray-600 mb-6">ペット関連施設を登録して、より多くのお客様に知ってもらいましょう</p>
            <Link to="/facility-registration">
              <Button>
                <PlusCircle className="w-4 h-4 mr-2" />
                ペット関連施設を登録する
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {facilities.map((facility) => (
              <Card key={facility.id} className="hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{facility.name}</h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${
                        facility.status === 'approved' 
                          ? 'bg-green-100 text-green-800'
                          : facility.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {facility.status === 'approved' && <CheckCircle className="w-4 h-4" />}
                        {facility.status === 'pending' && <Clock className="w-4 h-4" />}
                        {facility.status === 'rejected' && <AlertTriangle className="w-4 h-4" />}
                        <span>
                          {facility.status === 'approved' && '公開中'}
                          {facility.status === 'pending' && '審査中'}
                          {facility.status === 'rejected' && '却下'}
                          {facility.status === 'suspended' && '停止中'}
                        </span>
                      </span>
                      
                      {/* 公開・非公開トグル */}
                      {facility.status === 'approved' && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">公開設定:</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={facility.status === 'approved'}
                              onChange={(e) => handleTogglePublic(facility.id, e.target.checked)}
                              className="sr-only"
                            />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {facility.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">{facility.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="text-sm">{facility.address}</span>
                  </div>
                  {facility.phone && (
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
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
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        公式サイト
                      </a>
                    </div>
                  )}
                </div>

                {/* アクションボタン */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleEditFacility(facility)}
                      className="flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      修正
                    </Button>
                    {facility.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(`/facility/${facility.id}`, '_blank')}
                        className="flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        公開ページ
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {facility.category_name || 'その他施設'}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* 運営サポート情報 */}
      <Card className="bg-gray-50">
        <div className="flex items-start space-x-3">
          <FileText className="w-6 h-6 text-gray-600 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">運営サポート</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p>• 審査に関するご質問は運営事務局までお問い合わせください</p>
              <p>• QRコードシステムの設置・設定サポートを提供しています</p>
              <p>• 運営開始後も継続的なサポートを行います</p>
              <p>• 📧 サポート窓口: info@dogparkjp.com</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 削除確認モーダル */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            {/* 警告アイコンとタイトル */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">ドッグラン申請を削除</h3>
                <p className="text-sm text-gray-500">
                  {parks.find(p => p.id === showConfirmDelete)?.name}
                </p>
              </div>
            </div>

            {/* 警告メッセージ */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-2">⚠️ 重要な警告</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><strong>この操作は取り消せません</strong></li>
                    <li>すべての申請データが完全に削除されます</li>
                    <li>再度利用したい場合は最初から申請手続きが必要です</li>
                    <li>審査進捗やアップロードした画像もすべて失われます</li>
                    <li>削除後は同じ施設名での即座の再申請はできません</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 削除内容の詳細 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">削除される内容：</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• ドッグランの基本情報</li>
                <li>• アップロード済みの施設画像</li>
                <li>• 審査進捗状況</li>
                <li>• 銀行口座情報</li>
                <li>• 管理者からのフィードバック</li>
              </ul>
            </div>

            {/* 確認チェックボックス */}
            <div className="mb-6">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmDelete}
                  className="mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  onChange={(e) => {
                    setConfirmDelete(e.target.checked);
                  }}
                />
                <span className="text-sm text-gray-700">
                  上記の内容を理解し、<strong>申請を完全に削除することに同意します</strong>
                </span>
              </label>
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowConfirmDelete(null);
                  setConfirmDelete(false);
                }}
                disabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button
                id="confirm-delete-button"
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                isLoading={isDeleting}
                disabled={!confirmDelete}
                onClick={() => {
                  if (showConfirmDelete) {
                    handleDeletePark(showConfirmDelete);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                完全に削除する
              </Button>
            </div>

            {/* 代替案の提案 */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 ヒント：</strong> 一時的に申請を中断したい場合は、削除せずに運営事務局にご相談ください。
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* 施設修正モーダル */}
      {showFacilityModal && selectedFacility && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">施設情報の修正</h2>
              <button
                onClick={() => setShowFacilityModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateFacility}>
              <div className="space-y-4">
                {/* 施設名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    施設名 *
                  </label>
                  <Input
                    type="text"
                    value={facilityFormData.name}
                    onChange={(e) => setFacilityFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full"
                  />
                </div>

                {/* 説明・コメント */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    施設の説明・コメント
                  </label>
                  <textarea
                    value={facilityFormData.description}
                    onChange={(e) => setFacilityFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="施設の特徴やサービス内容を詳しく記載してください"
                  />
                </div>

                {/* 電話番号 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    電話番号
                  </label>
                  <Input
                    type="tel"
                    value={facilityFormData.phone}
                    onChange={(e) => setFacilityFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full"
                    placeholder="03-1234-5678"
                  />
                </div>

                {/* ウェブサイトURL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ウェブサイトURL
                  </label>
                  <Input
                    type="url"
                    value={facilityFormData.website}
                    onChange={(e) => setFacilityFormData(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full"
                    placeholder="https://example.com"
                  />
                </div>

                {/* 画像アップロード */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    施設画像の追加・変更
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setSelectedImages(files);
                        
                        // プレビュー生成
                        const previews: string[] = [];
                        files.forEach(file => {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            previews.push(e.target?.result as string);
                            if (previews.length === files.length) {
                              setImagePreview(previews);
                            }
                          };
                          reader.readAsDataURL(file);
                        });
                      }}
                      className="hidden"
                      id="facility-images"
                    />
                    <label 
                      htmlFor="facility-images"
                      className="cursor-pointer bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-600">
                        画像を選択またはドラッグ&ドロップ
                      </span>
                    </label>
                  </div>
                  
                  {/* 画像プレビュー */}
                  {imagePreview.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      {imagePreview.map((preview, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={preview} 
                            alt={`Preview ${index}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newPreviews = [...imagePreview];
                              newPreviews.splice(index, 1);
                              setImagePreview(newPreviews);
                              
                              const newFiles = [...selectedImages];
                              newFiles.splice(index, 1);
                              setSelectedImages(newFiles);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowFacilityModal(false)}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  isLoading={isUpdatingFacility}
                  disabled={!facilityFormData.name.trim()}
                >
                  保存
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Calendar component for the dashboard
function Calendar({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}

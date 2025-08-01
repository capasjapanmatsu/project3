import {
    AlertTriangle,
    Bell,
    Building,
    CheckCircle,
    Clock,
    Crown,
    Edit,
    Gift,
    Globe,
    Heart,
    MapPin,
    ShoppingBag,
    Ticket,
    User,
    Users
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { DogManagementSection } from '../components/dashboard/DogManagementSection';
import { NotificationSection } from '../components/dashboard/NotificationSection';
import { ParkModal } from '../components/dashboard/ParkModal';
import useAuth from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import type { Dog, DogPark, NewsAnnouncement, Notification, Profile, Reservation } from '../types';
import { supabase } from '../utils/supabase';
// import { handleVaccineUploadFixed } from '../utils/vaccineUploadFixed'; // TEMP: File not found

export function UserDashboard() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 🚀 Zustand State Management (段階的導入)
  const { 
    user: zustandUser, 
    setUser,
    updateProfile: updateAuthProfile
  } = useAuthStore();
  
  const { 
    setGlobalLoading,
    addNotification,
    removeNotification,
    isGlobalLoading
  } = useUIStore();

  // 従来のState管理（段階的に移行）
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [ownedParks, setOwnedParks] = useState<DogPark[]>([]);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [news, setNews] = useState<NewsAnnouncement[]>([]);
  const [likedDogs, setLikedDogs] = useState<Dog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Local UI state
  const [selectedPark, setSelectedPark] = useState<DogPark | null>(null);
  const [showParkModal, setShowParkModal] = useState(false);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [showDogEditModal, setShowDogEditModal] = useState(false);
  const [isUpdatingDog, setIsUpdatingDog] = useState(false);
  
  // Form state
  const [dogFormData, setDogFormData] = useState({
    name: '',
    breed: '',
    gender: '',
    birthDate: '',
  });
  const [dogImageFile, setDogImageFile] = useState<File | null>(null);
  const [dogImagePreview, setDogImagePreview] = useState<string | null>(null);
  const [rabiesVaccineFile, setRabiesVaccineFile] = useState<File | null>(null);
  const [comboVaccineFile, setComboVaccineFile] = useState<File | null>(null);
  const [rabiesExpiryDate, setRabiesExpiryDate] = useState('');
  const [comboExpiryDate, setComboExpiryDate] = useState('');

  // ペット関連施設管理用のstate
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);
  const [showFacilityModal, setShowFacilityModal] = useState(false);

  // クーポン管理用のstate
  const [userCoupons, setUserCoupons] = useState<any[]>([]);
  const [validCouponsCount, setValidCouponsCount] = useState(0);

  // Subscription hook
  const { isActive: hasSubscription } = useSubscription();

  // 🚀 Enhanced Data Fetching (3段階最適化)
  const fetchDashboardData = useCallback(async () => {
    try {
      setGlobalLoading(true);
      setIsLoading(true);
      
      // フェーズ1: 最優先データ（プロフィール・犬情報）
      const [profileResponse, dogsResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id)
          .single(),
        
        supabase
          .from('dogs')
          .select('*, vaccine_certifications(*)')
          .eq('owner_id', user?.id)
          .order('created_at', { ascending: false })
      ]);

      // 基本情報を即座に表示
      setProfile(profileResponse.data);
      setDogs(dogsResponse.data || []);
      
      // Zustand Storeの更新
      if (profileResponse.data && !zustandUser) {
        setUser({
          id: user?.id || '',
          email: user?.email || '',
          name: profileResponse.data.name,
          role: profileResponse.data.user_type || 'user'
        });
      }

      // 基本的なダッシュボードUIを表示開始
      setIsLoading(false);
      
      // フェーズ2: 重要なデータ（パーク・予約・通知）
      const [
        parksResponse,
        reservationsResponse,
        notificationsResponse
      ] = await Promise.all([
        supabase
          .from('dog_parks')
          .select('*')
          .eq('owner_id', user?.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('reservations')
          .select('*, dog_park:dog_parks(*), dog:dogs(*)')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(5),
        
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user?.id)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // 重要データの更新
      setOwnedParks(parksResponse.data || []);
      setRecentReservations(reservationsResponse.data || []);
      setNotifications(notificationsResponse.data || []);

      // フェーズ3: 追加データ（ニュース・施設・いいね）をバックグラウンドで取得
      void Promise.allSettled([
        // ニュースデータ
        supabase
          .from('news_announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3)
          .then(response => {
            setNews(response.data || []);
          }),
        
        // ペット関連施設データ
        supabase
          .from('pet_facilities')
          .select('*')
          .eq('owner_id', user?.id)
          .order('created_at', { ascending: false })
          .then(response => {
            if (response.data) {
              setFacilities(response.data);
            }
          })
          .catch(() => {
            // Pet facilities not available
          }),
        
        // いいねしたワンちゃんの情報
        supabase
          .from('dog_likes')
          .select(`
            *,
            dog:dogs(
              *,
              vaccine_certifications(*)
            )
          `)
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(10)
          .then(response => {
            if (response.data) {
              setLikedDogs(response.data.map((like: any) => like.dog).filter(Boolean));
            }
          })
          .catch(() => {
            // Dog likes table not available
          }),
        
        // クーポンデータの取得
        supabase
          .from('user_coupons')
          .select(`
            *,
            facility_coupons (
              id, facility_id, title, service_content, discount_value, discount_type, description, start_date, end_date, usage_limit_type, coupon_image_url,
              pet_facilities (name)
            )
          `)
          .eq('user_id', user?.id)
          .is('used_at', null)
          .gte('facility_coupons.end_date', new Date().toISOString())
          .then(response => {
            if (response.data) {
              setUserCoupons(response.data);
              setValidCouponsCount(response.data.length);
            }
          })
          .catch((error) => {
            console.error('❌ [Dashboard] Error loading coupons:', error);
          })
      ]);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('データの取得に失敗しました。ページを再読み込みしてください。');
      addNotification({
        type: 'error',
        title: 'エラー',
        message: 'データの取得に失敗しました',
        duration: 5000
      });
    } finally {
      setGlobalLoading(false);
    }
  }, [user?.id, zustandUser, setUser, setGlobalLoading, addNotification]);

  // 🚦 Data Loading (認証チェックはProtectedRouteが担当)
  useEffect(() => {
    // Data fetching
    fetchDashboardData();

    // Check for success parameter in URL
    if (location.search.includes('success=true')) {
      setShowSuccessMessage(true);
      setSuccess('操作が正常に完了しました！');
      addNotification({
        type: 'success',
        title: '成功',
        message: '操作が正常に完了しました！',
        duration: 3000
      });
      window.history.replaceState({}, document.title, location.pathname);
      setTimeout(() => {
        setShowSuccessMessage(false);
        setSuccess('');
      }, 5000);
    }
  }, [location, fetchDashboardData, addNotification]);

  // 🐕 Dog Management Handlers  
  const handleDogSelect = (dog: Dog) => {
    setSelectedDog(dog);
    
    const birthDate = new Date(dog.birth_date).toISOString().split('T')[0];
    setDogFormData({
      name: dog.name,
      breed: dog.breed,
      gender: dog.gender,
      birthDate: birthDate || '',
    });
    setDogImagePreview(dog.image_url || null);
    
    const cert = dog.vaccine_certifications?.[0];
    setRabiesExpiryDate(cert?.rabies_expiry_date || '');
    setComboExpiryDate(cert?.combo_expiry_date || '');
    
    setShowDogEditModal(true);
  };

  const handleDogImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 基本的なファイル検証
      if (file.size > 10 * 1024 * 1024) {
        setError('ファイルサイズは10MB以下にしてください。');
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError(`サポートされていない画像形式です: ${file.type}`);
        return;
      }

      setDogImageFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setDogImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    } catch (error) {
      console.error('Image processing error:', error);
      setError('画像の処理に失敗しました。別の画像をお試しください。');
    }
  };

  const handleUpdateDog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDog || !user) return;

    try {
      setIsUpdatingDog(true);
      setError('');

      // 基本的なバリデーション
      if (!dogFormData.name || !dogFormData.breed || !dogFormData.gender || !dogFormData.birthDate) {
        setError('すべての必須項目を入力してください。');
        return;
      }

      if (!['オス', 'メス'].includes(dogFormData.gender)) {
        setError('性別は「オス」または「メス」を選択してください');
        return;
      }

      // ワクチン証明書のアップロード処理 - TEMP: Disabled due to missing function
      // if (rabiesVaccineFile || comboVaccineFile) {
      //   const vaccineResult = await handleVaccineUploadFixed(
      //     selectedDog.id,
      //     rabiesVaccineFile || undefined,
      //     comboVaccineFile || undefined,
      //     rabiesExpiryDate,
      //     comboExpiryDate
      //   );
      // 
      //   if (!vaccineResult.success) {
      //     setError(vaccineResult.error || 'ワクチン証明書のアップロードに失敗しました');
      //     return;
      //   }
      // }

      // 犬の情報更新
      const updateData: any = {
        name: dogFormData.name,
        breed: dogFormData.breed,
        gender: dogFormData.gender,
        birth_date: dogFormData.birthDate,
      };

      // 画像アップロード処理
      if (dogImageFile) {
        const fileName = `profile_${Date.now()}_${dogImageFile.name}`;
        const filePath = `${selectedDog.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('dog-images')
          .upload(filePath, dogImageFile, { upsert: true });

        if (uploadError) throw uploadError;

        updateData.image_url = supabase.storage
          .from('dog-images')
          .getPublicUrl(filePath).data.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('dogs')
        .update(updateData)
        .eq('id', selectedDog.id);

      if (updateError) throw updateError;

      setSuccess('ワンちゃんの情報を更新しました！');
      addNotification({
        type: 'success',
        title: '成功',
        message: 'ワンちゃんの情報を更新しました！',
        duration: 3000
      });
      
      setShowDogEditModal(false);
      await fetchDashboardData();

      // フォームリセット
      resetDogForm();

    } catch (error) {
      console.error('Error updating dog:', error);
      const errorMessage = error instanceof Error ? error.message : 'ワンちゃんの情報の更新に失敗しました';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'エラー',
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setIsUpdatingDog(false);
    }
  };

  const handleDeleteDog = async (dog: Dog) => {
    if (!window.confirm(`${dog.name}の情報を削除しますか？\n\nこの操作は元に戻せません。`)) return;

    try {
      setIsUpdatingDog(true);

      const { error: dogError } = await supabase
        .from('dogs')
        .delete()
        .eq('id', dog.id);

      if (dogError) throw dogError;

      setSuccess(`${dog.name}の情報を削除しました。`);
      addNotification({
        type: 'success',
        title: '削除完了',
        message: `${dog.name}の情報を削除しました。`,
        duration: 3000
      });
      
      setShowDogEditModal(false);
      await fetchDashboardData();

    } catch (error) {
      console.error('Error deleting dog:', error);
      setError('ワンちゃんの情報の削除に失敗しました。');
    } finally {
      setIsUpdatingDog(false);
    }
  };

  // 🔔 Notification Handler
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      addNotification({
        type: 'info',
        title: '通知',
        message: '通知を既読にしました',
        duration: 2000
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setError('通知の更新に失敗しました。');
    }
  };

  // 🧹 Utility Functions
  const resetDogForm = () => {
    setDogImageFile(null);
    setRabiesVaccineFile(null);
    setComboVaccineFile(null);
    setRabiesExpiryDate('');
    setComboExpiryDate('');
    setDogImagePreview(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      setError('ログアウトに失敗しました。');
    }
  };

  const handleParkSelect = (park: DogPark) => {
    setSelectedPark(park);
    setShowParkModal(true);
  };

  // 🎨 Loading State with modern design
  if (isLoading || isGlobalLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-blue-400 opacity-20"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8 space-y-8">
      {/* Header with Modern CSS */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            マイページ
          </h1>
          <p className="text-gray-600 mt-1">
            ようこそ、{profile?.name || zustandUser?.name || 'ユーザー'}さん！
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <a
              href="/admin"
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Crown className="w-4 h-4 mr-2" />
              管理者画面
            </a>
          )}
        </div>
      </div>

      {/* Success/Error Messages with Animation */}
      {showSuccessMessage && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800 rounded-lg flex items-center animate-fade-in">
          <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
          操作が正常に完了しました！
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-800 rounded-lg flex items-center">
          <div className="w-5 h-5 mr-2 text-red-600">⚠️</div>
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
          {success}
        </div>
      )}



      {/* Dog Management Section */}
      <DogManagementSection
        dogs={dogs}
        user={user}
        selectedDog={selectedDog}
        showDogEditModal={showDogEditModal}
        isUpdatingDog={isUpdatingDog}
        dogUpdateError={error}
        dogUpdateSuccess={success}
        dogFormData={dogFormData}
        dogImageFile={dogImageFile}
        dogImagePreview={dogImagePreview}
        rabiesVaccineFile={rabiesVaccineFile}
        comboVaccineFile={comboVaccineFile}
        rabiesExpiryDate={rabiesExpiryDate}
        comboExpiryDate={comboExpiryDate}
        onDogSelect={handleDogSelect}
        onCloseDogEditModal={() => setShowDogEditModal(false)}
        onUpdateDog={handleUpdateDog}
        onDeleteDog={handleDeleteDog}
        onDogImageSelect={handleDogImageSelect}
        onDogImageRemove={() => {}}
        onRabiesVaccineSelect={(e) => setRabiesVaccineFile(e.target.files?.[0] || null)}
        onComboVaccineSelect={(e) => setComboVaccineFile(e.target.files?.[0] || null)}
        onFormDataChange={setDogFormData}
        onRabiesExpiryDateChange={setRabiesExpiryDate}
        onComboExpiryDateChange={setComboExpiryDate}
      />

      {/* User Coupons Section */}
      <Card className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <Gift className="w-6 h-6 text-pink-600 mr-2" />
            保有クーポン ({validCouponsCount}枚)
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                void fetchDashboardData();
              }}
              className="px-3 py-1 text-sm bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-md transition-colors"
              title="クーポンデータを更新"
            >
              🔄
            </button>
            <Link to="/my-coupons">
              <Button size="sm" className="bg-pink-600 hover:bg-pink-700 text-white">
                <Ticket className="w-4 h-4 mr-1" />
                一覧表示
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userCoupons.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Gift className="w-12 h-12 text-pink-300 mx-auto mb-3" />
              <p className="text-pink-600 font-medium mb-2">利用可能なクーポンがありません</p>
              <p className="text-pink-500 text-sm">施設でクーポンを取得してみましょう</p>
            </div>
          ) : (
            <>
              {userCoupons.slice(0, 6).map((coupon: any) => (
                <div key={coupon.id} className="p-4 bg-white rounded-lg border border-pink-100 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1 text-gray-900">
                        {coupon.facility_coupons?.title || 'クーポン'}
                      </h3>
                      <p className="text-sm text-pink-600 font-medium mb-2">
                        {coupon.facility_coupons?.pet_facilities?.name || '店舗名'}
                      </p>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                          {coupon.facility_coupons?.discount_value}
                          {coupon.facility_coupons?.discount_type === 'amount' ? '円' : '%'} OFF
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(coupon.facility_coupons?.end_date).toLocaleDateString()}まで
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {coupon.facility_coupons?.description && (
                    <p className="text-gray-600 mb-3 text-sm line-clamp-2">
                      {coupon.facility_coupons.description}
                    </p>
                  )}
                </div>
              ))}
              {userCoupons.length > 6 && (
                <div className="col-span-full text-center mt-4">
                  <Link to="/my-coupons">
                    <Button variant="secondary" size="sm">
                      すべて表示 ({userCoupons.length}枚)
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Owned Parks Management Section with Modern Styling */}
      <Card className="p-6 bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <Building className="w-6 h-6 text-green-600 mr-2" />
            管理中のドッグラン ({ownedParks.length}施設)
          </h2>
          <Link to="/my-parks-management">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
              <Edit className="w-4 h-4 mr-1" />
              一覧・管理
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ownedParks.slice(0, 6).map((park) => {
            // ステータスに応じた表示情報を取得
            const getStatusInfo = (status: string) => {
              switch (status) {
                case 'approved':
                  return {
                    label: '公開中',
                    color: 'bg-green-100 text-green-800',
                    description: ''
                  };
                case 'pending':
                  return {
                    label: '第一審査中',
                    color: 'bg-yellow-100 text-yellow-800',
                    description: '管理者による審査をお待ちください'
                  };
                case 'first_stage_passed':
                  return {
                    label: '第二審査申請可能',
                    color: 'bg-blue-100 text-blue-800',
                    description: '第二審査の申請をしてください'
                  };
                case 'second_stage_waiting':
                  return {
                    label: '第二審査申請準備中',
                    color: 'bg-orange-100 text-orange-800',
                    description: '画像アップロード等の準備を進めてください'
                  };
                case 'second_stage_review':
                  return {
                    label: '第二審査中',
                    color: 'bg-purple-100 text-purple-800',
                    description: '管理者による審査をお待ちください'
                  };
                case 'smart_lock_testing':
                  return {
                    label: 'スマートロック実証検査中',
                    color: 'bg-indigo-100 text-indigo-800',
                    description: '実証検査の完了をお待ちください'
                  };
                case 'rejected':
                  return {
                    label: '却下',
                    color: 'bg-red-100 text-red-800',
                    description: '詳細は管理ページでご確認ください'
                  };
                default:
                  return {
                    label: '審査中',
                    color: 'bg-gray-100 text-gray-800',
                    description: ''
                  };
              }
            };

            const statusInfo = getStatusInfo(park.status);

            return (
              <div key={park.id} className="p-4 bg-white rounded-lg border border-gray-200">
                <h3 className="font-semibold mb-1">{park.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{park.address}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    <div className="text-xs text-gray-500">
                      料金: ¥{park.price_per_hour}/時間
                    </div>
                  </div>
                  
                  {/* ステータス説明 */}
                  {statusInfo.description && (
                    <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                      {statusInfo.description}
                    </div>
                  )}
                  
                  {/* 第二審査申請可能な場合のアクションボタン */}
                  {park.status === 'first_stage_passed' && (
                    <Link to={`/parks/${park.id}/second-stage`} className="block">
                      <button className="w-full text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors">
                        第二審査を申請する
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {ownedParks.length > 6 && (
          <div className="mt-4 text-center">
            <Link to="/my-parks-management">
              <Button variant="secondary" size="sm">
                すべて表示 ({ownedParks.length}施設)
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* 管理中のペット関連施設一覧 */}
      {facilities.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold flex items-center">
                <Building className="w-6 h-6 text-teal-600 mr-2" />
                管理中のペット関連施設 ({facilities.length}施設)
              </h2>
              <p className="text-gray-600 mt-1">ペットショップ、動物病院、トリミングサロンなどの施設管理</p>
            </div>
            <Link to="/my-facilities-management">
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                <Edit className="w-4 h-4 mr-1" />
                一覧・管理
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facilities.slice(0, 4).map((facility: any) => (
              <div key={facility.id} className="p-4 bg-white rounded-lg border border-teal-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{facility.name}</h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
                        facility.status === 'approved' 
                          ? 'bg-green-100 text-green-800'
                          : facility.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {facility.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                        {facility.status === 'pending' && <Clock className="w-3 h-3" />}
                        {facility.status === 'rejected' && <AlertTriangle className="w-3 h-3" />}
                        <span>
                          {facility.status === 'approved' && '公開中'}
                          {facility.status === 'pending' && '審査中'}
                          {facility.status === 'rejected' && '却下'}
                          {facility.status === 'suspended' && '停止中'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {facility.description && (
                  <p className="text-gray-600 mb-3 text-sm line-clamp-2">{facility.description}</p>
                )}

                <div className="space-y-1 mb-3">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-3 h-3 mr-2" />
                    <span className="text-xs">{facility.address}</span>
                  </div>
                  {facility.phone && (
                    <div className="flex items-center text-gray-600">
                      <Users className="w-3 h-3 mr-2" />
                      <span className="text-xs">{facility.phone}</span>
                    </div>
                  )}
                  {facility.website && (
                    <div className="flex items-center text-gray-600">
                      <Globe className="w-3 h-3 mr-2" />
                      <a 
                        href={facility.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-teal-600 hover:text-teal-800"
                      >
                        公式サイト
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    {facility.category_name || 'その他施設'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {facilities.length > 4 && (
            <div className="mt-4 text-center">
              <Link to="/my-facilities-management">
                <Button variant="secondary" size="sm">
                  すべて表示 ({facilities.length}施設)
                </Button>
              </Link>
            </div>
          )}
        </Card>
      )}

      {/* Quick Actions Section with Modern CSS Grid */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <span className="text-2xl mr-2">🚀</span>
          クイックアクション
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/parks" className="group">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border border-blue-200">
              <MapPin className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-blue-900 mb-1">ドッグラン検索</h3>
              <p className="text-sm text-blue-700">近くのドッグランを探す</p>
            </div>
          </Link>
          
          <Link to="/community" className="group">
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl hover:from-green-100 hover:to-emerald-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border border-green-200">
              <Users className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-green-900 mb-1">コミュニティ</h3>
              <p className="text-sm text-green-700">他の飼い主と交流</p>
            </div>
          </Link>
          
          <Link to="/petshop" className="group">
            <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl hover:from-purple-100 hover:to-violet-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border border-purple-200">
              <ShoppingBag className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-purple-900 mb-1">ペットショップ</h3>
              <p className="text-sm text-purple-700">ペット用品を購入</p>
            </div>
          </Link>
          
          <Link to="/news" className="group">
            <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl hover:from-orange-100 hover:to-amber-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border border-orange-200">
              <Bell className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="font-semibold text-orange-900 mb-1">新着情報</h3>
              <p className="text-sm text-orange-700">最新のお知らせ</p>
            </div>
          </Link>


          
          <Link to="/park-registration-agreement" className="group">
            <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl hover:from-yellow-100 hover:to-orange-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border-2 border-orange-200">
              <Building className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="font-semibold text-orange-900 mb-1">ドッグランオーナー募集</h3>
              <p className="text-sm text-orange-700 mb-2">あなたのドッグランを登録</p>
              <div className="text-xs text-orange-600 font-semibold bg-orange-100 px-2 py-1 rounded-full inline-block">
                💰 収益化のチャンス！
              </div>
            </div>
          </Link>
          
          <Link to="/facility-registration" className="group">
            <div className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl hover:from-teal-100 hover:to-cyan-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border-2 border-teal-200">
              <div className="flex items-center mb-3">
                <Heart className="w-6 h-6 text-teal-600 mr-2" />
                <ShoppingBag className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-teal-900 mb-1">ペット関連施設登録</h3>
              <p className="text-sm text-teal-700 mb-2">店舗・宿泊施設・サロンなど</p>
              <div className="text-xs text-teal-600 font-semibold bg-teal-100 px-2 py-1 rounded-full inline-block">
                🎉 今なら無料掲載！
              </div>
            </div>
          </Link>
          
          <Link to="/profile-settings" className="group">
            <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl hover:from-indigo-100 hover:to-purple-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border border-indigo-200">
              <User className="w-8 h-8 text-indigo-600 mb-3" />
              <h3 className="font-semibold text-indigo-900 mb-1">登録情報</h3>
              <p className="text-sm text-indigo-700">住所・氏名・連絡先を編集</p>
            </div>
          </Link>
        </div>
      </Card>

      {/* Notifications Section */}
      {notifications.length > 0 && (
        <NotificationSection
          notifications={notifications}
          onMarkAsRead={markNotificationAsRead}
        />
      )}



      {/* Park Modal */}
      {showParkModal && selectedPark && (
        <ParkModal
          park={selectedPark}
          onClose={() => setShowParkModal(false)}
        />
      )}
    </div>
  );
}

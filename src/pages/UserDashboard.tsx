import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  User, 
  Crown,
  Building,
  LogOut,
  Bell,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Users,
  ShoppingBag,
  Heart
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionButton } from '../components/SubscriptionButton';
import { DogManagementSection } from '../components/dashboard/DogManagementSection';
import { NotificationSection } from '../components/dashboard/NotificationSection';
import { StatsSection } from '../components/dashboard/StatsSection';
import { ParkCard } from '../components/dashboard/ParkCard';
import { ParkModal } from '../components/dashboard/ParkModal';
import { ReservationCard } from '../components/dashboard/ReservationCard';
import { validateVaccineFile } from '../utils/vaccineUpload';
import { handleVaccineUploadFixed } from '../utils/vaccineUploadFixed';
import type { Dog, DogPark, Profile, Reservation, Notification, NewsAnnouncement } from '../types';

export function UserDashboard() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [ownedParks, setOwnedParks] = useState<DogPark[]>([]);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [news, setNews] = useState<NewsAnnouncement[]>([]);
  const [likedDogs, setLikedDogs] = useState<Dog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isActive: hasSubscription } = useSubscription();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Park modal state
  const [selectedPark, setSelectedPark] = useState<DogPark | null>(null);
  const [showParkModal, setShowParkModal] = useState(false);
  
  // Dog editing state
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [showDogEditModal, setShowDogEditModal] = useState(false);
  const [isUpdatingDog, setIsUpdatingDog] = useState(false);
  const [dogUpdateError, setDogUpdateError] = useState('');
  const [dogUpdateSuccess, setDogUpdateSuccess] = useState('');
  const [dogFormData, setDogFormData] = useState({
    name: '',
    breed: '',
    gender: '',
    birthDate: '',
  });
  const [dogImageFile, setDogImageFile] = useState<File | null>(null);
  const [dogImagePreview, setDogImagePreview] = useState<string | null>(null);
  
  // Vaccine certificate state
  const [rabiesVaccineFile, setRabiesVaccineFile] = useState<File | null>(null);
  const [comboVaccineFile, setComboVaccineFile] = useState<File | null>(null);
  const [rabiesExpiryDate, setRabiesExpiryDate] = useState('');
  const [comboExpiryDate, setComboExpiryDate] = useState('');
  
  const fetchDashboardData = async () => {
    try {
      const [
        profileResponse,
        dogsResponse,
        parksResponse,
        reservationsResponse,
        notificationsResponse,
        newsResponse
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id)
          .single(),
        
        supabase
          .from('dogs')
          .select('*, vaccine_certifications(*)')
          .eq('owner_id', user?.id)
          .order('created_at', { ascending: false }),
        
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
          .limit(5),
        
        supabase
          .from('news_announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      // いいねしたワンちゃんの情報を別途取得（エラーハンドリング付き）
      let likedDogsData: any[] = [];
      try {
        const likedDogsResponse = await supabase
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
          .limit(10);
        
        if (likedDogsResponse.data) {
          likedDogsData = likedDogsResponse.data;
        }
      } catch (likesError) {
        console.warn('Dog likes table not available:', likesError);
        // テーブルが存在しない場合はスキップ
      }

      // Error handling
      [profileResponse, dogsResponse, parksResponse, reservationsResponse, notificationsResponse, newsResponse]
        .forEach((response, index) => {
          if (response.error) {
            console.error(`Error in response ${index}:`, response.error);
          }
        });

      setProfile(profileResponse.data);
      setDogs(dogsResponse.data || []);
      setOwnedParks(parksResponse.data || []);
      setRecentReservations(reservationsResponse.data || []);
      setNotifications(notificationsResponse.data || []);
      setNews(newsResponse.data || []);
      setLikedDogs(likedDogsData.map((like: any) => like.dog).filter(Boolean));
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
    
    // Check for success parameter in URL
    if (location.search.includes('success=true')) {
      setShowSuccessMessage(true);
      window.history.replaceState({}, document.title, location.pathname);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, [user, navigate, location]);

  const handleParkSelect = (park: DogPark) => {
    setSelectedPark(park);
    setShowParkModal(true);
  };

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
    if (file) {
      try {
        if (file.size > 10 * 1024 * 1024) {
          setDogUpdateError('ファイルサイズは10MB以下にしてください。');
          return;
        }
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          setDogUpdateError(`サポートされていない画像形式です: ${file.type}`);
          return;
        }

        setDogImageFile(file);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setDogImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        setDogUpdateError('');
      } catch (error) {
        console.error('Image processing error:', error);
        setDogUpdateError('画像の処理に失敗しました。別の画像をお試しください。');
      }
    }
  };

  const handleDogImageRemove = async () => {
    if (!selectedDog?.image_url) return;
    
    try {
      setIsUpdatingDog(true);
      setDogUpdateError('');
      
      const { error: dbError } = await supabase
        .from('dogs')
        .update({ image_url: null })
        .eq('id', selectedDog.id);
      
      if (dbError) {
        setDogUpdateError('画像の削除に失敗しました。');
        return;
      }
      
      setDogImageFile(null);
      setDogImagePreview(null);
      
      await fetchDashboardData();
      
      setDogUpdateSuccess('画像を削除しました。');
      setTimeout(() => setDogUpdateSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error removing dog image:', error);
      setDogUpdateError('画像の削除に失敗しました。');
    } finally {
      setIsUpdatingDog(false);
    }
  };

  const handleRabiesVaccineSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateVaccineFile(file);
      if (!validation.isValid) {
        setDogUpdateError(validation.error || 'ファイルの検証に失敗しました');
        return;
      }
      setRabiesVaccineFile(file);
      setDogUpdateError('');
    } else {
      setRabiesVaccineFile(null);
    }
  };

  const handleComboVaccineSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateVaccineFile(file);
      if (!validation.isValid) {
        setDogUpdateError(validation.error || 'ファイルの検証に失敗しました');
        return;
      }
      setComboVaccineFile(file);
      setDogUpdateError('');
    } else {
      setComboVaccineFile(null);
    }
  };

  const handleUpdateDog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDog || !user) return;

    setIsUpdatingDog(true);
    setDogUpdateError('');
    setDogUpdateSuccess('');

    try {
      // Basic validation
      if (!dogFormData.name || !dogFormData.breed || !dogFormData.gender || !dogFormData.birthDate) {
        throw new Error('すべての必須項目を入力してください。');
      }

      if (!['オス', 'メス'].includes(dogFormData.gender)) {
        throw new Error('性別は「オス」または「メス」を選択してください');
      }

             // Handle vaccine uploads if files are selected
       let vaccineUploadResult = null;
       if (rabiesVaccineFile || comboVaccineFile) {
         vaccineUploadResult = await handleVaccineUploadFixed(
           selectedDog.id,
           rabiesVaccineFile || undefined,
           comboVaccineFile || undefined,
           rabiesExpiryDate,
           comboExpiryDate
         );

        if (!vaccineUploadResult.success) {
          throw new Error(vaccineUploadResult.error || 'ワクチン証明書のアップロードに失敗しました');
        }
      }

      // Update dog data
      const updateData: any = {
        name: dogFormData.name,
        breed: dogFormData.breed,
        gender: dogFormData.gender,
        birth_date: dogFormData.birthDate,
      };

      // Handle image upload if a new file is selected
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

      setDogUpdateSuccess('ワンちゃんの情報を更新しました！');
      setShowDogEditModal(false);
      await fetchDashboardData();

      // Reset form
      setDogImageFile(null);
      setRabiesVaccineFile(null);
      setComboVaccineFile(null);
      setRabiesExpiryDate('');
      setComboExpiryDate('');

    } catch (error) {
      console.error('Error updating dog:', error);
      setDogUpdateError(error instanceof Error ? error.message : 'ワンちゃんの情報の更新に失敗しました');
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

      setDogUpdateSuccess(`${dog.name}の情報を削除しました。`);
      setShowDogEditModal(false);
      await fetchDashboardData();

    } catch (error) {
      console.error('Error deleting dog:', error);
      setDogUpdateError('ワンちゃんの情報の削除に失敗しました。');
    } finally {
      setIsUpdatingDog(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            マイページ
          </h1>
          <p className="text-gray-600 mt-1">
            ようこそ、{profile?.name || 'ユーザー'}さん！
          </p>
        </div>
        <div className="flex items-center space-x-4">
                     {isAdmin && (
             <a
               href="/admin"
               className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium inline-flex items-center"
             >
               <Crown className="w-4 h-4 mr-2" />
               管理者画面
             </a>
           )}
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          操作が正常に完了しました！
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-8">
        {/* Statistics Section */}
        <StatsSection
          dogs={dogs}
          ownedParks={ownedParks}
          recentReservations={recentReservations}
          profile={profile}
        />

        {/* Dog Management Section */}
        <DogManagementSection
          dogs={dogs}
          user={user}
          selectedDog={selectedDog}
          showDogEditModal={showDogEditModal}
          isUpdatingDog={isUpdatingDog}
          dogUpdateError={dogUpdateError}
          dogUpdateSuccess={dogUpdateSuccess}
          dogFormData={dogFormData}
          dogImageFile={dogImageFile}
          dogImagePreview={dogImagePreview}
          rabiesVaccineFile={rabiesVaccineFile}
          comboVaccineFile={comboVaccineFile}
          rabiesExpiryDate={rabiesExpiryDate}
          comboExpiryDate={comboExpiryDate}
          onDogSelect={handleDogSelect}
          onCloseDogEditModal={() => setShowDogEditModal(false)}
          onUpdateDog={(e) => void handleUpdateDog(e)}
          onDeleteDog={(id) => void handleDeleteDog(id)}
          onDogImageSelect={handleDogImageSelect}
          onDogImageRemove={() => void handleDogImageRemove()}
          onRabiesVaccineSelect={handleRabiesVaccineSelect}
          onComboVaccineSelect={handleComboVaccineSelect}
          onFormDataChange={setDogFormData}
          onRabiesExpiryDateChange={setRabiesExpiryDate}
          onComboExpiryDateChange={setComboExpiryDate}
        />

        {/* Owned Parks Management Section */}
        {ownedParks.length > 0 && (
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Building className="w-6 h-6 text-green-600 mr-2" />
                管理中のドッグラン ({ownedParks.length}施設)
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedParks.map((park) => (
                <ParkCard
                  key={park.id}
                  park={park}
                  onSelect={handleParkSelect}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Quick Actions Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">クイックアクション</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link to="/parks" className="group">
              <div className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <MapPin className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-medium text-blue-900">ドッグラン検索</h3>
                <p className="text-sm text-blue-700">近くのドッグランを探す</p>
              </div>
            </Link>
            
            <Link to="/community" className="group">
              <div className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <Users className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="font-medium text-green-900">コミュニティ</h3>
                <p className="text-sm text-green-700">他の飼い主と交流</p>
              </div>
            </Link>
            
            <Link to="/petshop" className="group">
              <div className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <ShoppingBag className="w-8 h-8 text-purple-600 mb-2" />
                <h3 className="font-medium text-purple-900">ペットショップ</h3>
                <p className="text-sm text-purple-700">ペット用品を購入</p>
              </div>
            </Link>
            
            <Link to="/news" className="group">
              <div className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                <Bell className="w-8 h-8 text-orange-600 mb-2" />
                <h3 className="font-medium text-orange-900">新着情報</h3>
                <p className="text-sm text-orange-700">最新のお知らせ</p>
              </div>
            </Link>
            
            {/* 新規追加：ドッグランオーナー募集 */}
            <Link to="/park-registration" className="group">
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg hover:from-yellow-100 hover:to-orange-100 transition-colors border-2 border-orange-200">
                <Building className="w-8 h-8 text-orange-600 mb-2" />
                <h3 className="font-medium text-orange-900">ドッグランオーナー募集</h3>
                <p className="text-sm text-orange-700">あなたのドッグランを登録</p>
                <div className="mt-2 text-xs text-orange-600 font-medium">
                  🎯 収益化のチャンス！
                </div>
              </div>
            </Link>
            
            {/* 新規追加：ペット関連施設登録 */}
            <Link to="/facility-registration" className="group">
              <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg hover:from-teal-100 hover:to-cyan-100 transition-colors border-2 border-teal-200">
                <div className="flex items-center mb-2">
                  <Heart className="w-6 h-6 text-teal-600 mr-2" />
                  <ShoppingBag className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-medium text-teal-900">ペット関連施設登録</h3>
                <p className="text-sm text-teal-700">店舗・宿泊施設・サロンなど</p>
                <div className="mt-2 text-xs text-teal-600 font-medium">
                  🎉 今なら無料掲載！
                </div>
              </div>
            </Link>
          </div>
        </Card>

        {/* Notifications Section */}
        {notifications.length > 0 && (
          <NotificationSection
            notifications={notifications}
            onMarkAsRead={(id) => void markNotificationAsRead(id)}
          />
        )}

        {/* Liked Dogs Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Heart className="w-6 h-6 text-pink-600 mr-2" />
            いいねしたワンちゃん ({likedDogs.length}匹)
          </h2>
          
          {likedDogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">まだいいねしたワンちゃんはいません</p>
              <p className="text-sm">
                気になるワンちゃんがいたら、いいねしてみましょう！
              </p>
              <Link to="/community" className="mt-4 inline-block">
                <Button size="sm">
                  コミュニティを見る
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {likedDogs.map((dog) => (
                <Link
                  key={dog.id}
                  to={`/dog/${dog.id}`}
                  className="group block bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="aspect-square bg-gray-200 overflow-hidden">
                    {dog.image_url ? (
                      <img
                        src={dog.image_url}
                        alt={dog.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                        🐕
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {dog.name}{dog.gender === 'オス' ? 'くん' : 'ちゃん'}
                      </h3>
                      <Heart className="w-4 h-4 text-pink-500 fill-current" />
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{dog.breed}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{dog.gender === 'オス' ? '♂' : '♀'} {dog.gender}</span>
                      {(dog as any).like_count > 0 && (
                        <span>{(dog as any).like_count}件のいいね</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          
          {likedDogs.length >= 10 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">最新の10匹を表示中</p>
            </div>
          )}
        </Card>


      </div>

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
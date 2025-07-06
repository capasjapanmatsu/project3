import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  User, 
  PawPrint, 
  Calendar, 
  Key, 
  ShoppingBag, 
  Users, 
  Bell,
  CreditCard,
  Crown,
  Building,
  MapPin,
  History,
  Package,
  LogOut,
  CheckCircle,
  Plus
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionButton } from '../components/SubscriptionButton';
import { DogCard, DogEditModal } from '../components/dashboard/DogCard';
import { ParkCard } from '../components/dashboard/ParkCard';
import { ParkModal } from '../components/dashboard/ParkModal';
import { ReservationCard } from '../components/dashboard/ReservationCard';
import { NotificationCard } from '../components/dashboard/NotificationCard';
import { StatCard } from '../components/dashboard/StatCard';
import type { Dog, DogPark, Profile, Reservation, Notification } from '../types';

export function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [ownedParks, setOwnedParks] = useState<DogPark[]>([]);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isActive: hasSubscription } = useSubscription();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [selectedPark, setSelectedPark] = useState<DogPark | null>(null);
  const [showParkModal, setShowParkModal] = useState(false);
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
  const [recentDogs, setRecentDogs] = useState<Dog[]>([]);
  const [recentDogsError, setRecentDogsError] = useState<string | null>(null);
  // ワクチン証明書関連の状態
  const [rabiesVaccineFile, setRabiesVaccineFile] = useState<File | null>(null);
  const [comboVaccineFile, setComboVaccineFile] = useState<File | null>(null);
  const [rabiesExpiryDate, setRabiesExpiryDate] = useState('');
  const [comboExpiryDate, setComboExpiryDate] = useState('');

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
    
    // 最近仲間入りしたワンちゃんを取得（誰でも閲覧可能）
    const fetchRecentDogs = async () => {
      const { data, error } = await supabase
        .from('dogs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) {
        setRecentDogsError(error.message || 'データ取得エラー');
      } else {
        setRecentDogs(data || []);
        setRecentDogsError(null);
      }
    };
    fetchRecentDogs();
    
    // Check for success parameter in URL
    if (location.search.includes('success=true')) {
      setShowSuccessMessage(true);
      // Remove the query parameter
      window.history.replaceState({}, document.title, location.pathname);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    }
  }, [user, location]);

  const fetchDashboardData = async () => {
    try {
      const [
        profileResponse,
        dogsResponse,
        parksResponse,
        reservationsResponse,
        notificationsResponse
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
          .limit(5)
      ]);

      if (profileResponse.error) throw profileResponse.error;
      if (dogsResponse.error) throw dogsResponse.error;
      if (parksResponse.error) throw parksResponse.error;
      if (reservationsResponse.error) throw reservationsResponse.error;
      if (notificationsResponse.error) throw notificationsResponse.error;

      setProfile(profileResponse.data);
      setDogs(dogsResponse.data || []);
      setOwnedParks(parksResponse.data || []);
      setRecentReservations(reservationsResponse.data || []);
      setNotifications(notificationsResponse.data || []);
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

  const handleParkSelect = (park: DogPark) => {
    setSelectedPark(park);
    setShowParkModal(true);
  };

  const handleDogSelect = (dog: Dog) => {
    setSelectedDog(dog);
    // Format the birth date to YYYY-MM-DD for the input field
    const birthDate = new Date(dog.birth_date).toISOString().split('T')[0];
    setDogFormData({
      name: dog.name,
      breed: dog.breed,
      gender: dog.gender,
      birthDate: birthDate,
    });
    setDogImagePreview(dog.image_url || null);
    
    // ワクチン証明書の情報を設定
    const cert = dog.vaccine_certifications?.[0];
    if (cert) {
      setRabiesExpiryDate(cert.rabies_expiry_date || '');
      setComboExpiryDate(cert.combo_expiry_date || '');
    } else {
      setRabiesExpiryDate('');
      setComboExpiryDate('');
    }
    
    setShowDogEditModal(true);
  };

  const handleDogImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ファイルサイズチェック（10MB以下）
      if (file.size > 10 * 1024 * 1024) {
        setDogUpdateError('画像ファイルは10MB以下にしてください。');
        return;
      }

      // ファイル形式チェック
      if (!file.type.startsWith('image/')) {
        setDogUpdateError('画像ファイルを選択してください。');
        return;
      }

      setDogImageFile(file);
      
      // プレビュー画像を作成
      const reader = new FileReader();
      reader.onload = (e) => {
        setDogImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setDogUpdateError('');
    }
  };

  const handleDogImageRemove = () => {
    setDogImageFile(null);
    setDogImagePreview(selectedDog?.image_url || null);
  };

  const handleRabiesVaccineSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setDogUpdateError('ワクチン証明書は10MB以下にしてください。');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setDogUpdateError('画像ファイルを選択してください。');
        return;
      }
      setRabiesVaccineFile(file);
      setDogUpdateError('');
    } else {
      // ファイルが選択されていない場合（削除の場合）
      setRabiesVaccineFile(null);
    }
  };

  const handleComboVaccineSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setDogUpdateError('ワクチン証明書は10MB以下にしてください。');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setDogUpdateError('画像ファイルを選択してください。');
        return;
      }
      setComboVaccineFile(file);
      setDogUpdateError('');
    } else {
      // ファイルが選択されていない場合（削除の場合）
      setComboVaccineFile(null);
    }
  };

  const handleUpdateDog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDog) return;
    
    setIsUpdatingDog(true);
    setDogUpdateError('');
    setDogUpdateSuccess('');
    
    try {
      // Validate gender to match database constraints
      let normalizedGender: string;
      if (dogFormData.gender === 'オス' || dogFormData.gender === 'male' || dogFormData.gender.toLowerCase() === 'male') {
        normalizedGender = 'オス';
      } else if (dogFormData.gender === 'メス' || dogFormData.gender === 'female' || dogFormData.gender.toLowerCase() === 'female') {
        normalizedGender = 'メス';
      } else {
        throw new Error('性別は「オス」または「メス」を選択してください');
      }
      
      // 画像のアップロード処理
      let imageUrl = selectedDog.image_url;
      
      if (dogImageFile) {
        try {
          // ファイル名を生成
          const fileExt = dogImageFile.name.split('.').pop() || 'jpg';
          const timestamp = Date.now();
          const fileName = `${selectedDog.id}/profile_${timestamp}.${fileExt}`;
          
          // Supabaseストレージにアップロード
          const { error: uploadError } = await supabase.storage
            .from('dog-images')
            .upload(fileName, dogImageFile, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.error('Image upload error:', uploadError);
            throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
          }

          // 公開URLを取得
          const { data: { publicUrl } } = supabase.storage
            .from('dog-images')
            .getPublicUrl(fileName);
          
          imageUrl = publicUrl;
        } catch (imageError) {
          console.error('Image processing error:', imageError);
          // 画像エラーは警告として扱い、更新は続行
          setDogUpdateError('画像のアップロードに失敗しましたが、ワンちゃんの情報は更新されました。');
        }
      }
      
      // 犬の情報を更新
      const { error } = await supabase
        .from('dogs')
        .update({
          name: dogFormData.name,
          breed: dogFormData.breed,
          gender: normalizedGender,
          birth_date: dogFormData.birthDate,
          image_url: imageUrl,
        })
        .eq('id', selectedDog.id);
      
      if (error) throw error;

      // ワクチン証明書のアップロード処理
      if (rabiesVaccineFile || comboVaccineFile) {
        try {
          let rabiesPath = null;
          let comboPath = null;

          // 狂犬病ワクチン証明書のアップロード
          if (rabiesVaccineFile) {
            const rabiesFileExt = rabiesVaccineFile.name.split('.').pop() || 'jpg';
            const rabiesFileName = `${selectedDog.id}/rabies_${Date.now()}.${rabiesFileExt}`;
            
            const { error: rabiesUploadError } = await supabase.storage
              .from('vaccine-certificates')
              .upload(rabiesFileName, rabiesVaccineFile, {
                cacheControl: '3600',
                upsert: true
              });

            if (rabiesUploadError) {
              console.error('Rabies vaccine upload error:', rabiesUploadError);
              throw new Error(`狂犬病ワクチン証明書のアップロードに失敗しました: ${rabiesUploadError.message}`);
            }

            const { data: { publicUrl: rabiesPublicUrl } } = supabase.storage
              .from('vaccine-certificates')
              .getPublicUrl(rabiesFileName);
            
            rabiesPath = rabiesPublicUrl;
          }

          // 混合ワクチン証明書のアップロード
          if (comboVaccineFile) {
            const comboFileExt = comboVaccineFile.name.split('.').pop() || 'jpg';
            const comboFileName = `${selectedDog.id}/combo_${Date.now()}.${comboFileExt}`;
            
            const { error: comboUploadError } = await supabase.storage
              .from('vaccine-certificates')
              .upload(comboFileName, comboVaccineFile, {
                cacheControl: '3600',
                upsert: true
              });

            if (comboUploadError) {
              console.error('Combo vaccine upload error:', comboUploadError);
              throw new Error(`混合ワクチン証明書のアップロードに失敗しました: ${comboUploadError.message}`);
            }

            const { data: { publicUrl: comboPublicUrl } } = supabase.storage
              .from('vaccine-certificates')
              .getPublicUrl(comboFileName);
            
            comboPath = comboPublicUrl;
          }

          // 既存のワクチン証明書レコードを確認
          const { data: existingCert } = await supabase
            .from('vaccine_certifications')
            .select('*')
            .eq('dog_id', selectedDog.id)
            .single();

          if (existingCert) {
            // 既存のレコードを更新
            const updateData: any = {
              status: 'pending' // 新しい証明書は承認待ち状態に
            };
            
            if (rabiesPath) {
              updateData.rabies_vaccine_image = rabiesPath;
              updateData.rabies_expiry_date = rabiesExpiryDate;
            }
            
            if (comboPath) {
              updateData.combo_vaccine_image = comboPath;
              updateData.combo_expiry_date = comboExpiryDate;
            }

            const { error: updateCertError } = await supabase
              .from('vaccine_certifications')
              .update(updateData)
              .eq('dog_id', selectedDog.id);

            if (updateCertError) {
              console.error('Certificate update error:', updateCertError);
              throw updateCertError;
            }
          } else {
            // 新しいレコードを作成
            const { error: insertCertError } = await supabase
              .from('vaccine_certifications')
              .insert([{
                dog_id: selectedDog.id,
                rabies_vaccine_image: rabiesPath,
                combo_vaccine_image: comboPath,
                rabies_expiry_date: rabiesExpiryDate,
                combo_expiry_date: comboExpiryDate,
                status: 'pending'
              }]);

            if (insertCertError) {
              console.error('Certificate insert error:', insertCertError);
              throw insertCertError;
            }
          }
        } catch (vaccineError) {
          console.error('Vaccine certificate error:', vaccineError);
          setDogUpdateError('ワクチン証明書のアップロードに失敗しました。');
        }
      }
      
      setDogUpdateSuccess('ワンちゃん情報を更新しました');
      
      // Refresh dogs data
      const { data, error: fetchError } = await supabase
        .from('dogs')
        .select('*, vaccine_certifications(*)')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setDogs(data || []);
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowDogEditModal(false);
        setDogUpdateSuccess('');
        setDogImageFile(null);
        setDogImagePreview(null);
        setRabiesVaccineFile(null);
        setComboVaccineFile(null);
        setRabiesExpiryDate('');
        setComboExpiryDate('');
      }, 2000);
      
    } catch (error) {
      console.error('Error updating dog:', error);
      setDogUpdateError((error as Error).message || 'ワンちゃん情報の更新に失敗しました');
    } finally {
      setIsUpdatingDog(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      
      // 通知一覧を更新
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 通知一覧（新しい順） */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">お知らせ・通知</h2>
        {notifications.length === 0 ? (
          <p>通知はありません</p>
        ) : (
          <ul>
            {notifications
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map(notification => (
                <li key={notification.id} className="mb-2">
                  {notification.message}
                  <span className="text-xs text-gray-500 ml-2">{new Date(notification.created_at).toLocaleString('ja-JP')}</span>
                </li>
              ))}
          </ul>
        )}
      </Card>

      {/* サブスクリプション成功メッセージ */}
      {showSuccessMessage && (
        <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="font-medium">サブスクリプションの登録が完了しました！</p>
            <p className="text-sm mt-1">全国のドッグランが使い放題になりました。ペットショップでの10%割引も適用されます。</p>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            こんにちは、{profile?.name || 'ユーザー'}さん
          </h1>
          <p className="text-gray-600">ドッグパークJPへようこそ</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/access-control">
            <Button className="bg-green-600 hover:bg-green-700">
              <Key className="w-4 h-4 mr-2" />
              入退場
            </Button>
          </Link>
        </div>
      </div>

      {/* サブスクリプション状況 */}
      {hasSubscription ? (
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="w-8 h-8" />
              <div>
                <h3 className="text-lg font-semibold">サブスクリプション会員</h3>
                <p className="text-sm opacity-90">全国のドッグラン使い放題 + ペットショップ10%OFF</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">月額</p>
              <p className="text-2xl font-bold">¥3,800</p>
              <Link to="/subscription">
                <Button size="sm" className="mt-2 bg-white text-purple-600 hover:bg-gray-100 hover:text-gray-900">
                  詳細を見る
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="w-8 h-8" />
              <div>
                <h3 className="text-lg font-semibold">サブスクリプションでもっとお得に！</h3>
                <p className="text-sm opacity-90">月額3,800円で全国のドッグラン使い放題</p>
              </div>
            </div>
            <SubscriptionButton hasSubscription={hasSubscription} className="bg-white text-purple-600 hover:bg-gray-100" />
          </div>
        </Card>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          icon={<PawPrint className="w-8 h-8 text-blue-600" />}
          count={dogs.length}
          label="登録済みワンちゃん"
          linkTo="/register-dog"
          linkText="管理する"
          iconColor="text-blue-600"
        />
        
        <StatCard 
          icon={<Calendar className="w-8 h-8 text-green-600" />}
          count={recentReservations.length}
          label="今月の予約"
          linkTo="/parks"
          linkText="予約する"
          iconColor="text-green-600"
        />
        
        <StatCard 
          icon={<Bell className="w-8 h-8 text-orange-600" />}
          count={notifications.length}
          label="未読通知"
          linkTo="/community"
          linkText="確認する"
          iconColor="text-orange-600"
        />
        
        <StatCard 
          icon={<Building className="w-8 h-8 text-purple-600" />}
          count={ownedParks.length > 0 ? ownedParks.length : "登録する"}
          label={ownedParks.length > 0 ? "運営中ドッグラン" : "ドッグラン登録"}
          linkTo={ownedParks.length > 0 ? "/owner-dashboard" : "/park-registration-agreement"}
          linkText={ownedParks.length > 0 ? "管理する" : "登録する"}
          iconColor="text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-8">
          {/* ワンちゃん管理 */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <PawPrint className="w-6 h-6 text-blue-600 mr-2" />
                ワンちゃん管理
              </h2>
              <Link to="/register-dog">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  新規登録
                </Button>
              </Link>
            </div>
            
            {dogs.length === 0 ? (
              <div className="text-center py-8">
                <PawPrint className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">まだワンちゃんが登録されていません</p>
                <Link to="/register-dog">
                  <Button>ワンちゃんを登録する</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {dogs.map((dog) => (
                  <DogCard 
                    key={dog.id} 
                    dog={dog} 
                    onEdit={handleDogSelect} 
                  />
                ))}
              </div>
            )}
          </Card>

          {/* ドッグラン管理 */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Building className="w-6 h-6 text-purple-600 mr-2" />
                ドッグラン管理
              </h2>
              <Link to="/park-registration-agreement">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  新規登録
                </Button>
              </Link>
            </div>
            
            {ownedParks.length === 0 ? (
              <div className="text-center py-8">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">まだドッグランが登録されていません</p>
                <Link to="/park-registration-agreement">
                  <Button>ドッグランを登録する</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {ownedParks.map((park) => (
                  <ParkCard 
                    key={park.id} 
                    park={park} 
                    onSelect={handleParkSelect} 
                  />
                ))}
              </div>
            )}
          </Card>

          {/* 最近の予約 */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Calendar className="w-6 h-6 text-green-600 mr-2" />
                最近の予約
              </h2>
              <Link to="/parks">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  新規予約
                </Button>
              </Link>
            </div>
            
            {recentReservations.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">まだ予約がありません</p>
                <Link to="/parks">
                  <Button>ドッグランを予約する</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReservations.map((reservation) => (
                  <ReservationCard 
                    key={reservation.id} 
                    reservation={reservation} 
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-8">
          {/* 最近仲間入りしたワンちゃん */}
          <Card>
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <PawPrint className="w-5 h-5 text-blue-600 mr-2" />
              最近仲間入りしたワンちゃん
            </h2>
            
            {recentDogsError ? (
              <div className="text-center py-4">
                <p className="text-red-600 text-sm">{recentDogsError}</p>
              </div>
            ) : recentDogs.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm">まだワンちゃんが登録されていません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDogs.map((dog) => (
                  <div key={dog.id} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {dog.image_url ? (
                        <img 
                          src={dog.image_url} 
                          alt={dog.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PawPrint className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{dog.name}</h3>
                      <p className="text-xs text-gray-500">{dog.breed}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* クイックアクション */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">クイックアクション</h2>
            <div className="space-y-3">
              <Link to="/parks" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <MapPin className="w-4 h-4 mr-2" />
                  ドッグランを探す
                </Button>
              </Link>
              <Link to="/pet-shop" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  ペットショップ
                </Button>
              </Link>
              <Link to="/community" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  コミュニティ
                </Button>
              </Link>
              <Link to="/order-history" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <History className="w-4 h-4 mr-2" />
                  注文履歴
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* 犬の編集モーダル */}
      {showDogEditModal && (
        <DogEditModal
          dog={selectedDog}
          isUpdating={isUpdatingDog}
          error={dogUpdateError}
          success={dogUpdateSuccess}
          dogFormData={dogFormData}
          dogImagePreview={dogImagePreview}
          onClose={() => setShowDogEditModal(false)}
          onSubmit={handleUpdateDog}
          onFormChange={setDogFormData}
          onImageSelect={handleDogImageSelect}
          onImageRemove={handleDogImageRemove}
          // ワクチン証明書関連の props
          rabiesVaccineFile={rabiesVaccineFile}
          comboVaccineFile={comboVaccineFile}
          rabiesExpiryDate={rabiesExpiryDate}
          comboExpiryDate={comboExpiryDate}
          onRabiesVaccineSelect={handleRabiesVaccineSelect}
          onComboVaccineSelect={handleComboVaccineSelect}
          onRabiesExpiryDateChange={setRabiesExpiryDate}
          onComboExpiryDateChange={setComboExpiryDate}
        />
      )}

      {/* ドッグラン詳細モーダル */}
      {showParkModal && selectedPark && (
        <ParkModal
          park={selectedPark}
          onClose={() => setShowParkModal(false)}
        />
      )}
    </div>
  );
}
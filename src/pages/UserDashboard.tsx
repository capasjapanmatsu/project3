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
import type { Dog, DogPark, Profile, Reservation, Notification, NewsAnnouncement } from '../types';
import { processDogImage, processVaccineImage } from '../utils/imageUtils';
import { 
  uploadDogProfileImage, 
  uploadVaccineImage, 
  uploadWithRetry, 
  deleteExistingImage,
  validateDogImageFile,
  UploadResult,
  UploadError
} from '../utils/imageUploadUtils';

export function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [ownedParks, setOwnedParks] = useState<DogPark[]>([]);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [news, setNews] = useState<NewsAnnouncement[]>([]);
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
  // ワクチン証明書関連の状態（初期値を空文字で統一）
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

      if (profileResponse.error) throw profileResponse.error;
      if (dogsResponse.error) throw dogsResponse.error;
      if (parksResponse.error) throw parksResponse.error;
      if (reservationsResponse.error) throw reservationsResponse.error;
      if (notificationsResponse.error) throw notificationsResponse.error;
      if (newsResponse.error) throw newsResponse.error;

      setProfile(profileResponse.data);
      setDogs(dogsResponse.data || []);
      setOwnedParks(parksResponse.data || []);
      setRecentReservations(reservationsResponse.data || []);
      setNotifications(notificationsResponse.data || []);
      setNews(newsResponse.data || []);
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
    
    // ワクチン証明書の情報を設定（必ず空文字で初期化）
    const cert = dog.vaccine_certifications?.[0];
    setRabiesExpiryDate(cert?.rabies_expiry_date || '');
    setComboExpiryDate(cert?.combo_expiry_date || '');
    
    setShowDogEditModal(true);
  };

  const handleDogImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // 新しいユーティリティを使用してファイルを検証
        const validationError = validateDogImageFile(file);
        if (validationError) {
          setDogUpdateError(validationError.message);
          return;
        }

        setDogUpdateError('画像を処理中...');
        
        // 画像をリサイズ・圧縮
        const processedFile = await processDogImage(file);
        setDogImageFile(processedFile);
        
        // プレビュー画像を作成
        const reader = new FileReader();
        reader.onload = (e) => {
          setDogImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(processedFile);
        setDogUpdateError('');
      } catch (error) {
        console.error('Image processing error:', error);
        setDogUpdateError('画像の処理に失敗しました。別の画像をお試しください。');
      }
    }
  };

  const handleDogImageRemove = () => {
    setDogImageFile(null);
    setDogImagePreview(selectedDog?.image_url || null);
  };

  const handleRabiesVaccineSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // 新しいユーティリティを使用してファイルを検証
        const validationError = validateDogImageFile(file);
        if (validationError) {
          setDogUpdateError(validationError.message);
          return;
        }
        
        setDogUpdateError('ワクチン証明書を処理中...');
        
        // ワクチン証明書画像をリサイズ・圧縮
        const processedFile = await processVaccineImage(file);
        setRabiesVaccineFile(processedFile);
        setDogUpdateError('');
      } catch (error) {
        console.error('Vaccine image processing error:', error);
        setDogUpdateError('ワクチン証明書の処理に失敗しました。別の画像をお試しください。');
      }
    } else {
      // ファイルが選択されていない場合（削除の場合）
      setRabiesVaccineFile(null);
      setDogUpdateError('');
    }
  };

  const handleComboVaccineSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // 新しいユーティリティを使用してファイルを検証
        const validationError = validateDogImageFile(file);
        if (validationError) {
          setDogUpdateError(validationError.message);
          return;
        }
        
        setDogUpdateError('ワクチン証明書を処理中...');
        
        // ワクチン証明書画像をリサイズ・圧縮
        const processedFile = await processVaccineImage(file);
        setComboVaccineFile(processedFile);
        setDogUpdateError('');
      } catch (error) {
        console.error('Vaccine image processing error:', error);
        setDogUpdateError('ワクチン証明書の処理に失敗しました。別の画像をお試しください。');
      }
    } else {
      // ファイルが選択されていない場合（削除の場合）
      setComboVaccineFile(null);
      setDogUpdateError('');
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
          // 既存の画像を削除
          if (selectedDog.image_url) {
            await deleteExistingImage('dog-images', selectedDog.image_url);
          }
          
          // 新しいユーティリティを使用してアップロード
          const uploadResult = await uploadWithRetry(dogImageFile, {
            dogId: selectedDog.id,
            imageType: 'profile',
            replaceExisting: true,
            maxRetries: 3
          });

          if (uploadResult.success) {
            imageUrl = uploadResult.url!;
            console.log('Dog profile image uploaded successfully:', {
              url: imageUrl,
              fileName: uploadResult.fileName
            });
          } else {
            console.error('Dog profile image upload failed:', uploadResult.error);
            throw new Error(uploadResult.error?.message || '画像のアップロードに失敗しました');
          }
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
            const rabiesUploadResult = await uploadWithRetry(rabiesVaccineFile, {
              dogId: selectedDog.id,
              imageType: 'rabies',
              maxRetries: 3
            });

            if (rabiesUploadResult.success) {
              rabiesPath = rabiesUploadResult.url!;
              console.log('Rabies vaccine certificate uploaded successfully:', {
                url: rabiesPath,
                fileName: rabiesUploadResult.fileName
              });
            } else {
              console.error('Rabies vaccine upload failed:', rabiesUploadResult.error);
              throw new Error(rabiesUploadResult.error?.message || '狂犬病ワクチン証明書のアップロードに失敗しました');
            }
          }

          // 混合ワクチン証明書のアップロード
          if (comboVaccineFile) {
            const comboUploadResult = await uploadWithRetry(comboVaccineFile, {
              dogId: selectedDog.id,
              imageType: 'combo',
              maxRetries: 3
            });

            if (comboUploadResult.success) {
              comboPath = comboUploadResult.url!;
              console.log('Combo vaccine certificate uploaded successfully:', {
                url: comboPath,
                fileName: comboUploadResult.fileName
              });
            } else {
              console.error('Combo vaccine upload failed:', comboUploadResult.error);
              throw new Error(comboUploadResult.error?.message || '混合ワクチン証明書のアップロードに失敗しました');
            }
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
              status: 'pending', // 新しい証明書は承認待ち状態に
              temp_storage: true // 一時保存として設定
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
                status: 'pending',
                temp_storage: true // 一時保存として設定
              }]);

            if (insertCertError) {
              console.error('Certificate insert error:', insertCertError);
              throw insertCertError;
            }
          }
        } catch (vaccineError) {
          console.error('Vaccine certificate error:', vaccineError);
          const errorMessage = (vaccineError as Error).message || 'ワクチン証明書のアップロードに失敗しました。';
          
          // 具体的なエラーメッセージを提供
          if (errorMessage.includes('row-level security')) {
            setDogUpdateError('ワクチン証明書のアップロード権限がありません。ログインし直してください。');
          } else if (errorMessage.includes('violates check constraint')) {
            setDogUpdateError('ワクチン証明書の形式が正しくありません。');
          } else if (errorMessage.includes('storage')) {
            setDogUpdateError('ワクチン証明書のストレージエラーが発生しました。しばらく後にお試しください。');
          } else {
            setDogUpdateError(`ワクチン証明書のアップロードに失敗しました: ${errorMessage}`);
          }
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
      const errorMessage = (error as Error).message || 'ワンちゃん情報の更新に失敗しました';
      
      // 具体的なエラーメッセージを提供
      if (errorMessage.includes('row-level security')) {
        setDogUpdateError('ワンちゃん情報の更新権限がありません。ログインし直してください。');
      } else if (errorMessage.includes('violates check constraint')) {
        setDogUpdateError('入力された情報に不正な値が含まれています。');
      } else if (errorMessage.includes('network')) {
        setDogUpdateError('ネットワークエラーが発生しました。インターネット接続を確認してください。');
      } else {
        setDogUpdateError(`ワンちゃん情報の更新に失敗しました: ${errorMessage}`);
      }
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

      {/* 新着情報 */}
      {news.length > 0 && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Bell className="w-6 h-6 text-blue-600 mr-2" />
              新着情報
            </h2>
            <Link to="/news">
              <Button size="sm" variant="secondary">
                すべて見る
              </Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {news.map((item) => (
              <div key={item.id} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.category === 'announcement' 
                          ? 'bg-red-100 text-red-800' 
                          : item.category === 'sale'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.category === 'announcement' 
                          ? '重要なお知らせ' 
                          : item.category === 'sale'
                          ? 'セール情報'
                          : 'お知らせ'
                        }
                      </span>
                      {item.is_important && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                          重要
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(item.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  {item.link_url && (
                    <a 
                      href={item.link_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-4"
                    >
                      <Button size="sm" variant="secondary">
                        詳細
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
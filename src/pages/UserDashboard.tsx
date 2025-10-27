import {
    AlertTriangle,
    Bell,
    Building,
    CheckCircle,
    Clock,
    Coins,
    Crown,
    Edit,
    Gift,
    Globe,
    Heart,
    History,
    MapPin,
    ShoppingBag,
    Ticket,
    User,
    Users
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Area } from 'react-easy-crop';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { DogManagementSection } from '../components/dashboard/DogManagementSection';
import { NotificationSection } from '../components/dashboard/NotificationSection';
import { ParkModal } from '../components/dashboard/ParkModal';
import useAuth from '../context/AuthContext';
import { useMe } from '../hooks/useMe';
import { useSubscription } from '../hooks/useSubscription';
import { ensureMinimalProfile } from '../lib/supabase/profiles';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import type { Dog, DogPark, NewsAnnouncement, Notification, Profile, Reservation } from '../types';
import { supabase } from '../utils/supabase';
import { uploadAndConvertToWebP } from '../utils/webpConverter';


export function UserDashboard() {
  const { user, logout, isAdmin, lineUser, isLineAuthenticated } = useAuth();
  const { me, loading: meLoading } = useMe();
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
  const [facilityReservations, setFacilityReservations] = useState<any[]>([]);
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
  // Crop state
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
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
  const [pointsBalance, setPointsBalance] = useState<number>(0);

  // Subscription hook
  const { isActive: hasSubscription } = useSubscription();

  // 🚀 Enhanced Data Fetching (3段階最適化)
  const fetchDashboardData = useCallback(async () => {
    try {
      setGlobalLoading(true);
      setIsLoading(true);
      
      // フェーズ1: 最優先データ（プロフィール・犬情報）
      // 常に Supabase ユーザーID を使用（LINEのみログイン時はセッション交換して取得）
      let uid: string | null = null;
      try {
        const { data: gu } = await supabase.auth.getUser();
        uid = gu?.user?.id ?? null;
        if (!uid) {
          // LINEセッションがある前提で Supabase セッションを交換
          try {
            const resp = await fetch('/line/exchange-supabase-session', { method: 'POST', credentials: 'include' });
            if (resp.ok) {
              const { access_token, refresh_token } = await resp.json() as { access_token: string; refresh_token: string };
              const { data } = await supabase.auth.setSession({ access_token, refresh_token });
              uid = data?.session?.user?.id ?? null;
            }
          } catch {}
        }
      } catch {}

      if (!uid) {
        // 認証セッションが確立できない場合は終了
        setIsLoading(false);
        setGlobalLoading(false);
        return;
      }

      // プロフィール最低限の行を確保（LINEのみでも機能）
      try { await ensureMinimalProfile(supabase, { id: uid } as any); } catch {}

      // LINEユーザーの場合、profilesテーブルにエントリがない可能性があるので、エラーを無視
      const [profileResponse, dogsResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .single()
          .then(result => {
            // LINEユーザーの場合、profilesにデータがない可能性があるのでエラーを無視
            if (result.error && isLineAuthenticated) {
              return { data: null, error: null };
            }
            return result;
          }),
        
        supabase
          .from('dogs')
          .select('*, vaccine_certifications(*)')
          .eq('owner_id', uid)
          .order('created_at', { ascending: false })
      ]);

      // 基本情報を即座に表示
      // LINEユーザーの場合、profileがnullでも続行
      setProfile(profileResponse.data);
      setDogs(dogsResponse.data || []);
      
      // Zustand Storeの更新
      if (profileResponse.data && !zustandUser) {
        setUser({
          id: uid || '',
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
        notificationsResponse,
        facilityReservationsResponse
      ] = await Promise.all([
        supabase
          .from('dog_parks')
          .select('*')
          .eq('owner_id', uid)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('reservations')
          .select('*, dog_park:dog_parks(*), dog:dogs(*)')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(5),
        
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', uid)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('facility_reservations')
          .select(`*, facility:pet_facilities(name)`)        
          .eq('user_id', uid)
          .neq('status', 'cancelled')
          .gte('reserved_date', new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0])
          .order('reserved_date', { ascending: false })
          .limit(5)
      ]);

      // 重要データの更新
      setOwnedParks(parksResponse.data || []);
      setRecentReservations(reservationsResponse.data || []);
      setNotifications(notificationsResponse.data || []);
      setFacilityReservations(facilityReservationsResponse.data || []);

      // フェーズ3: 追加データ（ニュース・施設・いいね・ポイント）をバックグラウンドで取得
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
          .eq('owner_id', uid)
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
          .eq('user_id', uid)
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
          .eq('user_id', uid)
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
        ,
        // ポイント残高
        supabase
          .from('points_balances')
          .select('balance')
          .eq('user_id', uid)
          .maybeSingle()
          .then((res) => {
            setPointsBalance(res.data?.balance || 0);
          })
          .catch(() => {})
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
  }, [user?.id, lineUser?.id, isLineAuthenticated, zustandUser, setUser, setGlobalLoading, addNotification]);

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
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
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



      // 犬の情報更新
      const updateData: any = {
        name: dogFormData.name,
        breed: dogFormData.breed,
        gender: dogFormData.gender,
        birth_date: dogFormData.birthDate,
      };

      // 画像アップロード処理（1:1トリミング → 最大1200pxリサイズ → WebP変換 → 安全なUUIDファイル名で保存）
      if (dogImageFile) {
        const imgBitmap = await createImageBitmap(dogImageFile);
        const sourceSquare = Math.min(imgBitmap.width, imgBitmap.height);
        const targetSize = Math.min(1200, sourceSquare);
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d')!;
        const hasCrop = !!croppedAreaPixels;
        const sx = hasCrop ? croppedAreaPixels!.x : (imgBitmap.width - sourceSquare) / 2;
        const sy = hasCrop ? croppedAreaPixels!.y : (imgBitmap.height - sourceSquare) / 2;
        const sWidth = hasCrop ? croppedAreaPixels!.width : sourceSquare;
        const sHeight = hasCrop ? croppedAreaPixels!.height : sourceSquare;
        ctx.drawImage(imgBitmap, sx, sy, sWidth, sHeight, 0, 0, targetSize, targetSize);
        const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.9));
        const squaredFile = new File([blob], 'dog-square.jpg', { type: 'image/jpeg' });

        const safePath = `${selectedDog.id}/${crypto.randomUUID()}.webp`;
        const result = await uploadAndConvertToWebP('dog-images', squaredFile, safePath, { quality: 85, generateThumbnail: false });
        const url = result.webpUrl || result.originalUrl;
        if (!url) throw new Error('画像の保存に失敗しました');
        updateData.image_url = url;
      }

      // プレビューもファイルも無い場合はDB上のURLをクリア
      if (!dogImageFile && !dogImagePreview) {
        updateData.image_url = '' as any;
      }

      const { data: updatedDogRows, error: updateError } = await supabase
        .from('dogs')
        .update(updateData)
        .eq('id', selectedDog.id)
        .eq('owner_id', user.id)
        .select('id,image_url');

      if (updateError) throw updateError;
      if (!updatedDogRows || updatedDogRows.length === 0) {
        throw new Error('更新対象が見つからない、または権限により更新できませんでした。');
      }

      // ワクチン証明（保存で完結）: 画像が選択されている、または期限が入力されていれば提出扱い
      if ((rabiesVaccineFile || comboVaccineFile) || (rabiesExpiryDate || comboExpiryDate)) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('ログインが必要です（提出）');

        const ensureJpeg = async (file: File): Promise<File> => {
          if (file.type === 'image/jpeg') return file;
          const bmp = await createImageBitmap(file);
          const c = document.createElement('canvas');
          c.width = bmp.width; c.height = bmp.height;
          c.getContext('2d')!.drawImage(bmp, 0, 0);
          const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.92));
          return new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
        };

        const uploadDirect = async (file: File, kind: 'rabies' | 'combo') => {
          const jpeg = await ensureJpeg(file);
          const key = `${user.id}/${kind}/${Date.now()}-${crypto.randomUUID()}.jpg`;
          const { error: upErr } = await supabase.storage
            .from('vaccine-certs')
            .upload(key, jpeg, { upsert: false, cacheControl: '0', contentType: 'image/jpeg' });
          if (upErr) {
            // フォールバック: REST 直叩き
            const projectUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const anonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
            const resp = await fetch(`${projectUrl}/storage/v1/object/vaccine-certs/${key}`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                apikey: anonKey,
                'Content-Type': 'image/jpeg',
                'x-upsert': 'false',
                'Cache-Control': '0',
              },
              body: jpeg,
            });
            const txt = await resp.text();
            if (!resp.ok) throw new Error(`upload ${kind} failed: ${resp.status} ${txt}`);
          }
          const { data: pub } = supabase.storage.from('vaccine-certs').getPublicUrl(key);
          return pub.publicUrl;
        };

        let rabiesUrl: string | undefined;
        let comboUrl: string | undefined;
        if (rabiesVaccineFile) rabiesUrl = await uploadDirect(rabiesVaccineFile, 'rabies');
        if (comboVaccineFile)  comboUrl  = await uploadDirect(comboVaccineFile,  'combo');

        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-vaccine`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
          },
          body: JSON.stringify({
            dog_id: selectedDog.id,
            rabies_url: rabiesUrl,
            combo_url: comboUrl,
            rabies_expiry: rabiesExpiryDate || undefined,
            combo_expiry: comboExpiryDate || undefined,
          })
        });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok || !(json as any)?.success) {
          throw new Error(`ワクチン提出に失敗しました: ${resp.status}`);
        }
      }

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-8 space-y-8">
      {/* Header with Modern CSS */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            マイページ
          </h1>
          <p className="text-gray-600 mt-1">
            ようこそ、{profile?.name || lineUser?.display_name || zustandUser?.name || sessionStorage.getItem('liff_display_name') || 'ユーザー'}さん！
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
        // Crop state
        crop={crop}
        zoom={zoom}
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onCropComplete={(_, area) => setCroppedAreaPixels(area)}
        onImageCropped={(file) => {
          setDogImageFile(file);
          const url = URL.createObjectURL(file);
          setDogImagePreview(url);
        }}
      />

      {/* Facility Reservations Section */}
      <Card className="p-6 bg-white border-gray-200">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <Clock className="w-6 h-6 text-blue-600 mr-2" />
            店舗予約管理
          </h2>
        </div>
        {facilityReservations.length === 0 ? (
          <div className="text-center py-8 text-blue-700">店舗の予約はまだありません</div>
        ) : (
          <div className="space-y-3">
            {facilityReservations.map((r) => (
              <div key={r.id} className="p-4 bg-white rounded-lg border border-blue-100 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  <div className="font-semibold">{r.facility?.name || '施設'}</div>
                  <div className="text-gray-600">{r.reserved_date} {r.start_time}-{r.end_time} / {r.guest_count}名 / {r.seat_code || '座席:指定なし'}</div>
                </div>
                <Link to={`/facilities/${r.facility_id}`}>
                  <Button size="sm" variant="secondary">詳細</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6">
          <Link to="/my-reservations">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-base text-white">一覧表示</Button>
          </Link>
        </div>
      </Card>

      {/* Points Balance */}
      <Card className="p-6 bg-white border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold flex items-center">
            <Coins className="w-6 h-6 text-amber-600 mr-2" />
            保有ポイント
          </h2>
        </div>
        <div className="text-3xl font-bold text-amber-700">{pointsBalance.toLocaleString()} P</div>
        <p className="text-sm text-amber-700 mt-2">ペットショップで利用可能</p>
        <div className="mt-6">
          <Link to="/points">
            <Button className="w-full bg-amber-600 hover:bg-amber-700 py-3 text-base text-white">履歴を見る</Button>
          </Link>
        </div>
      </Card>

      {/* Profile Settings Card */}
      <Card className="p-6 bg-white border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold flex items-center">
            <User className="w-6 h-6 text-gray-700 mr-2" />
            登録情報
          </h2>
        </div>
        <p className="text-gray-700">住所・氏名・連絡先を編集</p>
        <ul className="mt-3 text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li>サブスク管理（解約・再開・支払い方法の更新）</li>
          <li>退会申請（アカウント削除リクエスト）</li>
        </ul>
        <div className="mt-6">
          <Link to="/profile-settings">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-base text-white">登録情報を編集</Button>
          </Link>
        </div>
      </Card>

      {/* User Coupons Section */}
      <Card className="p-6 bg-white border-gray-200">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <Gift className="w-6 h-6 text-pink-600 mr-2" />
            保有クーポン ({validCouponsCount}枚)
          </h2>
          <div />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userCoupons.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Gift className="w-12 h-12 text-pink-300 mx-auto mb-3" />
              <p className="text-pink-600 font-medium mb-2">保有クーポンがありません</p>
              <p className="text-pink-500 text-sm">ワンちゃんと行ける施設でクーポンを取得してみましょう</p>
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
              {userCoupons.length > 0 && (
                <div className="col-span-full mt-6">
                  <Link to="/my-coupons">
                    <Button className="w-full bg-pink-600 hover:bg-pink-700 py-3 text-base text-white">
                      <Ticket className="w-4 h-4 mr-1" />
                      クーポン一覧を見る
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Owned Parks Management Section with Modern Styling */}
      <Card className="p-6 bg-white border-gray-200">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <Building className="w-6 h-6 text-green-600 mr-2" />
            管理中のドッグラン ({ownedParks.length}施設)
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ownedParks.slice(0, 6).map((park) => {
            // ステータスに応じた表示情報を取得（施設と同じバッジ表記に統一）
            const getStatusInfo = (status: string) => {
              switch (status) {
                case 'approved':
                  return {
                    label: '公開中',
                    color: 'bg-green-100 text-green-800',
                    icon: CheckCircle,
                    description: ''
                  };
                case 'pending':
                  return {
                    label: '第一審査中',
                    color: 'bg-yellow-100 text-yellow-800',
                    icon: Clock,
                    description: '管理者による審査をお待ちください'
                  };
                case 'first_stage_passed':
                  return {
                    label: '第二審査申請可能',
                    color: 'bg-blue-100 text-blue-800',
                    icon: FileText,
                    description: '第二審査の申請をしてください'
                  };
                case 'second_stage_waiting':
                  return {
                    label: '第二審査申請準備中',
                    color: 'bg-orange-100 text-orange-800',
                    icon: Settings,
                    description: '画像アップロード等の準備を進めてください'
                  };
                case 'second_stage_review':
                  return {
                    label: '第二審査中',
                    color: 'bg-purple-100 text-purple-800',
                    icon: Clock,
                    description: '管理者による審査をお待ちください'
                  };
                case 'smart_lock_testing':
                  return {
                    label: 'スマートロック実証検査中',
                    color: 'bg-indigo-100 text-indigo-800',
                    icon: Shield,
                    description: '実証検査の完了をお待ちください'
                  };
                case 'rejected':
                  return {
                    label: '却下',
                    color: 'bg-red-100 text-red-800',
                    icon: AlertTriangle,
                    description: '詳細は管理ページでご確認ください'
                  };
                default:
                  return {
                    label: '審査中',
                    color: 'bg-gray-100 text-gray-800',
                    icon: Clock,
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${statusInfo.color}`}>
                      {statusInfo.icon && <statusInfo.icon className="w-3 h-3" />}
                      <span>{statusInfo.label}</span>
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
        {/* 統一: 一覧・管理ボタンを下部に横長表示 */}
        <div className="mt-6">
          <Link to="/my-parks-management">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-base text-white">
              <Edit className="w-4 h-4 mr-2" />
              一覧・管理
            </Button>
          </Link>
        </div>
      </Card>

      {/* 管理中のペット関連施設一覧（0件でも表示） */}
      <Card className="p-6 bg-white border-gray-200">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold flex items-center">
              <Building className="w-6 h-6 text-teal-600 mr-2" />
              管理中のペット関連施設 ({facilities.length}施設)
            </h2>
            <p className="text-gray-600 mt-1">ペットショップ、動物病院、トリミングサロンなどの施設管理</p>
          </div>
        </div>

        {facilities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">管理中のペット関連施設がありません。</p>
            <Link to="/facility-registration">
              <Button className="bg-teal-600 hover:bg-teal-700">新規施設登録</Button>
            </Link>
          </div>
        ) : (
          <>
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
                        <a href={facility.website} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:text-teal-800">公式サイト</a>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">{facility.category_name || 'その他施設'}</div>
                  </div>
                </div>
              ))}
            </div>
            {facilities.length > 4 && (
              <div className="mt-4 text-center">
                <Link to="/my-facilities-management">
                  <Button variant="secondary" size="sm">すべて表示 ({facilities.length}施設)</Button>
                </Link>
              </div>
            )}
            {/* 統一: 一覧・管理ボタンを下部に横長表示 */}
            <div className="mt-6">
              <Link to="/my-facilities-management">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-base text-white">
                  <Edit className="w-4 h-4 mr-1" />
                  一覧・管理
                </Button>
              </Link>
            </div>
          </>
        )}
      </Card>

      {/* AIチャット（ページ内版）はFABに統合したため削除 */}

      {/* Quick Actions Section with Modern CSS Grid */}
      <Card className="p-6 bg-white border-gray-200">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <span className="text-2xl mr-2">🚀</span>
          クイックアクション
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/parks" className="group">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border border-blue-200">
              <div className="flex items-center gap-4">
                <MapPin className="w-12 h-12 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">ドッグラン検索</h3>
                  <p className="text-sm text-blue-700">近くのドッグランを探す</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/dogpark-history" className="group">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border border-blue-200">
              <div className="flex items-center gap-4">
                <History className="w-12 h-12 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">ドッグラン利用履歴</h3>
                  <p className="text-sm text-blue-700">入退場履歴を確認</p>
                </div>
              </div>
            </div>
          </Link>
          
          <Link to="/community" className="group">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border border-blue-200">
              <div className="flex items-center gap-4">
                <Users className="w-12 h-12 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">コミュニティ</h3>
                  <p className="text-sm text-blue-700">他の飼い主と交流</p>
                </div>
              </div>
            </div>
          </Link>
          
          <Link to="/petshop" className="group">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border border-blue-200">
              <div className="flex items-center gap-4">
                <ShoppingBag className="w-12 h-12 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">ペットショップ</h3>
                  <p className="text-sm text-blue-700">ペット用品を購入</p>
                </div>
              </div>
            </div>
          </Link>
          
          <Link to="/order-history" className="group">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border border-blue-200">
              <div className="flex items-center gap-4">
                <History className="w-12 h-12 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">注文履歴</h3>
                  <p className="text-sm text-blue-700">購入履歴を確認</p>
                </div>
              </div>
            </div>
          </Link>
          
          <Link to="/news" className="group">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border border-blue-200">
              <div className="flex items-center gap-4">
                <Bell className="w-12 h-12 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">新着情報</h3>
                  <p className="text-sm text-blue-700">最新のお知らせ</p>
                </div>
              </div>
            </div>
          </Link>


          
          <Link to="/park-registration-agreement" className="group">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border border-blue-200">
              <div className="flex items-center gap-4">
                <Building className="w-12 h-12 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">ドッグランオーナー募集</h3>
                  <p className="text-sm text-blue-700 mb-2">あなたのドッグランを登録</p>
                  <div className="text-xs text-blue-700 font-semibold bg-blue-100 px-2 py-1 rounded-full inline-block">
                    💰 収益化のチャンス！
                  </div>
                </div>
              </div>
            </div>
          </Link>
          
          <Link to="/facility-registration" className="group">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md border border-blue-200">
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <Heart className="w-10 h-10 text-blue-600 mr-2" />
                  <ShoppingBag className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">ペット関連施設登録</h3>
                  <p className="text-sm text-blue-700 mb-2">店舗・宿泊施設・サロンなど</p>
                  <div className="text-xs text-blue-700 font-semibold bg-blue-100 px-2 py-1 rounded-full inline-block">
                    🎉 今なら無料掲載！
                  </div>
                </div>
              </div>
            </div>
          </Link>
          
          
        </div>
      </Card>

      {/* Access Status Section - リモート解錠移行のため非表示 */}

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

export default UserDashboard;

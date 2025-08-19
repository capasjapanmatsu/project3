import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Coins,
    Heart,
    Key,
    MapPin,
    RefreshCw,
    Shield,
    Star,
    Users,
    MessageSquare,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { DoorLockButton } from '../components/DoorLockButton';
import { ParkDetailHeader } from '../components/park/ParkDetailHeader';
import { ParkFacilityInfo } from '../components/park/ParkFacilityInfo';
import { ParkImageGallery } from '../components/park/ParkImageGallery';
import { ParkRentalInfo } from '../components/park/ParkRentalInfo';
import { ParkReviewSection } from '../components/park/ParkReviewSection';
import useAuth from '../context/AuthContext';
import type { Dog, DogPark, DogParkReview, Profile, Reservation, UserParkReview } from '../types';
import { supabase } from '../utils/supabase';
import { PARK_PLACEHOLDER_SVG } from '../utils/placeholders';

interface ParkImage {
  id: string;
  url: string;
  caption?: string;
}

interface SmartLock {
  id: string;
  lock_id: string;
  lock_name: string;
  park_id: string;
}

interface MaintenanceInfo {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_emergency: boolean;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

export function DogParkDetail() {
  const { id: parkId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [park, setPark] = useState<DogPark | null>(null);
  const [reviews, setReviews] = useState<DogParkReview[]>([]);
  const [userReview, setUserReview] = useState<UserParkReview | null>(null);
  const [userDogs, setUserDogs] = useState<Dog[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facilityRentals, setFacilityRentals] = useState<Reservation[]>([]);
  const [todayRentals, setTodayRentals] = useState<Reservation[]>([]);
  const [userReservation, setUserReservation] = useState<Reservation | null>(null);
  const [reviewFormData, setReviewFormData] = useState({
    rating: 5,
    review_text: '',
    visit_date: '',
    dog_id: '',
  });
  const [parkImages, setParkImages] = useState<ParkImage[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [smartLocks, setSmartLocks] = useState<SmartLock[]>([]);

  const [userHasAccess, setUserHasAccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceInfo[]>([]);
  const [currentMaintenance, setCurrentMaintenance] = useState<MaintenanceInfo | null>(null);

  useEffect(() => {
    if (parkId) {
      fetchParkData();
    }
  }, [parkId, user]);

  const fetchParkData = async () => {
    try {
      // 🚀 フェーズ1: クリティカルデータの並列取得（最優先）
      const [parkResult, imageResult] = await Promise.all([
        // ドッグラン基本情報
        supabase
          .from('dog_parks')
          .select('*')
          .eq('id', parkId)
          .eq('status', 'approved')
          .single(),
        // メイン画像のみ（優先度高）
        supabase
          .from('dog_park_images')
          .select('*')
          .eq('park_id', parkId)
          .order('display_order', { ascending: true })
          .limit(3) // 最初の3枚のみ取得
      ]);

      // パーク情報の処理
      if (parkResult.error) {
        console.error('Park not found:', parkResult.error);
        navigate('/parks');
        return;
      }

      const parkData = parkResult.data;
      setPark(parkData);

      // 画像の優先処理（メイン画像を最優先）
      if (!imageResult.error && imageResult.data) {
        const priorityImages: ParkImage[] = [];
        
        // メイン画像を最優先で追加
        if (parkData.image_url) {
          priorityImages.push({
            id: 'main',
            url: parkData.image_url,
            caption: `${parkData.name} - メイン画像`
          });
        }
        
        // カバー画像を追加
        if (parkData.cover_image_url) {
          priorityImages.push({
            id: 'cover',
            url: parkData.cover_image_url,
            caption: `${parkData.name} - カバー画像`
          });
        }
        
        // 追加の画像を追加
        imageResult.data.forEach(img => {
          priorityImages.push({
            id: img.id,
            url: img.image_url,
            caption: img.caption || `${parkData.name} - 施設画像`
          });
        });
        
        // 画像が1枚も取得できなかった場合はローカルのプレースホルダーを使用
        if (priorityImages.length === 0) {
          priorityImages.push({ id: 'placeholder', url: PARK_PLACEHOLDER_SVG, caption: '画像未設定' });
        }
        setParkImages(priorityImages);
      }

      // 最低限の情報で画面を表示可能にする
      setIsLoading(false);

      // 🚀 フェーズ2: 非クリティカルデータの並列取得（バックグラウンド）
      const backgroundPromises = [
        // レビューデータ
        supabase.rpc('get_park_reviews', { park_id_param: parkId }),
        // スマートロック情報
        supabase
          .from('smart_locks')
          .select('*')
          .eq('park_id', parkId)
          .eq('is_active', true),
        // メンテナンス情報
        supabase
          .from('maintenance_schedules')
          .select('*')
          .eq('dog_park_id', parkId)
          .in('status', ['scheduled', 'active'])
          .gte('end_date', new Date().toISOString())
          .order('start_date', { ascending: true })
      ];

      // 残りの画像も並列で取得
      if (imageResult.data && imageResult.data.length >= 3) {
        backgroundPromises.push(
          supabase
            .from('dog_park_images')
            .select('*')
            .eq('park_id', parkId)
            .order('display_order', { ascending: true })
            .range(3, 50) // 4枚目以降を取得
        );
      }

      const [reviewsResult, locksResult, maintenanceResult, additionalImagesResult] = await Promise.all(backgroundPromises);

      // バックグラウンドデータの処理
      if (!reviewsResult.error) {
        setReviews(reviewsResult.data || []);
      }

      if (!locksResult.error) {
        setSmartLocks(locksResult.data || []);
      }

      if (!maintenanceResult.error && maintenanceResult.data) {
        setMaintenanceInfo(maintenanceResult.data);
        
        const now = new Date();
        const activeMaintenance = maintenanceResult.data.find(m => {
          const startDate = new Date(m.start_date);
          const endDate = new Date(m.end_date);
          return startDate <= now && endDate > now;
        });
        
        setCurrentMaintenance(activeMaintenance || null);
      }

      // 追加画像の処理
      if (additionalImagesResult && !additionalImagesResult.error && additionalImagesResult.data) {
        setParkImages(prev => [
          ...prev,
          ...additionalImagesResult.data.map(img => ({
            id: img.id,
            url: img.image_url,
            caption: img.caption || `${parkData.name} - 施設画像`
          }))
        ]);
      }

      // 🚀 フェーズ3: ユーザー関連データ（さらに低優先度）
      if (user) {
        void fetchUserRelatedData(locksResult.data || []);
      }

    } catch (error) {
      console.error('Error occurred:', error);
      setError((error as Error).message || 'エラーが発生しました');
      navigate('/parks');
    }
  };

  // 🔄 ユーザー関連データの遅延読み込み
  const fetchUserRelatedData = async (smartLocks: SmartLock[]) => {
    if (!user || !parkId) return;

    try {
      const userDataPromises = [
        // ユーザーの犬を取得
        supabase
          .from('dogs')
          .select(`
            *,
            vaccine_certifications!inner(*)
          `)
          .eq('owner_id', user?.id)
          .eq('vaccine_certifications.status', 'approved'),
        
        // レビュー権限チェック
        supabase.rpc('can_user_review_park', {
          user_id_param: user.id,
          park_id_param: parkId
        }),
        
        // ユーザーの既存レビュー
        supabase.rpc('get_user_park_review', {
          user_id_param: user.id,
          park_id_param: parkId
        }),
        
        // 今日の予約情報
        supabase
          .from('reservations')
          .select(`
            *,
            dog_park:dog_parks(*),
            dog:dogs(*)
          `)
          .eq('park_id', parkId)
          .eq('user_id', user?.id)
          .eq('status', 'confirmed')
          .eq('date', new Date().toISOString().split('T')[0])
          .order('start_time', { ascending: true })
          .limit(1)
          .single()
      ];

      const [dogsResult, canReviewResult, userReviewResult, reservationResult] = await Promise.all(userDataPromises);

      // ユーザーデータの処理
      if (!dogsResult.error) {
        setUserDogs(dogsResult.data || []);
      }

      if (!canReviewResult.error) {
        setCanReview(canReviewResult.data);
      }

      if (!userReviewResult.error && userReviewResult.data && userReviewResult.data.length > 0) {
        const reviewData = userReviewResult.data[0];
        setUserReview(reviewData);
        setReviewFormData({
          rating: reviewData.rating,
          review_text: reviewData.review_text || '',
          visit_date: reviewData.visit_date,
          dog_id: reviewData.dog_id,
        });
      }

      if (!reservationResult.error && reservationResult.data) {
        setUserReservation(reservationResult.data);
      }

      // スマートロックアクセス権限チェック
      if (smartLocks.length > 0) {
        const { data: accessData, error: accessError } = await supabase.rpc('check_user_park_access', {
          p_user_id: user.id,
          p_lock_id: smartLocks[0].lock_id
        });

        if (!accessError && accessData && accessData.has_access) {
          setUserHasAccess(true);
        }
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !park) return;

    setIsSubmitting(true);

    try {
      if (userReview) {
        // 既存レビューを更新
        const { error } = await supabase
          .from('dog_park_reviews')
          .update({
            rating: reviewFormData.rating,
            review_text: reviewFormData.review_text,
            visit_date: reviewFormData.visit_date,
            dog_id: reviewFormData.dog_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userReview.id);

        if (error) throw error;
      } else {
        // 新規レビューを作成
        const { error } = await supabase
          .from('dog_park_reviews')
          .insert([{
            park_id: parkId,
            user_id: user.id,
            dog_id: reviewFormData.dog_id,
            rating: reviewFormData.rating,
            review_text: reviewFormData.review_text,
            visit_date: reviewFormData.visit_date,
          }]);

        if (error) throw error;
      }

      // データを再取得
      await fetchParkData();
      setShowReviewForm(false);
      alert(userReview ? 'レビューを更新しました！' : 'レビューを投稿しました！');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('レビューの投稿に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview || !confirm('レビューを削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('dog_park_reviews')
        .delete()
        .eq('id', userReview.id);

      if (error) throw error;

      await fetchParkData();
      setUserReview(null);
      setReviewFormData({
        rating: 5,
        review_text: '',
        visit_date: '',
        dog_id: '',
      });
      alert('レビューを削除しました。');
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('レビューの削除に失敗しました。');
    }
  };

  // 施設貸し切り予約の表示用に整形
  const getFacilityRentalInfo = () => {
    if (facilityRentals.length === 0) return [];
    
    const rentalsByDate: Record<string, {date: string, slots: {start: string, end: string}[]}> = {};
    
    facilityRentals.forEach(rental => {
      const dateStr = rental.date;
      if (!rentalsByDate[dateStr]) {
        rentalsByDate[dateStr] = {
          date: dateStr,
          slots: []
        };
      }
      
      const startHour = parseInt(rental.start_time);
      const endHour = startHour + rental.duration;
      
      rentalsByDate[dateStr].slots.push({
        start: `${startHour.toString().padStart(2, '0')}:00`,
        end: `${endHour.toString().padStart(2, '0')}:00`
      });
    });
    
    // 日付でソート
    return Object.values(rentalsByDate).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  // 画像ギャラリーの操作
  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % parkImages.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + parkImages.length) % parkImages.length);
  };

  // スマートロックの開錠成功時の処理
  const handleLockSuccess = () => {
    // 成功メッセージを表示
    alert('PINコードを生成しました！');
  };

  // スマートロックの開錠失敗時の処理
  const handleLockError = (errorMessage: string) => {
    alert(`PINコードの生成に失敗しました: ${errorMessage}`);
  };

  // リアルタイム更新関数
  const updateParkData = async () => {
    if (!parkId) return;
    
    try {
      setIsUpdating(true);
      console.log('Updating park data...');
      
      const { data, error } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('id', parkId)
        .single();

      if (error) {
        console.error('Error updating park data:', error);
        return;
      }

      setPark(data);
      setLastUpdated(new Date());
      console.log('Park data updated successfully');
    } catch (error) {
      console.error('Error updating park data:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // 手動更新ボタン
  const handleManualUpdate = () => {
    updateParkData();
  };

  // オーナー問い合わせ
  const handleContactOwner = async () => {
    if (!user) {
      navigate('/liff/login');
      return;
    }
    if (!park?.owner_id) {
      alert('このドッグランのオーナー情報が見つかりません。');
      return;
    }
    if (park.owner_id === user.id) {
      sessionStorage.setItem('communityActiveTab', 'messages');
      navigate('/community');
      return;
    }
    try {
      // スレッド作成用に空メッセージを送っておく（相手側に通知が行く）
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: park.owner_id,
        content: '（ドッグラン詳細ページからの問い合わせ）'
      });
    } catch {}
    sessionStorage.setItem('communityActiveTab', 'messages');
    // 可能なら相手IDを指定して自動で開く（Community側で対応）
    sessionStorage.setItem('communityOpenPartnerId', park.owner_id);
    navigate('/community');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!park) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">ドッグランが見つかりませんでした</p>
        <Button onClick={() => navigate('/parks')} className="mt-4">
          ドッグラン一覧に戻る
        </Button>
      </div>
    );
  }

  const rentalInfo = getFacilityRentalInfo();

  return (
    <div className="max-w-6xl mx-auto p-6">
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {park && (
        <>
          {/* ナビゲーションヘッダー */}
          <div className="mb-6">
            <button
              onClick={() => {
                // ブラウザ履歴で戻れる場合は戻る、そうでなければドッグラン一覧へ
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate('/parks');
                }
              }}
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              戻る
            </button>
          </div>

          {/* ヘッダー部分 */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{park.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{park.address}</span>
                <span>•</span>
                <span>¥{park.price}/日</span>
              </div>
            </div>
            
            {/* リアルタイム更新コントロール */}
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">
                最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
              </div>
              <button
                onClick={handleManualUpdate}
                disabled={isUpdating}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isUpdating
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isUpdating ? '更新中...' : '更新'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左側：基本情報 */}
            <div className="lg:col-span-2 space-y-6">
              {/* ヘッダー画像とパーク情報 */}
              <ParkDetailHeader 
                park={park} 
                parkImages={parkImages} 
                todayRentals={todayRentals} 
                onImageClick={openImageModal} 
              />

              {/* 画像ギャラリー（サムネイル） */}
              <ParkImageGallery 
                parkImages={parkImages} 
                onImageClick={openImageModal} 
              />

              {/* 基本情報 */}
              <Card className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{park.name}</h1>
                    
                    {/* 営業状況とメンテナンス情報 */}
                    <div className="mb-3">
                      {currentMaintenance ? (
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                            <span className="text-red-600 font-medium">メンテナンス中</span>
                          </div>
                          <p className="text-red-600 text-sm font-medium ml-5">
                            {currentMaintenance.title}
                            {currentMaintenance.is_emergency && ' (緊急)'}
                          </p>
                          <p className="text-red-500 text-xs ml-5">
                            {new Date(currentMaintenance.start_date).toLocaleDateString('ja-JP')} 
                            {' '}
                            {new Date(currentMaintenance.start_date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            {' 〜 '}
                            {new Date(currentMaintenance.end_date).toLocaleDateString('ja-JP')} 
                            {' '}
                            {new Date(currentMaintenance.end_date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {currentMaintenance.description && (
                            <p className="text-red-500 text-xs ml-5">
                              {currentMaintenance.description}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                          <span className="text-green-600 font-medium">営業中</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-4">
                      {/* 評価表示 */}
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= Math.round(park.average_rating)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-lg font-semibold text-gray-900">
                          {park.average_rating.toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-600">
                          ({park.review_count}件のレビュー)
                        </span>
                      </div>
                    </div>
                  </div>
                  {currentMaintenance ? (
                    <Button 
                      className="opacity-50 cursor-not-allowed" 
                      disabled
                      title="メンテナンス中のため予約できません"
                    >
                      予約不可
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Link to={`/access-control?park=${park.id}`}>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          入場する
                        </Button>
                      </Link>
                      <Link to={`/parks/${park.id}/reserve`}>
                        <Button variant="secondary" className="bg-gray-600 hover:bg-gray-700">
                          予約する
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                <p className="text-gray-700 mb-6">{park.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-5 h-5 mr-3" />
                      <span>{park.address}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Users className="w-5 h-5 mr-3" />
                      <span>現在の利用者: {park.current_occupancy}/{park.max_capacity}人</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Coins className="w-5 h-5 mr-3" />
                      <span>料金: ¥{park.price}/日</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {park.large_dog_area && (
                      <div className="flex items-center text-blue-600">
                        <Shield className="w-5 h-5 mr-3" />
                        <span>大型犬OK</span>
                      </div>
                    )}
                    {park.small_dog_area && (
                      <div className="flex items-center text-pink-600">
                        <Heart className="w-5 h-5 mr-3" />
                        <span>小型犬OK</span>
                      </div>
                    )}
                    {park.private_booths && (
                      <div className="flex items-center text-purple-600">
                        <CheckCircle className="w-5 h-5 mr-3" />
                        <span>プライベートブース {park.private_booth_count}室</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* メンテナンス情報 */}
              {(currentMaintenance || maintenanceInfo.length > 0) && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 mr-2" />
                    メンテナンス情報
                  </h2>
                  
                  {/* 現在のメンテナンス */}
                  {currentMaintenance && (
                    <div className={`mb-4 p-4 rounded-lg ${
                      currentMaintenance.is_emergency ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                    } border`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className={`w-5 h-5 ${
                          currentMaintenance.is_emergency ? 'text-red-600' : 'text-yellow-600'
                        }`} />
                        <span className={`text-lg font-semibold ${
                          currentMaintenance.is_emergency ? 'text-red-800' : 'text-yellow-800'
                        }`}>
                          {currentMaintenance.is_emergency ? '緊急メンテナンス中' : 'メンテナンス中'}
                        </span>
                      </div>
                      <p className={`text-lg font-medium ${
                        currentMaintenance.is_emergency ? 'text-red-700' : 'text-yellow-700'
                      } mb-2`}>
                        {currentMaintenance.title}
                      </p>
                      {currentMaintenance.description && (
                        <p className={`text-sm ${
                          currentMaintenance.is_emergency ? 'text-red-600' : 'text-yellow-600'
                        } mb-3`}>
                          {currentMaintenance.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Clock className={`w-4 h-4 ${
                            currentMaintenance.is_emergency ? 'text-red-600' : 'text-yellow-600'
                          }`} />
                          <span className={`font-medium ${
                            currentMaintenance.is_emergency ? 'text-red-700' : 'text-yellow-700'
                          }`}>
                            {new Date(currentMaintenance.start_date).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                            {' '}
                            {new Date(currentMaintenance.start_date).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            〜
                            {new Date(currentMaintenance.end_date).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                            {' '}
                            {new Date(currentMaintenance.end_date).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm ${
                        currentMaintenance.is_emergency ? 'text-red-600' : 'text-yellow-600'
                      } mt-3 font-medium`}>
                        ※メンテナンス期間中は休業となります
                      </p>
                    </div>
                  )}

                  {/* 今後のメンテナンス予定 */}
                  {maintenanceInfo.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        今後のメンテナンス予定
                      </h3>
                      <div className="space-y-3">
                        {maintenanceInfo
                          .filter(m => m.status === 'scheduled' && new Date(m.start_date) > new Date())
                          .slice(0, 3)
                          .map((maintenance, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Clock className="w-4 h-4 text-gray-600" />
                                    <span className="font-medium text-gray-900">
                                      {maintenance.title}
                                    </span>
                                    {maintenance.is_emergency && (
                                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                        緊急
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {new Date(maintenance.start_date).toLocaleDateString('ja-JP', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                    {' '}
                                    {new Date(maintenance.start_date).toLocaleTimeString('ja-JP', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                    〜
                                    {new Date(maintenance.end_date).toLocaleDateString('ja-JP', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                    {' '}
                                    {new Date(maintenance.end_date).toLocaleTimeString('ja-JP', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                  {maintenance.description && (
                                    <p className="text-sm text-gray-500">
                                      {maintenance.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* スマートロック操作セクション */}
              {smartLocks.length > 0 && userHasAccess && (
                <Card className="p-6 bg-blue-50 border-blue-200">
                  <div className="flex items-start space-x-3 mb-4">
                    <Key className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h2 className="text-xl font-semibold text-blue-900 mb-2">入口ドアの開錠</h2>
                      <p className="text-sm text-blue-800 mb-4">
                        PINコードを生成して入口のスマートロックを開錠できます。
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {smartLocks.map(lock => (
                      <DoorLockButton
                        key={lock.id}
                        lockId={lock.lock_id}
                        label={`${lock.lock_name}のPINコードを生成`}
                        className="w-full"
                        onSuccess={handleLockSuccess}
                        onError={handleLockError}
                        reservationId={userReservation?.id}
                      />
                    ))}
                  </div>
                </Card>
              )}

              {/* 本日の貸し切り情報 */}
              {todayRentals.length > 0 && (
                <Card className="p-6 bg-orange-50 border-orange-200">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
                    <div>
                      <h2 className="text-xl font-semibold text-orange-900 mb-3">本日の貸し切り時間</h2>
                      <p className="text-sm text-orange-800 mb-4">
                        以下の時間帯は施設貸し切りのため、通常利用（1Dayパス・サブスク）での入場はできません。
                      </p>
                      <div className="space-y-3">
                        {todayRentals.map((rental, index) => {
                          const startHour = parseInt(rental.start_time);
                          const endHour = startHour + rental.duration;
                          return (
                            <div key={index} className="bg-white p-3 rounded-lg border border-orange-200">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-5 h-5 text-orange-600" />
                                <span className="font-medium text-orange-900">
                                  {startHour}:00 〜 {endHour}:00
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* 施設貸し切り情報 */}
              {rentalInfo.length > 0 && (
                <ParkRentalInfo rentalInfo={rentalInfo} />
              )}

              {/* 設備情報 */}
              <ParkFacilityInfo park={park} />

              {/* レビューセクション */}
              <ParkReviewSection 
                park={park}
                reviews={reviews}
                userReview={userReview}
                canReview={canReview}
                user={user as Profile | null}
                userDogs={userDogs}
                showReviewForm={showReviewForm}
                setShowReviewForm={setShowReviewForm}
                reviewFormData={reviewFormData}
                setReviewFormData={setReviewFormData}
                isSubmitting={isSubmitting}
                handleReviewSubmit={handleReviewSubmit}
                handleDeleteReview={handleDeleteReview}
              />
            </div>

            {/* 右側：サイドバー */}
            <div className="space-y-6">
              {/* 予約ボタン */}
              <Card className="p-4">
                {currentMaintenance ? (
                  <Button 
                    className="w-full text-lg py-3 opacity-50 cursor-not-allowed" 
                    disabled
                    title="メンテナンス中のため予約できません"
                  >
                    予約不可
                  </Button>
                ) : (
                  <Link to={`/access-control?park=${park.id}`}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3">
                      予約する
                    </Button>
                  </Link>
                )}
              </Card>

              {/* スマートロック操作 */}
              {smartLocks.length > 0 && userHasAccess && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <Key className="w-5 h-5 text-blue-600 mr-2" />
                    入口ドアを開ける
                  </h3>
                  <div className="space-y-3">
                    {smartLocks.map(lock => (
                      <DoorLockButton
                        key={lock.id}
                        lockId={lock.lock_id}
                        label={`${lock.lock_name}のPINコードを生成`}
                        className="w-full"
                        onSuccess={handleLockSuccess}
                        onError={handleLockError}
                        reservationId={userReservation?.id}
                      />
                    ))}
                  </div>
                </Card>
              )}

              {/* 料金情報 */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">料金情報</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>通常利用</span>
                    <span className="font-medium">¥{park.price}/日</span>
                  </div>
                  {park.private_booths && (
                    <div className="flex justify-between">
                      <span>プライベートブース</span>
                      <span className="font-medium text-green-600">追加料金なし</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>施設貸し切り</span>
                    <span className="font-medium">¥4,400/時間</span>
                  </div>
                  <div className="flex justify-between">
                    <span>サブスクリプション</span>
                    <span className="font-medium">¥3,800/月</span>
                  </div>
                </div>
              </Card>

              {/* 混雑状況 */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">現在の状況</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">利用者数</span>
                    <span className="font-medium">{park.current_occupancy}/{park.max_capacity}人</span>
                  </div>
                  
                  {/* 詳細な混雑状況表示 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{park.current_occupancy}人</span>
                      <span>{Math.round((park.current_occupancy / park.max_capacity) * 100)}%</span>
                      <span>{park.max_capacity}人</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${getOccupancyStatus(park.current_occupancy, park.max_capacity).barColor}`}
                        style={{ width: `${(park.current_occupancy / park.max_capacity) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center justify-center space-x-1 ${
                      getOccupancyStatus(park.current_occupancy, park.max_capacity).color
                    }`}>
                      <span>{getOccupancyStatus(park.current_occupancy, park.max_capacity).emoji}</span>
                      <span>{getOccupancyStatus(park.current_occupancy, park.max_capacity).text}</span>
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      {getOccupancyStatus(park.current_occupancy, park.max_capacity).description}
                    </p>
                  </div>
                  
                  {/* リアルタイム更新状況 */}
                  <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>リアルタイム更新中</span>
                  </div>
                </div>
              </Card>

              {/* 評価サマリー */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">評価</h3>
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {park.average_rating.toFixed(1)}
                  </div>
                  <div className="flex items-center justify-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-6 h-6 ${
                          star <= Math.round(park.average_rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {park.review_count}件のレビュー
                  </p>
                </div>
                
                {/* 評価分布 */}
                {park.review_count > 0 && (
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviews.filter(r => r.rating === rating).length;
                      const percentage = park.review_count > 0 ? (count / park.review_count) * 100 : 0;
                      
                      return (
                        <div key={rating} className="flex items-center space-x-2 text-sm">
                          <span className="w-3">{rating}</span>
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-400 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* アクセス情報 */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">アクセス</h3>
                <div className="text-sm text-gray-700 space-y-2">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <span>{park.address}</span>
                  </div>
                  <div className="mt-3">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        const encodedAddress = encodeURIComponent(park.address);
                        window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
                      }}
                    >
                      Google Mapsで開く
                    </Button>
                  </div>
                </div>
              </Card>

              {/* オーナーに問い合わせ */}
              <Card className="p-4">
                <Button onClick={handleContactOwner} className="w-full bg-green-600 hover:bg-green-700 text-lg py-3 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  ドッグランオーナーに問い合わせる
                </Button>
              </Card>
            </div>
          </div>

          {/* 画像プレビューモーダル */}
          {showImageModal && parkImages.length > 0 && (
            <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
              <div className="relative w-full max-w-4xl">
                {/* 閉じるボタン */}
                <button
                  onClick={closeImageModal}
                  className="absolute top-4 right-4 text-gray-800 bg-white bg-opacity-90 shadow-lg rounded-full p-2 hover:bg-opacity-100 transition-all z-10"
                >
                  <X className="w-6 h-6" />
                </button>
                
                {/* 前の画像ボタン */}
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-800 bg-white bg-opacity-90 shadow-lg rounded-full p-2 hover:bg-opacity-100 transition-all z-10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                
                {/* 次の画像ボタン */}
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-800 bg-white bg-opacity-90 shadow-lg rounded-full p-2 hover:bg-opacity-100 transition-all z-10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                
                {/* メイン画像 */}
                <div className="flex items-center justify-center h-[80vh]">
                  <img
                    src={parkImages[selectedImageIndex].url}
                    alt={parkImages[selectedImageIndex].caption || `${park.name} - 画像 ${selectedImageIndex + 1}`}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                
                {/* キャプションとカウンター */}
                <div className="absolute bottom-4 left-0 right-0 text-center text-white">
                  <p className="text-sm mb-2">{parkImages[selectedImageIndex].caption}</p>
                  <p className="text-xs">{selectedImageIndex + 1} / {parkImages.length}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Helper function to get occupancy status
const getOccupancyStatus = (current: number, max: number) => {
  const percentage = (current / max) * 100;
  
  // 4段階で表示
  if (percentage < 25) return { 
    text: '空いています', 
    color: 'text-green-600 bg-green-100',
    barColor: 'bg-green-500',
    description: '快適に利用できます',
    emoji: '😊'
  };
  if (percentage < 50) return { 
    text: 'やや空いています', 
    color: 'text-blue-600 bg-blue-100',
    barColor: 'bg-blue-500',
    description: '適度な混雑です',
    emoji: '🙂'
  };
  if (percentage < 75) return { 
    text: 'やや混んでいます', 
    color: 'text-yellow-600 bg-yellow-100',
    barColor: 'bg-yellow-500',
    description: '少し混雑しています',
    emoji: '😐'
  };
  return { 
    text: '混んでいます', 
    color: 'text-red-600 bg-red-100',
    barColor: 'bg-red-500',
    description: '大変混雑しています',
    emoji: '😰'
  };
};

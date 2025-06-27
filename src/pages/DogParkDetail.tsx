import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  Coins, 
  CheckCircle, 
  Heart, 
  Shield,
  Star,
  MessageCircle,
  Calendar,
  PawPrint,
  Edit,
  Trash2,
  Plus,
  Info,
  AlertTriangle,
  Clock,
  Building,
  X,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Unlock,
  DoorOpen,
  Key
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { DoorLockButton } from '../components/DoorLockButton';
import { ParkDetailHeader } from '../components/park/ParkDetailHeader';
import { ParkImageGallery } from '../components/park/ParkImageGallery';
import { ParkFacilityInfo } from '../components/park/ParkFacilityInfo';
import { ParkReviewSection } from '../components/park/ParkReviewSection';
import { ParkRentalInfo } from '../components/park/ParkRentalInfo';
import type { DogPark, DogParkReview, UserParkReview, Dog, Reservation } from '../types';

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

export function DogParkDetail() {
  const { parkId } = useParams();
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
  const [showLockControls, setShowLockControls] = useState(false);
  const [userHasAccess, setUserHasAccess] = useState(false);

  useEffect(() => {
    if (parkId) {
      fetchParkData();
    }
  }, [parkId, user]);

  const fetchParkData = async () => {
    try {
      // ドッグラン情報を取得
      const { data: parkData, error: parkError } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('id', parkId)
        .eq('status', 'approved')
        .single();

      if (parkError) {
        console.error('Park not found:', parkError);
        navigate('/parks');
        return;
      }

      setPark(parkData);

      // パーク画像を取得
      const { data: imageData, error: imageError } = await supabase
        .from('dog_park_images')
        .select('*')
        .eq('park_id', parkId)
        .order('display_order', { ascending: true });

      if (!imageError && imageData) {
        // メイン画像とカバー画像も含めて表示
        const allImages: ParkImage[] = [];
        
        // メイン画像を先頭に追加
        if (parkData.image_url) {
          allImages.push({
            id: 'main',
            url: parkData.image_url,
            caption: `${parkData.name} - メイン画像`
          });
        }
        
        // カバー画像を追加
        if (parkData.cover_image_url) {
          allImages.push({
            id: 'cover',
            url: parkData.cover_image_url,
            caption: `${parkData.name} - カバー画像`
          });
        }
        
        // その他の画像を追加
        imageData.forEach(img => {
          allImages.push({
            id: img.id,
            url: img.image_url,
            caption: img.caption || `${parkData.name} - 施設画像`
          });
        });
        
        setParkImages(allImages);
      }

      // レビューを取得
      const { data: reviewsData, error: reviewsError } = await supabase
        .rpc('get_park_reviews', { park_id_param: parkId });

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
      } else {
        setReviews(reviewsData || []);
      }

      // 施設貸し切り予約を取得（今後の予約）
      const { data: rentalsData, error: rentalsError } = await supabase
        .from('reservations')
        .select('*')
        .eq('park_id', parkId)
        .eq('reservation_type', 'whole_facility')
        .eq('status', 'confirmed')
        .gte('date', new Date().toISOString().split('T')[0]);

      if (rentalsError) {
        console.error('Error fetching facility rentals:', rentalsError);
      } else {
        setFacilityRentals(rentalsData || []);
        
        // 本日の貸し切り予約を抽出
        const today = new Date().toISOString().split('T')[0];
        const todayRentals = rentalsData?.filter(rental => rental.date === today) || [];
        setTodayRentals(todayRentals);
      }

      // スマートロック情報を取得
      const { data: locksData, error: locksError } = await supabase
        .from('smart_locks')
        .select('id, lock_id, lock_name, park_id')
        .eq('park_id', parkId)
        .eq('status', 'active');

      if (locksError) {
        console.error('Error fetching smart locks:', locksError);
      } else {
        setSmartLocks(locksData || []);
      }

      if (user) {
        // ユーザーの犬を取得
        const { data: dogsData, error: dogsError } = await supabase
          .from('dogs')
          .select(`
            *,
            vaccine_certifications!inner(*)
          `)
          .eq('owner_id', user.id)
          .eq('vaccine_certifications.status', 'approved');

        if (dogsError) {
          console.error('Error fetching dogs:', dogsError);
        } else {
          setUserDogs(dogsData || []);
        }

        // ユーザーがレビュー可能かチェック
        const { data: canReviewData, error: canReviewError } = await supabase
          .rpc('can_user_review_park', {
            user_id_param: user.id,
            park_id_param: parkId
          });

        if (!canReviewError) {
          setCanReview(canReviewData);
        }

        // ユーザーの既存レビューを取得
        const { data: userReviewData, error: userReviewError } = await supabase
          .rpc('get_user_park_review', {
            user_id_param: user.id,
            park_id_param: parkId
          });

        if (!userReviewError && userReviewData && userReviewData.length > 0) {
          setUserReview(userReviewData[0]);
          setReviewFormData({
            rating: userReviewData[0].rating,
            review_text: userReviewData[0].review_text || '',
            visit_date: userReviewData[0].visit_date,
            dog_id: userReviewData[0].dog_id,
          });
        }

        // ユーザーがこの施設にアクセスできるか確認
        if (smartLocks.length > 0) {
          const { data: accessData, error: accessError } = await supabase.rpc('check_user_park_access', {
            p_user_id: user.id,
            p_lock_id: smartLocks[0].lock_id
          });

          if (!accessError && accessData && accessData.has_access) {
            setUserHasAccess(true);
            setShowLockControls(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching park data:', error);
      navigate('/parks');
    } finally {
      setIsLoading(false);
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
    } catch (error: any) {
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
    <div className="max-w-6xl mx-auto">
      {/* パンくずナビ */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
        <Link to="/parks" className="hover:text-blue-600">ドッグラン一覧</Link>
        <span>/</span>
        <span className="text-gray-900">{park.name}</span>
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
              <Link to={`/parks/${park.id}/reserve`}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  予約する
                </Button>
              </Link>
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
                    以下の時間帯は施設貸し切りのため、通常利用（1日券・サブスク）での入場はできません。
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
            user={user}
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
            <Link to={`/parks/${park.id}/reserve`}>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3">
                予約する
              </Button>
            </Link>
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
                  <span className="font-medium">¥{park.private_booth_price}/2時間</span>
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
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(park.current_occupancy / park.max_capacity) * 100}%` }}
                />
              </div>
              <div className="text-center">
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                  getOccupancyStatus(park.current_occupancy, park.max_capacity).color
                }`}>
                  {getOccupancyStatus(park.current_occupancy, park.max_capacity).text}
                </span>
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
        </div>
      </div>

      {/* 画像プレビューモーダル */}
      {showImageModal && parkImages.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-4xl">
            {/* 閉じるボタン */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* 前の画像ボタン */}
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-opacity z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            {/* 次の画像ボタン */}
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-opacity z-10"
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
    </div>
  );
}

// Helper function to get occupancy status
function getOccupancyStatus(current: number, max: number) {
  const percentage = (current / max) * 100;
  
  // 4段階で表示
  if (percentage < 25) return { text: '空いています', color: 'text-green-600 bg-green-100' };
  if (percentage < 50) return { text: 'やや空いています', color: 'text-blue-600 bg-blue-100' };
  if (percentage < 75) return { text: 'やや混んでいます', color: 'text-yellow-600 bg-yellow-100' };
  return { text: '混んでいます', color: 'text-red-600 bg-red-100' };
}
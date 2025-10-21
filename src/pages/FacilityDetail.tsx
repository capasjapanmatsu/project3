import {
    ArrowLeft,
    Building,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    ExternalLink,
    Gift,
    MapPin,
    MessageSquare,
    Phone,
    Star,
    Users,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import ImageCropper from '../components/ImageCropper';
import { SEO } from '../components/SEO';
import { CouponDisplay } from '../components/coupons/CouponDisplay';
import useAuth from '../context/AuthContext';
import type { FacilityCoupon, UserCoupon } from '../types/coupons';
import type { FacilityCategory, FacilityImage, PetFacility } from '../types/facilities';
import { supabase } from '../utils/supabase';

interface FacilityWithDetails extends PetFacility {
  category_info?: FacilityCategory;
  images?: FacilityImage[];
  coupons?: FacilityCoupon[];
  opening_time?: string;
  closing_time?: string;
  weekly_closed_days?: string;
  specific_closed_dates?: string;
}

interface FacilityReview {
  id: string;
  facility_id: string;
  user_id: string;
  dog_name: string;
  rating: number;
  comment: string;
  visit_date: string;
  created_at: string;
  image_url?: string; // 追加
}

interface ReviewSummary {
  facility_id: string;
  review_count: number;
  average_rating: number;
  rating_5_count: number;
  rating_4_count: number;
  rating_3_count: number;
  rating_2_count: number;
  rating_1_count: number;
}



export function FacilityDetail() {
  const { id: facilityId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [facility, setFacility] = useState<FacilityWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [showCouponDisplay, setShowCouponDisplay] = useState(false);
  const [displayingCoupon, setDisplayingCoupon] = useState<UserCoupon | null>(null);
  const [obtainingCouponId, setObtainingCouponId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  
  // レビュー機能のstate
  const [reviews, setReviews] = useState<FacilityReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    visit_date: new Date().toISOString().split('T')[0],
    image_url: ''
  });
  const [userDogs, setUserDogs] = useState<any[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [reviewImageModal, setReviewImageModal] = useState<string | null>(null);

  // 画像処理用のstate
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [reviewImageFile, setReviewImageFile] = useState<File | null>(null);
  const [reviewImagePreview, setReviewImagePreview] = useState<string | null>(null);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);

  // ImageCropperの完了処理
  const handleImageCropComplete = (croppedFile: File) => {
    setCroppedImageFile(croppedFile);
    setReviewImagePreview(URL.createObjectURL(croppedFile));
    setShowImageCropper(false);
  };

  // ImageCropperのキャンセル処理
  const handleImageCropCancel = () => {
    setReviewImageFile(null);
    setShowImageCropper(false);
  };

  // カテゴリの日本語マッピング
  const CATEGORY_LABELS: { [key: string]: string } = {
    'pet_hotel': 'ペットホテル',
    'pet_salon': 'ペットサロン',
    'veterinary': '動物病院',
    'pet_cafe': 'ペットカフェ',
    'pet_restaurant': 'ペット同伴レストラン',
    'pet_shop': 'ペットショップ',
    'pet_accommodation': 'ペット同伴宿泊',
    'dog_training': 'しつけ教室',
    'pet_friendly_other': 'その他ワンちゃん同伴可能施設'
  };

  useEffect(() => {
    if (!facilityId) {
      navigate('/dog-park-list');
      return;
    }
    fetchFacilityData();
  }, [facilityId, navigate]);

  const fetchFacilityData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 基本的な施設情報のみを取得（エラー回避のため簡素化）
      const facilityResult = await supabase
        .from('pet_facilities')
        .select('*')
        .eq('id', facilityId)
        .single();

      // 施設画像（エラーを無視）
      const imagesResult = await supabase
        .from('pet_facility_images')
        .select('id, facility_id, image_url, image_type, display_order, created_at, alt_text')
        .eq('facility_id', facilityId)
        .order('display_order', { ascending: true })
        .then(result => result)
        .catch(() => ({ data: [], error: null }));

      // アクティブなクーポン（開始済みかつ期限内）
      const nowIso = new Date().toISOString();
      const couponsResult = await supabase
        .from('facility_coupons')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('is_active', true)
        .lte('start_date', nowIso)
        .gte('end_date', nowIso)
        .order('created_at', { ascending: false })
        .then(result => result)
        .catch(() => ({ data: [], error: null }));

      if (facilityResult.error) throw facilityResult.error;
      if (!facilityResult.data) {
        throw new Error('施設が見つかりません');
      }

      // 取得したデータを設定
      const facilityData: FacilityWithDetails = {
        ...facilityResult.data,
        images: imagesResult.data || [],
        coupons: couponsResult.data || []
      };

      setFacility(facilityData);
      
      // レビューデータの取得（エラーを無視、シンプルなクエリ）
      const reviewsResult = await supabase
        .from('facility_reviews')
        .select(`
          id,
          facility_id,
          user_id,
          dog_name,
          rating,
          comment,
          visit_date,
          created_at,
          image_url
        `)
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false })
        .then(result => result)
        .catch(() => ({ data: [], error: null }));
      
      // レビューサマリーを取得（エラーを無視）
      const reviewSummaryResult = await supabase
        .from('facility_reviews')
        .select('rating')
        .eq('facility_id', facilityId)
        .then(result => result)
        .catch(() => ({ data: [], error: null }));
      
      // ログインユーザーの犬一覧を取得（LIFFログイン対応）
      const uid = user?.id;
      const userDogsResult = uid ? await supabase
        .from('dogs')
        .select('id, name, gender')
        .eq('owner_id', uid) : { data: [] };

      if (reviewsResult.data) {
        console.log('Reviews data:', reviewsResult.data);
        setReviews(reviewsResult.data);
      } else {
        console.log('No reviews data:', reviewsResult);
        setReviews([]);
      }

      // レビューサマリーを計算
      if (reviewSummaryResult.data && reviewSummaryResult.data.length > 0) {
        const ratings = reviewSummaryResult.data.map(r => r.rating);
        const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        setReviewSummary({
          facility_id: facilityId,
          average_rating: avgRating,
          review_count: ratings.length,
          rating_distribution: {
            5: ratings.filter(r => r === 5).length,
            4: ratings.filter(r => r === 4).length,
            3: ratings.filter(r => r === 3).length,
            2: ratings.filter(r => r === 2).length,
            1: ratings.filter(r => r === 1).length,
          }
        });
      }

      if (userDogsResult.data) {
        setUserDogs(userDogsResult.data);
      }

      // ユーザーが既に取得したクーポンをチェック
      if (uid && couponsResult.data && couponsResult.data.length > 0) {
        const couponIds = couponsResult.data.map(c => c.id);
        const { data: userCouponsData } = await supabase
          .from('user_coupons')
          .select('*')
          .eq('user_id', uid)
          .in('coupon_id', couponIds);

        setUserCoupons(userCouponsData || []);
      }

    } catch (error) {
      console.error('Error fetching facility data:', error);
      setError(error instanceof Error ? error.message : '施設情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserCoupons = async () => {
    if (!user) return;
    
    console.log('🎫 Fetching user coupons for user:', user.id, 'facility:', facilityId);
    
    try {
      // 対象施設のクーポンIDを先に取得
      const nowIso = new Date().toISOString();
      const { data: couponsForFacility } = await supabase
        .from('facility_coupons')
        .select('id')
        .eq('facility_id', facilityId)
        .eq('is_active', true)
        .lte('start_date', nowIso)
        .gte('end_date', nowIso);

      const couponIds = (couponsForFacility || []).map((c: any) => c.id);
      if (couponIds.length === 0) { setUserCoupons([]); return; }

      const { data, error } = await supabase
        .from('user_coupons')
        .select('*')
        .eq('user_id', user?.id)
        .in('coupon_id', couponIds);

      if (error) {
        console.error('❌ User coupons fetch error:', error);
      } else {
        console.log('✅ User coupons data:', data);
        setUserCoupons(data || []);
      }
    } catch (error) {
      console.error('💥 Error fetching user coupons:', error);
    }
  };

  const handleObtainCoupon = async (couponId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    console.log('🎫 Attempting to obtain coupon:', couponId, 'for user:', user.id);
    setObtainingCouponId(couponId);
    
    try {
      const { data, error } = await supabase
        .rpc('obtain_coupon', {
          p_coupon_id: couponId,
          p_user_id: user.id
        });

      console.log('🎫 Obtain coupon result:', { data, error });

      if (error) {
        console.error('❌ Obtain coupon error:', error);
        throw new Error(`クーポン取得エラー: ${error.message}`);
      }

      if (data === 'success') {
        console.log('✅ Coupon obtained successfully!');
        // クーポン取得成功
        await fetchUserCoupons(); // ユーザークーポンを再取得
        
        // 取得したクーポンを表示
        const obtainedCoupon = userCoupons.find(uc => uc.coupon_id === couponId);
        if (obtainedCoupon) {
          setDisplayingCoupon(obtainedCoupon);
          setShowCouponDisplay(true);
        }
      } else {
        // エラーハンドリング
        const errorMessages = {
          'coupon_not_found': 'クーポンが見つかりません',
          'coupon_expired': 'クーポンの有効期限が切れています',
          'coupon_inactive': 'クーポンが利用できません',
          'already_obtained': 'すでに取得済みのクーポンです'
        };
        
        const message = errorMessages[data as keyof typeof errorMessages] || `不明なエラー: ${data}`;
        console.error('❌ Coupon obtain failed:', message);
        setError(message);
      }
    } catch (error) {
      console.error('💥 Coupon obtain error:', error);
      const errorMessage = error instanceof Error ? error.message : 'クーポンの取得に失敗しました';
      setError(errorMessage);
    } finally {
      setObtainingCouponId(null);
    }
  };

  const handleShowCoupon = (userCoupon: UserCoupon) => {
    setDisplayingCoupon(userCoupon);
    setShowCouponDisplay(true);
  };

  const nextImage = () => {
    if (facility?.images && facility.images.length > 0) {
      setSelectedImageIndex((prev) => 
        prev === facility.images!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (facility?.images && facility.images.length > 0) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? facility.images!.length - 1 : prev - 1
      );
    }
  };

  // 営業時間・定休日の表示用ヘルパー関数
  const formatOperatingHours = () => {
    if (!facility?.opening_time || !facility?.closing_time) {
      return '営業時間の情報がありません';
    }
    return `${facility.opening_time.slice(0, 5)} 〜 ${facility.closing_time.slice(0, 5)}`;
  };

  const getClosedDaysText = () => {
    if (!facility?.weekly_closed_days) return '定休日の情報がありません';
    
    try {
      const closedDays = JSON.parse(facility.weekly_closed_days);
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const closedDayNames = closedDays
        .map((isClosed: boolean, index: number) => isClosed ? dayNames[index] : null)
        .filter((day: string | null) => day !== null);
      
      if (closedDayNames.length === 0) return '年中無休';
      return `${closedDayNames.join('・')}曜日`;
    } catch {
      return '定休日の情報がありません';
    }
  };

  const isOpenToday = () => {
    if (!facility?.weekly_closed_days) return null;
    
    try {
      const closedDays = JSON.parse(facility.weekly_closed_days);
      const today = new Date().getDay();
      return !closedDays[today];
    } catch {
      return null;
    }
  };

  // 星評価表示コンポーネント
  const StarRating = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // 画像アップロード関数
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // 画像ファイルかチェック
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください。');
      return;
    }

    setUploadingImage(true);
    try {
      // ファイル名を生成（ユーザーID + タイムスタンプ）
      const fileName = `${user.id}_${Date.now()}_${file.name}`;
      const filePath = `facility-reviews/${fileName}`;

      // Supabaseストレージにアップロード
      const { data, error } = await supabase.storage
        .from('facility-images')
        .upload(filePath, file);

      if (error) throw error;

      // パブリックURLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('facility-images')
        .getPublicUrl(filePath);

      // フォームに画像URLを設定
      setNewReview(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('画像のアップロードに失敗しました。');
    } finally {
      setUploadingImage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">施設情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">エラーが発生しました</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => navigate('/parks')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              ドッグラン・施設一覧に戻る
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center">
            <div className="text-gray-400 text-6xl mb-4">🏢</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">施設が見つかりません</h1>
            <p className="text-gray-600 mb-4">指定された施設は存在しないか、現在利用できません。</p>
            <Button onClick={() => navigate('/parks')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              ドッグラン・施設一覧に戻る
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`${facility.name} - ペット関連施設`}
        description={facility.description || `${facility.category_info?.name || ''}の${facility.name}の詳細情報をご覧ください。`}
      />

      <div className="min-h-screen bg-gray-50">
        {/* ヒーローセクション */}
        <div className="relative bg-white">
          {/* ナビゲーションヘッダー */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <button
                  onClick={() => {
                    // ブラウザ履歴で戻れる場合は戻る、そうでなければドッグラン一覧へ
                    if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      navigate('/parks');
                    }
                  }}
                  className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  戻る
                </button>
              </div>
            </div>
          </div>

          {/* メインヒーローエリア */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* 画像ギャラリー（一番上） */}
            {facility.images && facility.images.length > 0 && (
              <div className="mb-8">
                {/* スワイプ対応の画像ギャラリー */}
                <div className="relative">
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
                    {facility.images.map((image, index) => (
                      <div
                        key={index}
                        className="flex-shrink-0 w-[calc(50%-8px)] aspect-[4/3] rounded-2xl overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                        style={{ scrollSnapAlign: 'start' }}
                        onClick={() => {
                          setSelectedImageIndex(index);
                          setShowImageModal(true);
                        }}
                      >
                        <img
                          src={image.image_url}
                          alt={image.alt_text || `${facility.name}の画像${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  
                  {/* 画像数インジケーター */}
                  <div className="flex justify-center mt-4 space-x-2">
                    {facility.images.map((_, index) => (
                      <button
                        key={index}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === selectedImageIndex 
                            ? 'bg-blue-500' 
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                        onClick={() => {
                          setSelectedImageIndex(index);
                          setShowImageModal(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* 左側：施設情報 */}
              <div className="space-y-6">
                {/* カテゴリバッジ */}
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
                    <Building className="w-4 h-4 mr-2" />
                    {CATEGORY_LABELS[facility.category_info?.name || ''] || facility.category_info?.name || 'ペット関連施設'}
                  </div>
                </div>

                {/* 施設名とアドレス */}
                <div className="space-y-4">
                  <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                    {facility.name}
                  </h1>
                  {/* 予約ボタンは営業時間の下に移動 */}
                  
                  <div className="space-y-3">
                    <div className="flex items-start text-gray-600">
                      <MapPin className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-lg">{facility.address}</span>
                    </div>
                    {facility && (facility as any).official_badge && (
                      <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">公式</span>
                    )}
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="w-full sm:w-auto"
                      onClick={() => {
                        const encodedAddress = encodeURIComponent(facility.address);
                        window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
                      }}
                    >
                      Google Mapsで開く
                    </Button>
                  </div>
                </div>

                {/* 連絡先情報 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {facility.phone && (
                    <div className="flex items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <Phone className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">電話番号</p>
                        <p className="font-medium text-gray-900">{facility.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {facility.website && (
                    <a
                      href={facility.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group"
                    >
                      <ExternalLink className="w-5 h-5 text-blue-500 mr-3 group-hover:text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">ウェブサイト</p>
                        <p className="font-medium text-gray-900 group-hover:text-blue-600">公式サイトを見る</p>
                      </div>
                    </a>
                  )}
                </div>

                {/* 施設説明 */}
                {facility.description && (
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">施設について</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {facility.description}
                    </p>
                  </div>
                )}

                {/* 一般投稿の未確認バッジとオーナー管理ボタン */}
                {facility && (facility as any).is_user_submitted && (
                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-yellow-800 text-sm">
                        この施設は一般ユーザーの投稿です（未確認）。オーナーが管理すると公式表示になります。
                      </div>
                      {user && (
                        <Button
                          isLoading={claiming}
                          onClick={async ()=>{
                            try {
                              setClaiming(true);
                              const { error } = await supabase.rpc('claim_facility', { p_facility_id: facilityId });
                              if (error) throw error;
                              await fetchFacilityData();
                              alert('この施設の管理者になりました（公式化）。');
                            } catch (e) {
                              alert('管理申請に失敗しました。プレミアム会員のみが利用できます。');
                            } finally { setClaiming(false); }
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          この施設を管理する
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* 営業時間・定休日 */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 text-blue-500 mr-2" />
                    営業時間・定休日
                  </h3>
                  
                  {/* 営業時間 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">営業時間</span>
                      <span className="text-gray-700">{formatOperatingHours()}</span>
                    </div>
                    
                    {/* 定休日 */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">定休日</span>
                      <span className="text-gray-700">{getClosedDaysText()}</span>
                    </div>
                    
                    {/* 本日の営業状況 */}
                    {isOpenToday() !== null && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900">本日の営業</span>
                        <span className={`font-semibold ${
                          isOpenToday() ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {isOpenToday() ? '営業中' : '定休日'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 営業時間の直下に予約ボタン */}
                <div className="mt-4">
                  <ReserveEntryInline facilityId={facilityId!} />
                </div>

                {/* アクセス */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    アクセス
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start text-gray-600">
                      <MapPin className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{facility.address}</span>
                    </div>
                    <div className="mt-3">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          const encodedAddress = encodeURIComponent(facility.address);
                          window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
                        }}
                      >
                        Google Mapsで開く
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 施設オーナーに問い合わせ */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <Button
                    onClick={async () => {
                      if (!user) { navigate('/login'); return; }
                      try {
                        // 施設のオーナーID取得
                        const { data: owner } = await supabase
                          .from('pet_facilities')
                          .select('owner_id')
                          .eq('id', facilityId)
                          .single();
                        const ownerId = owner?.owner_id;
                        if (!ownerId) { alert('オーナー情報が見つかりません'); return; }
                        // スレッド起動用メッセージ（施設名付き）
                        await supabase.from('messages').insert({
                          sender_id: user.id,
                          receiver_id: ownerId,
                          content: `（施設『${facility.name}』の詳細ページからの問い合わせ）`
                        });
                        sessionStorage.setItem('communityActiveTab', 'messages');
                        sessionStorage.setItem('communityOpenPartnerId', ownerId);
                        navigate('/community');
                      } catch {}
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-lg py-3 flex items-center justify-center"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    施設オーナーに問い合わせる
                  </Button>
                </div>

                {/* 評価・レビュー概要 */}
                {reviewSummary && (
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Star className="w-5 h-5 text-yellow-400 mr-2" />
                      レビュー
                    </h3>
                    
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <StarRating rating={Math.round(reviewSummary.average_rating)} size="lg" />
                        <span className="text-2xl font-bold text-gray-900">
                          {reviewSummary.average_rating}
                        </span>
                      </div>
                      <span className="text-gray-600">
                        ({reviewSummary.review_count}件のレビュー)
                      </span>
                    </div>
                    
                    {/* 評価分布 */}
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map(rating => {
                        const count = reviewSummary[`rating_${rating}_count` as keyof ReviewSummary] as number;
                        const percentage = reviewSummary.review_count > 0 ? (count / reviewSummary.review_count) * 100 : 0;
                        
                        return (
                          <div key={rating} className="flex items-center space-x-2 text-sm">
                            <span className="w-3 text-gray-600">{rating}</span>
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-yellow-400 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-8 text-gray-600 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 右側の画像セクションを削除 */}
            </div>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* クーポンセクション */}
          {facility.coupons && facility.coupons.length > 0 && (
            <div className="mb-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  <Gift className="w-8 h-8 inline mr-3 text-red-500" />
                  利用可能なクーポン
                </h2>
                <p className="text-gray-600">お得なクーポンをご利用ください</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {facility.coupons.map((coupon) => {
                  const userCoupon = userCoupons.find(uc => uc.coupon_id === coupon.id);
                  const isExpired = new Date(coupon.end_date || coupon.validity_end) < new Date();
                  const canObtain = !isExpired && !userCoupon && coupon.is_active;

                  return (
                    <Card key={coupon.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                      <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* 左側：チケット風クーポンデザイン */}
                          <div className="w-full max-w-sm mx-auto">
                            {coupon.coupon_image_url ? (
                              // 画像クーポンの表示
                              <div className="aspect-square w-full border-2 border-gray-300 rounded-xl overflow-hidden shadow-md">
                                <img
                                  src={coupon.coupon_image_url}
                                  alt="クーポン画像"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              // 文字クーポンの表示
                              <div className="aspect-square w-full border-2 border-gray-300 rounded-xl relative overflow-hidden shadow-md">
                                {/* チケット風の背景 */}
                                <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 relative">
                                  {/* チケットの切り込み装飾 */}
                                  <div className="absolute top-1/2 -left-3 w-6 h-6 bg-gray-50 rounded-full transform -translate-y-1/2"></div>
                                  <div className="absolute top-1/2 -right-3 w-6 h-6 bg-gray-50 rounded-full transform -translate-y-1/2"></div>
                                  
                                  {/* 背景の薄い「COUPON」テキスト */}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                    <span className="text-6xl font-bold text-white transform rotate-12">
                                      COUPON
                                    </span>
                                  </div>
                                  
                                  {/* メインコンテンツ */}
                                  <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 text-center space-y-3">
                                    <div className="bg-white/95 px-3 py-1 rounded-full shadow-sm">
                                      <span className="text-xs font-medium text-red-600">
                                        ドッグパークJPクーポン
                                      </span>
                                    </div>
                                    
                                    <div className="text-white font-bold text-sm">
                                      {facility.name}
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <h3 className="text-base font-bold text-white leading-tight">
                                        {coupon.title}
                                      </h3>
                                      <p className="text-sm text-white/90 leading-tight">
                                        {coupon.service_content}
                                      </p>
                                    </div>
                                    
                                    {coupon.discount_value && (
                                      <div className="bg-white text-red-600 px-4 py-2 rounded-full shadow-md">
                                        <span className="text-xl font-bold">
                                          {coupon.discount_value}{coupon.discount_type === 'amount' ? '円' : '%'}
                                        </span>
                                        <span className="text-xs ml-1">OFF</span>
                                      </div>
                                    )}
                                    
                                    <div className="pt-2 border-t border-white/30">
                                      <p className="text-xs text-white/80 leading-tight">
                                        {coupon.description}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 右側：クーポン情報と取得ボタン */}
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{coupon.title}</h3>
                              <p className="text-gray-600 mt-2 leading-relaxed">{coupon.service_content}</p>
                            </div>
                            
                            <div className="space-y-3 text-sm">
                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                <span className="text-gray-700">
                                  有効期限: {
                                    (() => {
                                      const end = coupon.end_date || (coupon as any).validity_end;
                                      const d = end ? new Date(end) : null;
                                      return d && !isNaN(d.getTime())
                                        ? d.toLocaleDateString('ja-JP')
                                        : '未設定';
                                    })()
                                  }
                                </span>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Users className="w-4 h-4 text-green-500" />
                                <span className="text-gray-700">利用制限: {coupon.usage_limit_type === 'once' ? '1回限り' : '何回でも'}</span>
                              </div>
                            </div>
                            
                            <div className="pt-4">
                              {!user ? (
                                <Link to="/login">
                                  <Button className="w-full py-3 text-base" variant="outline">
                                    ログインしてクーポンを取得
                                  </Button>
                                </Link>
                              ) : userCoupon ? (
                                <div className="space-y-2">
                                  {/* 取得後は誤操作防止のため詳細では表示ボタンを出さない */}
                                  <div className="w-full py-3 text-base text-center bg-gray-50 border rounded-lg">
                                    取得済みのクーポンです。表示はマイページの「マイクーポン」から行えます。
                                  </div>
                                  {userCoupon.is_used && (
                                    <p className="text-sm text-gray-500 text-center">
                                      {new Date(userCoupon.used_at!).toLocaleDateString('ja-JP')} に使用
                                    </p>
                                  )}
                                </div>
                              ) : canObtain ? (
                                <Button
                                  onClick={() => handleObtainCoupon(coupon.id)}
                                  disabled={obtainingCouponId === coupon.id}
                                  className="w-full py-3 text-base bg-red-600 hover:bg-red-700 shadow-lg"
                                >
                                  {obtainingCouponId === coupon.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                      取得中...
                                    </>
                                  ) : (
                                    <>
                                      <Gift className="w-5 h-5 mr-2" />
                                      クーポンを取得
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button disabled className="w-full py-3 text-base" variant="outline">
                                  {isExpired ? 'クーポンの有効期限切れ' : 'クーポン利用不可'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* レビューセクション */}
          {true && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                <Star className="w-8 h-8 inline mr-3 text-yellow-400" />
                レビュー
              </h2>
              <p className="text-gray-600">他の飼い主さんの体験談をご覧ください</p>
            </div>

            {/* レビュー投稿ボタン */}
            {user && userDogs.length > 0 && (
              <div className="text-center mb-8">
                <Button
                  onClick={() => setShowReviewForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Star className="w-4 h-4 mr-2" />
                  レビューを投稿する
                </Button>
              </div>
            )}

            {/* ワンちゃん未登録の場合のメッセージ */}
            {user && userDogs.length === 0 && (
              <div className="text-center mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 mb-2">
                  レビューを投稿するには、ワンちゃんの登録が必要です
                </p>
                <Link to="/dog-registration">
                  <Button variant="secondary" size="sm">
                    ワンちゃんを登録する
                  </Button>
                </Link>
              </div>
            )}

            {/* レビュー投稿フォーム */}
            {showReviewForm && (
              <Card className="p-6 mb-8 border-blue-200 bg-blue-50">
                <h3 className="text-lg font-semibold mb-4">レビューを投稿</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!user || !selectedDogId) return;

                    setIsSubmittingReview(true);
                    try {
                      const selectedDog = userDogs.find(d => d.id === selectedDogId);
                      const dogName = selectedDog ? `${selectedDog.name}${selectedDog.gender === 'male' ? 'くん' : 'ちゃん'}の飼い主さん` : 'ワンちゃんの飼い主さん';

                      let imageUrl = '';
                      
                      // トリミング済み画像がある場合はアップロード
                      if (croppedImageFile) {
                        setUploadingImage(true);
                        try {
                          // Supabaseストレージにアップロード
                          const fileName = `review_${user.id}_${facilityId}_${Date.now()}.jpg`;
                          const filePath = `facility-reviews/${fileName}`;
                          
                          const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('dog-images')
                            .upload(filePath, croppedImageFile, {
                              cacheControl: '3600',
                              upsert: false,
                              contentType: 'image/jpeg'
                            });

                          if (uploadError) throw uploadError;

                          // 公開URLを取得
                          const { data: urlData } = supabase.storage
                            .from('dog-images')
                            .getPublicUrl(filePath);
                          
                          imageUrl = urlData.publicUrl;
                        } catch (imageError) {
                          console.error('Image upload error:', imageError);
                          throw new Error('画像のアップロードに失敗しました');
                        } finally {
                          setUploadingImage(false);
                        }
                      }

                      // レビューをデータベースに保存
                      const { error } = await supabase
                        .from('facility_reviews')
                        .insert({
                          facility_id: facilityId,
                          user_id: user.id,
                          dog_name: dogName,
                          rating: newReview.rating,
                          comment: newReview.comment,
                          visit_date: newReview.visit_date,
                          image_url: imageUrl || null
                        });

                      if (error) throw error;

                      // 施設レビューボーナス（10P、1施設1回）を付与
                      try {
                        supabase.rpc('rpc_award_facility_review', { p_user: user.id, p_facility_id: facilityId }).catch(console.warn);
                      } catch {}

                      // フォームをリセット
                      setNewReview({
                        rating: 5,
                        comment: '',
                        visit_date: new Date().toISOString().split('T')[0],
                        image_url: ''
                      });
                      setReviewImageFile(null);
                      setReviewImagePreview(null);
                      setCroppedImageFile(null);
                      setSelectedDogId('');
                      setShowReviewForm(false);
                      
                      // データを再取得
                      await fetchFacilityData();
                      
                      alert('レビューを投稿しました！');
                    } catch (error) {
                      console.error('Error submitting review:', error);
                      alert(error instanceof Error ? error.message : 'レビューの投稿に失敗しました');
                    } finally {
                      setIsSubmittingReview(false);
                    }
                  }}
                  className="space-y-4"
                >
                  {/* ワンちゃん選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      レビュー投稿するワンちゃん
                    </label>
                    <select
                      value={selectedDogId}
                      onChange={(e) => setSelectedDogId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">ワンちゃんを選択してください</option>
                      {userDogs.map(dog => (
                        <option key={dog.id} value={dog.id}>
                          {dog.name}{dog.gender === 'male' ? 'くん' : 'ちゃん'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 評価 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      評価
                    </label>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setNewReview(prev => ({ ...prev, rating }))}
                          className="p-1"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              rating <= newReview.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-gray-600">
                        ({newReview.rating}点)
                      </span>
                    </div>
                  </div>

                  {/* 訪問日 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      訪問日
                    </label>
                    <input
                      type="date"
                      value={newReview.visit_date}
                      onChange={(e) => setNewReview(prev => ({ ...prev, visit_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* コメント */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      コメント
                    </label>
                    <textarea
                      value={newReview.comment}
                      onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="施設の感想をお聞かせください..."
                      required
                    />
                  </div>

                  {/* 画像アップロード */}
                  <div className="mb-4">
                    <label htmlFor="review-image" className="block text-sm font-medium text-gray-700 mb-2">
                      画像を追加（任意）
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        id="review-image"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // ファイルサイズチェック（10MB以下）
                            if (file.size > 10 * 1024 * 1024) {
                              alert('ファイルサイズは10MB以下にしてください');
                              return;
                            }
                            // ImageCropperを表示
                            setReviewImageFile(file);
                            setShowImageCropper(true);
                          }
                        }}
                        className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {(reviewImageFile || croppedImageFile) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReviewImageFile(null);
                            setReviewImagePreview(null);
                            setCroppedImageFile(null);
                          }}
                        >
                          削除
                        </Button>
                      )}
                    </div>
                    
                    {uploadingImage && (
                      <div className="mt-2 text-sm text-gray-500 flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        画像を処理中...
                      </div>
                    )}
                    
                    {reviewImagePreview && (
                      <div className="mt-3">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={reviewImagePreview} 
                            alt="レビュー画像プレビュー" 
                            className="w-20 h-20 rounded-lg object-cover border border-gray-200 shadow-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ボタン */}
                  <div className="flex space-x-3">
                    <Button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmittingReview ? '投稿中...' : '投稿する'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700"
                    >
                      キャンセル
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* レビュー一覧 */}
            <div className="space-y-6">
              {console.log('Current reviews state:', reviews)}
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <Card key={review.id} className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{review.dog_name}</p>
                          <p className="text-sm text-gray-500">
                            訪問日: {new Date(review.visit_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="text-sm text-gray-600">({review.rating}点)</span>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                    {/* レビュー画像表示（サムネイル） */}
                    {review.image_url && (
                      <div className="mt-3">
                        <img 
                          src={review.image_url} 
                          alt="レビュー画像" 
                          className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-md border border-gray-200"
                          onClick={() => setReviewImageModal(review.image_url || null)}
                        />
                        <p className="text-xs text-gray-500 mt-1">画像をタップで拡大</p>
                      </div>
                    )}

                    {/* レビュー画像モーダル */}
                    {reviewImageModal && (
                      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="relative max-w-4xl max-h-full">
                          <button
                            onClick={() => setReviewImageModal(null)}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
                          >
                            <X className="w-8 h-8" />
                          </button>
                          <img
                            src={reviewImageModal}
                            alt="レビュー画像（拡大）"
                            className="max-w-full max-h-full object-contain rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-3">
                      投稿日: {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 mb-2">まだレビューがありません</p>
                  <p className="text-gray-400">最初のレビューを投稿してみませんか？</p>
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        {/* 画像拡大モーダル */}
        {showImageModal && facility.images && facility.images.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-4xl w-full">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <X className="w-8 h-8" />
              </button>
              
              <div className="relative">
                <img
                  src={facility.images[selectedImageIndex].image_url} // image_urlからimage_dataに変更
                  alt={facility.images[selectedImageIndex].alt_text || `施設画像`}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                />
                
                {facility.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </>
                )}
              </div>
              
              <div className="text-center mt-4 text-white">
                <p>{selectedImageIndex + 1} / {facility.images.length}</p>
                {facility.images[selectedImageIndex].alt_text && (
                  <p className="text-sm text-gray-300 mt-2">
                    {facility.images[selectedImageIndex].alt_text}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* クーポン表示モーダル */}
        {showCouponDisplay && displayingCoupon && (
          <CouponDisplay
            userCoupon={displayingCoupon}
            onClose={() => {
              setShowCouponDisplay(false);
              setDisplayingCoupon(null);
            }}
          />
        )}

        {/* レビュー画像拡大モーダル */}
        {reviewImageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-2xl w-full">
              <button
                onClick={() => setReviewImageModal(null)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2"
              >
                <X className="w-6 h-6" />
              </button>
              
              <img
                src={reviewImageModal}
                alt="レビュー画像拡大"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Image Cropper Modal */}
        {showImageCropper && reviewImageFile && (
          <ImageCropper
            imageFile={reviewImageFile}
            onCropComplete={handleImageCropComplete}
            onCancel={handleImageCropCancel}
            aspectRatio={1}
            maxWidth={600}
            maxHeight={600}
          />
        )}
      </div>
    </>
  );
} 

function ReserveEntryInline({ facilityId }: { facilityId: string }) {
  const [enabled, setEnabled] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('facility_reservation_settings')
        .select('enabled')
        .eq('facility_id', facilityId)
        .maybeSingle();
      setEnabled(Boolean(data?.enabled));
    })();
  }, [facilityId]);
  if (!enabled) return null;
  return (
    <div className="mt-3">
      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(`/facilities/${facilityId}/reserve`)}>予約する</Button>
    </div>
  );
}
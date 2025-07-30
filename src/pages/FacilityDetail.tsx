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
    Phone,
    Star,
    Ticket,
    Users,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
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
  
  // レビュー機能のstate
  const [reviews, setReviews] = useState<FacilityReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    visit_date: new Date().toISOString().split('T')[0]
  });
  const [userDogs, setUserDogs] = useState<any[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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
      const [facilityResult, imagesResult, couponsResult] = await Promise.all([
        // 施設基本情報
        supabase
          .from('pet_facilities')
          .select('*')
          .eq('id', facilityId)
          .eq('status', 'approved')
          .single(),

        // 施設画像
        supabase
          .from('pet_facility_images')
          .select('id, facility_id, image_url, image_type, display_order, created_at, alt_text')
          .eq('facility_id', facilityId)
          .order('display_order', { ascending: true }),

        // アクティブなクーポン
        supabase
          .from('facility_coupons')
          .select('*')
          .eq('facility_id', facilityId)
          .eq('is_active', true)
          .gte('validity_end', new Date().toISOString())
          .order('created_at', { ascending: false })
      ]);

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
      
      // レビュー機能は一時的に無効化
      setReviews([]);
      setReviewSummary(null);
      setUserDogs([]);

      // ユーザーが既に取得したクーポンをチェック
      if (user && couponsResult.data && couponsResult.data.length > 0) {
        const couponIds = couponsResult.data.map(c => c.id);
        const { data: userCouponsData } = await supabase
          .from('user_coupons')
          .select('*')
          .eq('user_id', user.id)
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
      const { data, error } = await supabase
        .from('user_coupons')
        .select('*')
        .eq('user_id', user.id)
        .eq('facility_id', facilityId);

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
                  
                  <div className="flex items-start text-gray-600">
                    <MapPin className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-lg">{facility.address}</span>
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

                {/* 評価・レビュー概要 */}
                {reviewSummary && (
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Star className="w-5 h-5 text-yellow-400 mr-2" />
                      評価・レビュー
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
                  const isExpired = new Date(coupon.validity_end) < new Date();
                  const canObtain = !isExpired && !userCoupon && coupon.is_active;

                  // デバッグ情報をコンソールに出力
                  console.log('🎫 [Coupon Debug]', {
                    couponId: coupon.id,
                    couponTitle: coupon.title,
                    isExpired: isExpired,
                    validityEnd: coupon.validity_end,
                    userCoupon: !!userCoupon,
                    isActive: coupon.is_active,
                    canObtain: canObtain
                  });

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
                                <span className="text-gray-700">有効期限: {new Date(coupon.validity_end).toLocaleDateString('ja-JP')}</span>
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
                                <div className="space-y-3">
                                  <Button
                                    onClick={() => handleShowCoupon(userCoupon)}
                                    className="w-full py-3 text-base bg-green-600 hover:bg-green-700"
                                    disabled={userCoupon.is_used}
                                  >
                                    <Ticket className="w-5 h-5 mr-2" />
                                    {userCoupon.is_used ? 'クーポン使用済み' : 'クーポンを表示'}
                                  </Button>
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

          {/* レビューセクション - 一時的に無効化 */}
          {false && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                <Star className="w-8 h-8 inline mr-3 text-yellow-400" />
                レビュー・評価
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

                      const { error } = await supabase
                        .from('facility_reviews')
                        .insert({
                          facility_id: facilityId,
                          user_id: user.id,
                          dog_name: dogName,
                          rating: newReview.rating,
                          comment: newReview.comment,
                          visit_date: newReview.visit_date
                        });

                      if (error) throw error;

                      // フォームをリセット
                      setNewReview({
                        rating: 5,
                        comment: '',
                        visit_date: new Date().toISOString().split('T')[0]
                      });
                      setShowReviewForm(false);
                      
                      // データを再取得
                      await fetchFacilityData();
                      
                      alert('レビューを投稿しました！');
                    } catch (error) {
                      console.error('Error submitting review:', error);
                      alert('レビューの投稿に失敗しました。');
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
      </div>
    </>
  );
} 
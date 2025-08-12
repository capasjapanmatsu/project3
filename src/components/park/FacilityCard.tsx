// FacilityCard.tsx - ペット施設情報カードコンポーネント
import {
    Building2,
    Coffee,
    ExternalLink,
    Gift,
    Home,
    MapPin,
    Navigation,
    Phone,
    ShoppingBag,
    Star,
    Stethoscope,
    UtensilsCrossed
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../context/AuthContext';
import { type FacilityCoupon, type UserCoupon } from '../../types/coupons';
import { type FacilityImage, type PetFacility } from '../../types/facilities';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import { CouponDisplay } from '../coupons/CouponDisplay';

interface FacilityCardProps {
  facility: PetFacility;
  showDistance?: boolean;
  distance?: number;
}

// 施設カテゴリのアイコンマッピング
const FACILITY_ICONS = {
  veterinary_clinic: { icon: Stethoscope, label: '動物病院', color: 'text-red-600' },
  pet_friendly_restaurant: { icon: UtensilsCrossed, label: 'ペット同伴レストラン', color: 'text-orange-600' },
  pet_shop: { icon: ShoppingBag, label: 'ペットショップ', color: 'text-blue-600' },
  pet_friendly_hotel: { icon: Home, label: 'ペット同伴宿泊', color: 'text-green-600' },
  pet_salon: { icon: Building2, label: 'ペットサロン', color: 'text-purple-600' },
  pet_hotel: { icon: Coffee, label: 'ペットホテル', color: 'text-indigo-600' },
  other: { icon: Building2, label: 'その他', color: 'text-gray-600' },
} as const;

export function FacilityCard({ facility, showDistance, distance }: FacilityCardProps) {
  const { user } = useAuth();
  const [availableCoupons, setAvailableCoupons] = useState<FacilityCoupon[]>([]);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [showCouponDisplay, setShowCouponDisplay] = useState(false);
  const [displayingCoupon, setDisplayingCoupon] = useState<(UserCoupon & { coupon: FacilityCoupon }) | null>(null);
  const [facilityImages, setFacilityImages] = useState<FacilityImage[]>([]);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    void fetchFacilityImages();
    if (user) {
      void fetchCoupons();
    }
  }, [user, facility.id]);

  const fetchFacilityImages = async () => {
    try {
      setImageLoading(true);
      
      const { data: imagesData, error: imagesError } = await supabase
        .from('pet_facility_images')
        .select('id, facility_id, image_url, image_type, display_order, created_at, alt_text')
        .eq('facility_id', facility.id)
        .order('display_order', { ascending: true });

      if (imagesError) {
        console.error('Failed to fetch facility images:', imagesError);
        setFacilityImages([]);
        return;
      }

      console.log('Facility images response:', imagesData);
      setFacilityImages(imagesData || []);
    } catch (error) {
      console.error('Error fetching facility images:', error);
      setFacilityImages([]);
    } finally {
      setImageLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      // 利用可能なクーポンを取得
      const { data: coupons, error: couponsError } = await supabase
        .from('facility_coupons')
        .select('*')
        .eq('facility_id', facility.id)
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString());

      if (couponsError) throw couponsError;
      setAvailableCoupons(coupons || []);

      if (user) {
        // ユーザーが取得済みのクーポンを確認
        const couponIds = (coupons || []).map(c => c.id);
        if (couponIds.length > 0) {
          const { data: userCouponsData, error: userCouponsError } = await supabase
            .from('user_coupons')
            .select(`
              *,
              coupon:facility_coupons(*)
            `)
            .eq('user_id', user?.id)
            .in('coupon_id', couponIds);

          if (userCouponsError) throw userCouponsError;
          setUserCoupons(userCouponsData || []);
        }
      }
    } catch (error) {
      console.error('クーポン情報の取得に失敗しました:', error);
    }
  };

  const handleObtainCoupon = async (coupon: FacilityCoupon) => {
    if (!user) {
      alert('クーポンの取得にはログインが必要です。');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('obtain_coupon', {
        p_coupon_id: coupon.id,
        p_user_id: user.id
      });

      if (error) throw error;

      if (data === 'success') {
        alert('クーポンを取得しました！');
        await fetchCoupons(); // クーポン情報を再取得
      } else {
        const errorMessages: Record<string, string> = {
          'coupon_not_found': 'クーポンが見つかりません',
          'coupon_expired': 'クーポンの有効期限が切れています',
          'coupon_inactive': 'クーポンが利用できません',
          'already_obtained': 'すでに取得済みのクーポンです'
        };
        
        const message = errorMessages[data as string] || '不明なエラーが発生しました';
        alert(message);
      }
    } catch (error) {
      console.error('クーポン取得エラー:', error);
      alert('クーポンの取得に失敗しました');
    }
  };

  const handleShowCoupon = (userCoupon: UserCoupon & { coupon: FacilityCoupon }) => {
    setDisplayingCoupon(userCoupon);
    setShowCouponDisplay(true);
  };

  // カテゴリアイコンとラベルを取得
  const getCategoryInfo = () => {
    const categoryName = facility.category_id || facility.category || 'other';
    return FACILITY_ICONS[categoryName as keyof typeof FACILITY_ICONS] || FACILITY_ICONS.other;
  };

  const categoryInfo = getCategoryInfo();
  const Icon = categoryInfo.icon;

  // 営業時間の判定
  const isCurrentlyOpen = () => {
    if (!facility.opening_hours || !facility.closing_hours) return false;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    return currentTime >= facility.opening_hours && currentTime <= facility.closing_hours;
  };

  // 評価の星を表示
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />);
      }
    }
    
    return (
      <div className="flex items-center space-x-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  // 距離のフォーマット
  const formatDistance = (distanceKm: number) => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
  };

  const mainImage = facilityImages.length > 0 ? facilityImages[0] : null;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden cursor-pointer border border-gray-200">
      {/* メイン画像セクションを削除 */}
      
      <div className="p-4">
        {/* カテゴリとステータス */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Icon className={`w-5 h-5 ${categoryInfo.color}`} />
            <span className="text-sm text-gray-600">{categoryInfo.label}</span>
          </div>
          
          {isCurrentlyOpen() ? (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              営業中
            </span>
          ) : (
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
              営業時間外
            </span>
          )}
        </div>

        {/* 施設名 */}
        <div className="flex items-center mb-2">
          {/* サムネイル画像（2倍サイズ） */}
          {mainImage && (
            <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 shadow-sm mr-4 flex-shrink-0">
              <img
                src={mainImage.image_url}
                alt={`${facility.name}のサムネイル`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          )}
          
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 flex-1">
            {facility.name}
          </h3>
        </div>

        {/* 評価 */}
        {facility.rating && (
          <div className="mb-2">
            {renderRating(facility.rating)}
          </div>
        )}

        {/* 住所 */}
        {facility.address && (
          <div className="flex items-start text-gray-600 text-sm mb-2">
            <MapPin className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{facility.address}</span>
          </div>
        )}

        {/* 距離表示 */}
        {showDistance && distance && (
          <div className="flex items-center text-gray-600 text-sm mb-2">
            <Navigation className="w-4 h-4 mr-1" />
            <span>現在地から {formatDistance(distance)}</span>
          </div>
        )}

        {/* 電話番号 */}
        {facility.phone && (
          <div className="flex items-center text-gray-600 text-sm mb-3">
            <Phone className="w-4 h-4 mr-1" />
            <a 
              href={`tel:${facility.phone}`}
              className="hover:text-blue-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {facility.phone}
            </a>
          </div>
        )}

        {/* 説明文 */}
        {facility.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {facility.description}
          </p>
        )}

        {/* アクションボタン */}
        <div className="space-y-2">
          {/* クーポン関連ボタン */}
          {availableCoupons.length > 0 && (
            <div className="space-y-2">
              {availableCoupons.map((coupon) => {
                const userCoupon = userCoupons.find(uc => uc.coupon_id === coupon.id);
                
                if (userCoupon) {
                  // 既に取得済みのクーポン
                  return (
                    <Button
                      key={coupon.id}
                      onClick={() => handleShowCoupon(userCoupon)}
                      className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700"
                      disabled={userCoupon.is_used && coupon.usage_limit_type === 'once'}
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      {userCoupon.is_used && coupon.usage_limit_type === 'once' 
                        ? 'クーポン使用済み' 
                        : 'クーポンを表示'
                      }
                    </Button>
                  );
                } else {
                  // 未取得のクーポン
                  return (
                    <Button
                      key={coupon.id}
                      onClick={() => handleObtainCoupon(coupon)}
                      className="w-full flex items-center justify-center bg-pink-600 hover:bg-pink-700"
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      クーポンを取得
                    </Button>
                  );
                }
              })}
            </div>
          )}

          {/* 既存のボタン */}
          <div className="flex space-x-2">
            <Link to={`/facilities/${facility.id}`} className="flex-1">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                詳細を見る
              </Button>
            </Link>
            
            {facility.website_url && (
              <a
                href={facility.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button className="w-full">
                  ウェブサイト
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

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
  );
}

export default FacilityCard;

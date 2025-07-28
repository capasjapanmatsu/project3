// FacilityCard.tsx - ペット施設情報カードコンポーネント
import {
    Building2,
    Clock,
    Coffee,
    ExternalLink,
    Gift,
    Heart,
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
import { type FacilityCoupon, type ObtainCouponResponse, type UserCoupon } from '../../types/coupons';
import { type FacilityCategory, type PetFacility } from '../../types/facilities';
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

  useEffect(() => {
    if (user) {
      fetchCoupons();
    }
  }, [user, facility.id]);

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
        const { data: userCouponsData, error: userCouponsError } = await supabase
          .from('user_coupons')
          .select(`
            *,
            coupon:facility_coupons(*)
          `)
          .eq('user_id', user.id)
          .in('coupon_id', (coupons || []).map(c => c.id));

        if (userCouponsError) throw userCouponsError;
        setUserCoupons(userCouponsData || []);
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
        coupon_uuid: coupon.id
      });

      if (error) throw error;

      const response = data as ObtainCouponResponse;
      
      if (response.success) {
        alert(response.message);
        fetchCoupons(); // クーポン状態を更新
      } else {
        alert(response.error);
      }
    } catch (error) {
      alert('クーポンの取得に失敗しました。');
    }
  };

  const handleShowCoupon = (userCoupon: UserCoupon) => {
    if (userCoupon.is_used && userCoupon.coupon?.usage_limit_type === 'once') {
      alert('このクーポンは既に使用済みです。');
      return;
    }

    const couponWithData = userCoupon as UserCoupon & { coupon: FacilityCoupon };
    setDisplayingCoupon(couponWithData);
    setShowCouponDisplay(true);
  };

  // 営業状況の判定
  const isOpen = () => {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    if (facility.opening_hours && facility.closing_hours) {
      const opening = parseInt(facility.opening_hours.replace(':', ''), 10);
      const closing = parseInt(facility.closing_hours.replace(':', ''), 10);
      
      return currentTime >= opening && currentTime <= closing;
    }
    
    return null;
  };

  // カテゴリのアイコンとラベルを取得
  const getCategoryInfo = (category: FacilityCategory | undefined) => {
    if (!category || !(category in FACILITY_ICONS)) {
      return FACILITY_ICONS.other;
    }
    return FACILITY_ICONS[category as keyof typeof FACILITY_ICONS];
  };

  const categoryInfo = getCategoryInfo(facility.category);
  const Icon = categoryInfo.icon;
  const isCurrentlyOpen = isOpen();

  // 評価の表示（5段階評価）
  const renderRating = (rating?: number) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">({rating})</span>
      </div>
    );
  };

  // 距離の表示
  const formatDistance = (dist?: number) => {
    if (!dist) return '';
    
    if (dist < 1) {
      return `${Math.round(dist * 1000)}m`;
    }
    return `${dist.toFixed(1)}km`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* 施設画像 */}
      {facility.image_url && (
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          <img
            src={facility.image_url}
            alt={facility.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* お気に入りボタン */}
          <button
            className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // お気に入り機能の実装
            }}
          >
            <Heart className="w-4 h-4 text-gray-600 hover:text-red-500" />
          </button>
        </div>
      )}

      <div className="p-4">
        {/* カテゴリとステータス */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Icon className={`w-5 h-5 ${categoryInfo.color}`} />
            <span className="text-sm text-gray-600">{categoryInfo.label}</span>
          </div>
          
          {isCurrentlyOpen ? (
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
        <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
          {facility.name}
        </h3>

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

        {/* 営業時間 */}
        {facility.opening_hours && facility.closing_hours && (
          <div className="flex items-center text-gray-600 text-sm mb-2">
            <Clock className="w-4 h-4 mr-1" />
            <span>{facility.opening_hours} - {facility.closing_hours}</span>
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

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

// 施設カテゴリのアイコンマッピング（登録時のIDに対応）
const FACILITY_ICONS = {
  // 既存キー
  veterinary_clinic: { icon: Stethoscope, label: '動物病院', color: 'text-red-600' },
  pet_friendly_restaurant: { icon: UtensilsCrossed, label: 'ペット同伴レストラン', color: 'text-orange-600' },
  pet_shop: { icon: ShoppingBag, label: 'ペットショップ', color: 'text-blue-600' },
  pet_friendly_hotel: { icon: Home, label: 'ペット同伴宿泊', color: 'text-green-600' },
  pet_salon: { icon: Building2, label: 'ペットサロン', color: 'text-purple-600' },
  pet_hotel: { icon: Coffee, label: 'ペットホテル', color: 'text-indigo-600' },

  // 登録フォームのIDに合わせたエイリアス/追加
  pet_cafe: { icon: Coffee, label: 'ペットカフェ', color: 'text-orange-600' },
  pet_restaurant: { icon: UtensilsCrossed, label: 'ペット同伴レストラン', color: 'text-orange-600' },
  veterinary: { icon: Stethoscope, label: '動物病院', color: 'text-red-600' },
  pet_accommodation: { icon: Home, label: 'ペット同伴宿泊', color: 'text-green-600' },
  dog_training: { icon: Building2, label: 'しつけ教室', color: 'text-yellow-600' },
  pet_friendly_other: { icon: Building2, label: 'その他ワンちゃん同伴可能施設', color: 'text-gray-600' },

  other: { icon: Building2, label: 'その他', color: 'text-gray-600' },
} as const;

// 入力されたカテゴリIDを正規化（別名・表記揺れに強くする）
function normalizeCategoryId(raw?: string | null): keyof typeof FACILITY_ICONS {
  if (!raw) return 'other';
  const id = String(raw).toLowerCase();
  if (id in FACILITY_ICONS) return id as keyof typeof FACILITY_ICONS;
  if (id.includes('veterinary') || id.includes('clinic')) return 'veterinary';
  if (id.includes('restaurant')) return 'pet_restaurant';
  if (id.includes('cafe')) return 'pet_cafe';
  if (id.includes('shop')) return 'pet_shop';
  if (id.includes('salon')) return 'pet_salon';
  if (id.includes('hotel')) return 'pet_hotel';
  if (id.includes('accommodation')) return 'pet_accommodation';
  if (id.includes('training')) return 'dog_training';
  if (id.includes('other')) return 'pet_friendly_other';
  return 'other';
}

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
    // 一覧段階でもクーポン有無の表示が必要なため、ユーザー未ログインでも取得する
    void fetchCoupons();
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
    const normalized = normalizeCategoryId((facility as any).category_id ?? facility.category ?? 'other');
    return FACILITY_ICONS[normalized] || FACILITY_ICONS.other;
  };

  const categoryInfo = getCategoryInfo();
  const Icon = categoryInfo.icon;

  // 営業時間の判定（施設編集の設定に準拠）
  const isCurrentlyOpen = () => {
    const opening = facility.opening_time || undefined;
    const closing = facility.closing_time || undefined;
    if (!opening || !closing) return false;

    const todayStr = new Date().toISOString().slice(0, 10);
    // 休業日の判定
    try {
      if (facility.specific_closed_dates) {
        const closedDates: string[] = JSON.parse(facility.specific_closed_dates);
        if (Array.isArray(closedDates) && closedDates.includes(todayStr)) return false;
      }
      if (facility.weekly_closed_days) {
        const weekly: boolean[] = JSON.parse(facility.weekly_closed_days);
        const dow = new Date().getDay();
        // 臨時営業日は定休日を上書き
        if (weekly?.[dow]) {
          if (facility.specific_open_dates) {
            const opens: string[] = JSON.parse(facility.specific_open_dates);
            if (Array.isArray(opens) && opens.includes(todayStr)) {
              // continue
            } else {
              return false;
            }
          } else {
            return false;
          }
        }
      }
    } catch {}

    const now = new Date();
    const hhmm = now.toTimeString().slice(0,5);
    const inRange = (hhmm >= opening.slice(0,5)) && (hhmm <= closing.slice(0,5));
    return inRange;
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
            <span className="text-sm text-gray-600">{facility.category_name || categoryInfo.label}</span>
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
          {/* 一覧では「クーポンあり」バッジのみ表示（取得・表示は不可） */}
          {availableCoupons.length > 0 && (
            <div className="inline-flex items-center text-sm text-pink-700 bg-pink-50 border border-pink-200 rounded-full px-2 py-1">
              <Gift className="w-4 h-4 mr-1" />
              <span>クーポンあり</span>
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

// FacilityCard.tsx - ペット施設情報カードコンポーネント
import {
    Building2,
    Clock,
    Coffee,
    ExternalLink,
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
import { Link } from 'react-router-dom';
import { type FacilityCategory, type PetFacility } from '../../types/facilities';
import Button from '../Button';

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
  // 営業状況の判定
  const isOpen = () => {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    if (facility.opening_hours && facility.closing_hours) {
      const opening = parseInt(facility.opening_hours.replace(':', ''), 10);
      const closing = parseInt(facility.closing_hours.replace(':', ''), 10);
      
      return currentTime >= opening && currentTime <= closing;
    }
    
    return true; // デフォルトは営業中として扱う
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
  );
}

export default FacilityCard;

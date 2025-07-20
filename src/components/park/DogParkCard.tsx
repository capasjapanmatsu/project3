// DogParkCard.tsx - ドッグパーク情報カードコンポーネント
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Coins,
    ExternalLink,
    Heart,
    MapPin,
    Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { type DogPark } from '../../types';
import Button from '../Button';

interface DogParkCardProps {
  park: DogPark;
}

export function DogParkCard({ park }: DogParkCardProps) {
  // 営業状況の判定
  const isOpen = () => {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    if (park.opening_hours && park.closing_hours) {
      const opening = parseInt(park.opening_hours.replace(':', ''), 10);
      const closing = parseInt(park.closing_hours.replace(':', ''), 10);
      
      return currentTime >= opening && currentTime <= closing;
    }
    
    return true; // デフォルトは営業中として扱う
  };

  // 混雑状況の表示
  const getOccupancyStatus = () => {
    if (!park.current_occupancy || !park.max_capacity) {
      return { label: '情報なし', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    }

    const rate = (park.current_occupancy / park.max_capacity) * 100;

    if (rate >= 90) {
      return { label: '満員', color: 'text-red-600', bgColor: 'bg-red-100' };
    } else if (rate >= 70) {
      return { label: '混雑', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    } else if (rate >= 40) {
      return { label: '普通', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    } else {
      return { label: '空いている', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
  };

  const occupancyStatus = getOccupancyStatus();
  const isCurrentlyOpen = isOpen();

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* パーク画像 */}
      {park.image_url && (
        <div className="aspect-video relative overflow-hidden rounded-t-lg">
          <img
            src={park.image_url}
            alt={park.name}
            className="w-full h-full object-cover"
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
        {/* パーク名と営業状況 */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg text-gray-900 flex-1">
            {park.name}
          </h3>
          <div className="flex items-center space-x-2 ml-2">
            {isCurrentlyOpen ? (
              <span className="flex items-center text-green-600 text-sm">
                <CheckCircle className="w-4 h-4 mr-1" />
                営業中
              </span>
            ) : (
              <span className="flex items-center text-red-600 text-sm">
                <AlertTriangle className="w-4 h-4 mr-1" />
                営業時間外
              </span>
            )}
          </div>
        </div>

        {/* 住所 */}
        {park.address && (
          <div className="flex items-center text-gray-600 text-sm mb-2">
            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="truncate">{park.address}</span>
          </div>
        )}

        {/* 営業時間 */}
        {park.opening_hours && park.closing_hours && (
          <div className="flex items-center text-gray-600 text-sm mb-2">
            <Clock className="w-4 h-4 mr-1" />
            <span>{park.opening_hours} - {park.closing_hours}</span>
          </div>
        )}

        {/* 料金情報 */}
        {park.price_per_hour && (
          <div className="flex items-center text-gray-600 text-sm mb-3">
            <Coins className="w-4 h-4 mr-1" />
            <span>¥{park.price_per_hour}/時間</span>
          </div>
        )}

        {/* 混雑状況 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1 text-gray-600" />
            <span className="text-sm text-gray-600">混雑状況:</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${occupancyStatus.color} ${occupancyStatus.bgColor}`}>
            {occupancyStatus.label}
          </span>
        </div>

        {/* 利用者数表示 */}
        {park.current_occupancy !== undefined && park.max_capacity && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>現在の利用者</span>
              <span>{park.current_occupancy} / {park.max_capacity}名</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  park.current_occupancy / park.max_capacity >= 0.9
                    ? 'bg-red-500'
                    : park.current_occupancy / park.max_capacity >= 0.7
                    ? 'bg-orange-500'
                    : park.current_occupancy / park.max_capacity >= 0.4
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min((park.current_occupancy / park.max_capacity) * 100, 100)}%`
                }}
              />
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex space-x-2">
          <Link to={`/parks/${park.id}`} className="flex-1">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              詳細を見る
            </Button>
          </Link>
          {isCurrentlyOpen && park.current_occupancy < park.max_capacity && (
            <Link to={`/parks/${park.id}/reserve`} className="flex-1">
              <Button className="w-full">
                予約する
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default DogParkCard;

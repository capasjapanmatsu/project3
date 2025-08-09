import { PARK_PLACEHOLDER_SVG } from '../../utils/placeholders';
// DogParkCard.tsx - ドッグパーク情報カードコンポーネント
import {
    AlertTriangle,
    CheckCircle,
    Coins,
    ExternalLink,
    Heart,
    MapPin,
    Navigation,
    Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { type DogPark } from '../../types';
import Button from '../Button';

interface DogParkCardProps {
  park: DogPark;
  userLocation?: { lat: number; lng: number } | null;
  distance?: number; // km単位
}

// 距離計算関数（Haversine formula）
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // 地球の半径（km）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// 距離をフォーマット
const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

export function DogParkCard({ park, userLocation, distance }: DogParkCardProps) {
  // 距離を計算（propsで渡されていない場合）
  const calculatedDistance = distance || (
    userLocation && park.latitude && park.longitude
      ? calculateDistance(userLocation.lat, userLocation.lng, Number(park.latitude), Number(park.longitude))
      : null
  );

  // 営業状況の判定（簡易版 - 型にopening_hoursがないため）
  const isOpen = () => {
    // 実際の営業時間データがないため、常に営業中として扱う
    return true;
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
      <div className="aspect-square relative overflow-hidden rounded-t-lg">
        <img
          src={park.image_url || PARK_PLACEHOLDER_SVG}
          alt={park.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = PARK_PLACEHOLDER_SVG; }}
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

      <div className="p-4">
        {/* パーク名と営業状況 */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900">
              {park.name}
            </h3>
            {/* メンテナンス情報 */}
            {park.currentMaintenance && (
              <div className="mt-1">
                <p className="text-red-600 text-sm font-medium">
                  {park.currentMaintenance.title}
                  {park.currentMaintenance.is_emergency && ' (緊急)'}
                </p>
                <p className="text-red-500 text-xs">
                  {new Date(park.currentMaintenance.start_date).toLocaleDateString('ja-JP')} 
                  {' '}
                  {new Date(park.currentMaintenance.start_date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  {' 〜 '}
                  {new Date(park.currentMaintenance.end_date).toLocaleDateString('ja-JP')} 
                  {' '}
                  {new Date(park.currentMaintenance.end_date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {park.currentMaintenance.description && (
                  <p className="text-red-500 text-xs">
                    {park.currentMaintenance.description}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-2">
            {park.currentMaintenance ? (
              <span className="flex items-center text-red-600 text-sm">
                <AlertTriangle className="w-4 h-4 mr-1" />
                メンテナンス中
              </span>
            ) : isCurrentlyOpen ? (
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

        {/* 住所と距離 */}
        <div className="space-y-2 mb-2">
          {park.address && (
            <div className="flex items-center text-gray-600 text-sm">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate">{park.address}</span>
            </div>
          )}
          
          {/* 距離表示 */}
          {calculatedDistance && (
            <div className="flex items-center text-blue-600 text-sm font-medium">
              <Navigation className="w-4 h-4 mr-1" />
              <span>現在地から {formatDistance(calculatedDistance)}</span>
            </div>
          )}
        </div>

        {/* 料金情報 */}
        {park.price && (
          <div className="flex items-center text-gray-600 text-sm mb-3">
            <Coins className="w-4 h-4 mr-1" />
            <span>¥{park.price}/日</span>
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
              className="w-full flex items-center justify-center !rounded-lg"
              style={{ borderRadius: '0.5rem' }}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              詳細
            </Button>
          </Link>
          {park.currentMaintenance ? (
            <Button 
              className="w-full opacity-50 cursor-not-allowed !rounded-lg" 
              disabled
              title="メンテナンス中のため予約できません"
              style={{ borderRadius: '0.5rem' }}
            >
              予約不可
            </Button>
          ) : (
            <>
              <Link to={`/access-control?park=${park.id}`} className="flex-1">
                <Button 
                  className="w-full !rounded-lg"
                  style={{ borderRadius: '0.5rem' }}
                >
                  入場する
                </Button>
              </Link>
              <Link to={`/parks/${park.id}/reserve`} className="flex-1">
                <Button 
                  variant="secondary"
                  className="w-full !rounded-lg"
                  style={{ borderRadius: '0.5rem' }}
                >
                  予約する
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DogParkCard;

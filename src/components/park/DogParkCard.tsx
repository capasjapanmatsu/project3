import { Coins, Image, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DogPark } from '../../types';
import Button from '../Button';
import Card from '../Card';

interface DogParkCardProps {
  park: DogPark;
}

// 数値を安全に変換する関数
const safeNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

export const DogParkCard: React.FC<DogParkCardProps> = ({ park }) => {
  return (
    <Card className="overflow-hidden">
      {/* パーク画像 */}
      {park.image_url ? (
        <div className="relative h-48 bg-gray-200">
          <img
            src={park.image_url}
            alt={park.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
          <div className="text-center">
            <Image className="w-12 h-12 text-blue-400 mx-auto mb-2" />
            <p className="text-blue-600 text-sm">画像なし</p>
          </div>
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {park.name}
            </h3>
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="truncate">{park.address}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <Coins className="w-4 h-4 mr-1" />
              <span>¥{park.price}/日</span>
            </div>
          </div>
        </div>

        {/* 混雑状況 */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">現在の混雑状況</span>
            <span className="text-xs text-blue-700">
              {safeNumber(park.current_occupancy)}/{safeNumber(park.max_capacity)}頭
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(100, (safeNumber(park.current_occupancy) / Math.max(1, safeNumber(park.max_capacity))) * 100)}%`
              }}
            />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex space-x-2">
          <Link 
            to={`/parks/${park.id}`}
            className="flex-1"
          >
            <Button 
              variant="secondary"
              className="w-full text-sm"
            >
              詳細を見る
            </Button>
          </Link>
          <Link 
            to={`/parks/${park.id}/reserve`}
            className="flex-1"
          >
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
            >
              予約する
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}; 
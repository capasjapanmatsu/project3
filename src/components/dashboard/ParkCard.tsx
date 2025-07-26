import { AlertTriangle, CheckCircle, Clock, Star } from 'lucide-react';
import type { DogPark } from '../../types';

interface ParkCardProps {
  park: DogPark;
  onSelect?: (park: DogPark) => void;
}

export function ParkCard({ park, onSelect }: ParkCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    if (onSelect) {
      onSelect(park);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        label: '公開中',
        icon: CheckCircle 
      },
      pending: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800', 
        label: '審査中',
        icon: Clock 
      },
      rejected: { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        label: '却下',
        icon: AlertTriangle 
      },
      second_stage_waiting: { 
        bg: 'bg-orange-100', 
        text: 'text-orange-800', 
        label: '詳細情報待ち',
        icon: Clock 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${config.bg} ${config.text}`}>
        <IconComponent className="w-3 h-3" />
        <span>{config.label}</span>
      </span>
    );
  };

  return (
    <div 
      className={`p-4 bg-white rounded-lg border border-gray-200 transition-colors ${onSelect ? 'hover:bg-gray-50 cursor-pointer' : ''}`} 
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{park.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{park.address}</p>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm">{park.average_rating?.toFixed(1) || '0.0'}</span>
            </div>
            <span className="text-sm text-gray-500">
              {park.review_count || 0}件のレビュー
            </span>
          </div>
        </div>
        <div className="ml-3">
          {getStatusBadge(park.status)}
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>料金: ¥{park.price_per_hour}/時間</span>
        <span>収容人数: {park.capacity || '未設定'}人</span>
      </div>
    </div>
  );
}

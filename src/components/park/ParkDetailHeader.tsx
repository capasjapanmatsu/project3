import type { DogPark, Reservation } from '../../types';
import { PARK_PLACEHOLDER_SVG } from '../../utils/placeholders';
// 画像の確実な表示を優先し、通常のimgを使用

interface ParkDetailHeaderProps {
  park: DogPark;
  parkImages: { id: string; url: string; caption?: string }[];
  todayRentals: Reservation[];
  onImageClick: (index: number) => void;
}

export function ParkDetailHeader({ park, parkImages, todayRentals, onImageClick }: ParkDetailHeaderProps) {
  const status = getOccupancyStatus(park.current_occupancy, park.max_capacity);
  
  return (
    <>
      {/* ヘッダー画像 */}
      {parkImages.length > 0 && (
        <div className="relative h-64 rounded-lg overflow-hidden">
          <img
            src={parkImages[0].url || PARK_PLACEHOLDER_SVG}
            alt={park.name}
            className="w-full h-full object-cover cursor-pointer"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PARK_PLACEHOLDER_SVG; }}
          />
          <button
            type="button"
            className="absolute inset-0"
            aria-label={`${park.name} の画像を拡大`}
            onClick={() => onImageClick(0)}
          />
          <div className="absolute top-4 right-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
          
          {/* 本日貸し切りありの表示 */}
          {todayRentals.length > 0 && (
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-500 text-white">
                本日貸し切りあり
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// Helper function to get occupancy status
function getOccupancyStatus(current: number, max: number) {
  const percentage = (current / max) * 100;
  
  // 4段階で表示
  if (percentage < 25) return { text: '空いています', color: 'text-green-600 bg-green-100' };
  if (percentage < 50) return { text: 'やや空いています', color: 'text-blue-600 bg-blue-100' };
  if (percentage < 75) return { text: 'やや混んでいます', color: 'text-yellow-600 bg-yellow-100' };
  return { text: '混んでいます', color: 'text-red-600 bg-red-100' };
}

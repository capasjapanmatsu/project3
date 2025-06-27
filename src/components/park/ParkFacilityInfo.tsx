import Card from '../Card';
import type { DogPark } from '../../types';

interface ParkFacilityInfoProps {
  park: DogPark;
}

export function ParkFacilityInfo({ park }: ParkFacilityInfoProps) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">設備・サービス</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries({
          parking: '駐車場',
          shower: 'シャワー設備',
          restroom: 'トイレ',
          agility: 'アジリティ設備',
          rest_area: '休憩スペース',
          water_station: '給水設備',
        }).map(([key, label]) => (
          <div key={key} className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded ${
              park.facilities[key as keyof typeof park.facilities] 
                ? 'bg-green-500' 
                : 'bg-gray-300'
            }`} />
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </div>
      {park.facility_details && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{park.facility_details}</p>
        </div>
      )}
    </Card>
  );
}
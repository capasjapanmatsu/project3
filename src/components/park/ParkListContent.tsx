import { DogParkCard } from './DogParkCard';
import { EmptyState } from './EmptyState';
import { FacilityCard } from './FacilityCard';
import { MapView } from './MapView';

interface ParkListContentProps {
  activeView: 'dogparks' | 'facilities';
  parks: any[];
  facilities: any[];
}

export function ParkListContent({ activeView, parks, facilities }: ParkListContentProps) {
  const currentData = activeView === 'dogparks' ? parks : facilities;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* マップビュー（一番上に表示） */}
      <div className="mb-8">
        <MapView 
          parks={parks}
          facilities={facilities}
          activeView={activeView}
        />
      </div>

      {/* リストビュー */}
      <div>
        {currentData.length === 0 ? (
          <EmptyState 
            title={activeView === 'dogparks' ? 'ドッグパークが見つかりません' : '施設が見つかりません'}
            description={activeView === 'dogparks' 
              ? '近くにドッグパークがないか、現在準備中です。'
              : '近くにペット施設がないか、現在準備中です。'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeView === 'dogparks' 
              ? parks.map((park) => (
                  <DogParkCard key={park.id} park={park} />
                ))
              : facilities.map((facility) => (
                  <FacilityCard key={facility.id} facility={facility} />
                ))
            }
          </div>
        )}
      </div>
    </div>
  );
} 
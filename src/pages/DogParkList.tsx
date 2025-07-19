import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../components/Button';
import { CategoryLegend } from '../components/park/CategoryLegend';
import { DogParkCard } from '../components/park/DogParkCard';
import { EmptyState } from '../components/park/EmptyState';
import { FacilityCard } from '../components/park/FacilityCard';
import { MapView } from '../components/park/MapView';
import { ViewTabs } from '../components/park/ViewTabs';
import { useFacilityData, useParkData } from '../hooks/useParkData';

const CATEGORY_LABELS: { [key: string]: string } = {
  'pet_hotel': 'ペットホテル',
  'pet_salon': 'ペットサロン',
  'veterinary': '動物病院',
  'pet_cafe': 'ペットカフェ',
  'pet_restaurant': 'ペット同伴レストラン',
  'pet_shop': 'ペットショップ',
  'pet_accommodation': 'ペット同伴宿泊'
};

export function DogParkList() {
  const [activeView, setActiveView] = useState<'dogparks' | 'facilities'>('dogparks');
  
  // カスタムフックを使用してデータ管理
  const { parks, isLoading, error, fetchParkData, setError, setIsLoading } = useParkData();
  const { facilities, facilitiesLoading, error: facilityError, fetchFacilities } = useFacilityData();

  useEffect(() => {
    if (activeView === 'dogparks') {
      fetchParkData();
    } else {
      fetchFacilities();
    }
  }, [activeView]);

  // 手動更新
  const handleManualUpdate = () => {
    if (activeView === 'dogparks') {
      fetchParkData();
    } else {
      fetchFacilities();
    }
  };

  // ローディング状態
  const isCurrentlyLoading = activeView === 'dogparks' ? isLoading : facilitiesLoading;
  const currentError = activeView === 'dogparks' ? error : facilityError;

  if (isCurrentlyLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (currentError) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
            <h2 className="text-lg font-semibold text-red-800">エラーが発生しました</h2>
          </div>
          <p className="text-red-700 mb-4">{currentError}</p>

          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              再読み込み
            </button>
            <button
              onClick={() => { 
                if (activeView === 'dogparks') {
                  setError(null); 
                  setIsLoading(true); 
                } else {
                  fetchFacilities();
                }
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* タブ切り替えUI */}
      <ViewTabs activeView={activeView} onViewChange={setActiveView} />

      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {activeView === 'dogparks' ? '承認済みドッグラン一覧' : 'その他の施設一覧'}
        </h1>
        <Button
          onClick={handleManualUpdate}
          variant="secondary"
          className="flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>更新</span>
        </Button>
      </div>

      {/* Google マップビュー */}
      {activeView === 'dogparks' && parks.length > 0 && (
        <MapView parks={parks} type="dogparks" />
      )}
      {activeView === 'facilities' && facilities.length > 0 && (
        <MapView facilities={facilities} type="facilities" />
      )}

      {/* コンテンツ */}
      {activeView === 'dogparks' ? (
        <>
          {parks.length === 0 ? (
            <EmptyState type="dogparks" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {parks.map((park) => (
                <DogParkCard key={park.id} park={park} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <CategoryLegend />
          {facilities.length === 0 ? (
            <EmptyState type="facilities" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {facilities.map((facility) => (
                <FacilityCard 
                  key={facility.id} 
                  facility={facility} 
                  categoryLabel={CATEGORY_LABELS[facility.category_id] || facility.category_id}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
} 
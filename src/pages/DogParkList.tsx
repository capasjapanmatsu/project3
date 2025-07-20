import { useState } from 'react';
import { ErrorState, LoadingState } from '../components/park/LoadingAndErrorStates';
import { ParkListContent } from '../components/park/ParkListContent';
import { ParkListHeader } from '../components/park/ParkListHeader';
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
  
  // カスタムフックを使用してデータ管理（軽量化）
  const { parks, isLoading: parksLoading, error: parksError, fetchParkData } = useParkData();
  const { facilities, facilitiesLoading, error: facilityError, fetchFacilities } = useFacilityData();

  // 現在の状態を判定
  const isCurrentlyLoading = activeView === 'dogparks' ? parksLoading : facilitiesLoading;
  const currentError = activeView === 'dogparks' ? parksError : facilityError;

  // 手動更新処理
  const handleManualUpdate = () => {
    if (activeView === 'dogparks') {
      fetchParkData();
    } else {
      fetchFacilities();
    }
  };

  // ローディング状態
  if (isCurrentlyLoading) {
    return <LoadingState />;
  }

  // エラー状態
  if (currentError) {
    return <ErrorState error={currentError} onRetry={handleManualUpdate} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <ParkListHeader activeView={activeView} onRefresh={handleManualUpdate} />

      {/* ビュー切り替えタブ - 簡素化 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-4">
            <button
              onClick={() => setActiveView('dogparks')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeView === 'dogparks'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ドッグパーク
            </button>
            <button
              onClick={() => setActiveView('facilities')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeView === 'facilities'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ペット施設
            </button>
          </div>
        </div>
      </div>

      {/* カテゴリ凡例（施設ビューの場合） */}
      {activeView === 'facilities' && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <span key={key} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <ParkListContent 
        activeView={activeView}
        parks={parks}
        facilities={facilities}
      />
    </div>
  );
} 
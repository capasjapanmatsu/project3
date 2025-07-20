import { useEffect, useState } from 'react';
import { ErrorState, LoadingState } from '../components/park/LoadingAndErrorStates';
import { ParkListContent } from '../components/park/ParkListContent';
import { ParkListHeader } from '../components/park/ParkListHeader';
import useAuth from '../context/AuthContext';
import { useFacilityData, useParkData } from '../hooks/useParkData';
import { supabase } from '../utils/supabase';

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
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  const { user, isAuthenticated } = useAuth();
  
  // カスタムフックを使用してデータ管理（軽量化）
  const { parks, isLoading: parksLoading, error: parksError, fetchParkData } = useParkData();
  const { facilities, facilitiesLoading, error: facilityError, fetchFacilities } = useFacilityData();

  // デバッグ情報取得
  const fetchDebugInfo = async () => {
    try {
      // 認証状態確認
      const { data: { session } } = await supabase.auth.getSession();
      
      // テーブル存在確認（管理者権限なしで実行可能な簡単なクエリ）
      const { data: countData, error: countError } = await supabase
        .from('dog_parks')
        .select('*', { count: 'exact', head: true });

      setDebugInfo({
                 user: user ? { 
           id: user.id, 
           email: user.email
         } : null,
        isAuthenticated,
        session: session ? 'あり' : 'なし',
        tableAccess: countError ? `エラー: ${countError.message}` : `テーブルアクセス可能`,
        parkCount: countData ? 'カウント取得成功' : 'カウント取得失敗',
        timestamp: new Date().toLocaleString()
      });
    } catch (err) {
      setDebugInfo({
        error: err instanceof Error ? err.message : '不明なエラー',
        timestamp: new Date().toLocaleString()
      });
    }
  };

  // 初回データ取得
  useEffect(() => {
    const loadData = async () => {
      if (activeView === 'dogparks') {
        await fetchParkData();
      } else {
        await fetchFacilities();
      }
    };
    
    void loadData();
  }, [activeView, fetchParkData, fetchFacilities]);

  // 現在の状態を判定
  const isCurrentlyLoading = activeView === 'dogparks' ? parksLoading : facilitiesLoading;
  const currentError = activeView === 'dogparks' ? parksError : facilityError;

  // 手動更新処理
  const handleManualUpdate = () => {
    const updateData = async () => {
      if (activeView === 'dogparks') {
        await fetchParkData();
      } else {
        await fetchFacilities();
      }
    };
    
    void updateData();
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

      {/* デバッグボタン（開発環境のみ） */}
      {import.meta.env.DEV && (
        <div className="bg-yellow-100 border-b p-4">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={() => {
                setShowDebug(!showDebug);
                if (!showDebug) {
                  void fetchDebugInfo();
                }
              }}
              className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
            >
              {showDebug ? 'デバッグ情報を非表示' : 'デバッグ情報を表示'}
            </button>
            {showDebug && debugInfo && (
              <div className="mt-4 bg-white p-4 rounded border text-sm">
                <h3 className="font-bold mb-2">デバッグ情報</h3>
                <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
                <div className="mt-2">
                  <p><strong>ドッグパーク数:</strong> {parks.length}</p>
                  <p><strong>施設数:</strong> {facilities.length}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

import { useEffect, useMemo, useState } from 'react';
import { DogParkCard } from '../components/park/DogParkCard';
import { EmptyState } from '../components/park/EmptyState';
import { FacilityCard } from '../components/park/FacilityCard';
import { ErrorState, LoadingState } from '../components/park/LoadingAndErrorStates';
import { MapView } from '../components/park/MapView';
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
  'pet_accommodation': 'ペット同伴宿泊',
  'dog_training': 'しつけ教室',
  'pet_friendly_other': 'その他ワンちゃん同伴可能施設'
};

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

// カテゴリアイコン取得関数
const getCategoryIcon = (categoryId: string): string => {
  const icons: { [key: string]: string } = {
    'pet_hotel': '🏨',
    'pet_salon': '✂️',
    'veterinary': '🏥',
    'pet_cafe': '☕',
    'pet_restaurant': '🍽️',
    'pet_shop': '🛍️',
    'pet_accommodation': '🏠',
    'dog_training': '🎓',
    'pet_friendly_other': '🌟'
  };
  return icons[categoryId] || '🏢';
};

export function DogParkList() {
  const [activeView, setActiveView] = useState<'dogparks' | 'facilities'>('dogparks');
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(Object.keys(CATEGORY_LABELS));
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  
  const { user, isAuthenticated } = useAuth();
  
  // データ管理
  const { parks, isLoading: parksLoading, error: parksError, fetchParkData } = useParkData();
  const { facilities, facilitiesLoading, error: facilityError, fetchFacilities } = useFacilityData();

  // 🚀 最適化された位置情報取得（非同期）
  useEffect(() => {
    const getUserLocation = async () => {
      if (!navigator.geolocation) return;
      
      try {
        // 非同期で位置情報を取得（UIをブロックしない）
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 600000
          });
        });

        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
      } catch (error) {
        // 位置情報取得失敗は警告レベル（アプリは正常動作）
        console.warn('位置情報の取得に失敗しました:', error);
      }
    };

    // 位置情報取得を非同期で実行
    void getUserLocation();
  }, []);

  // 🚀 最適化されたデータ取得（初回のみ最小限実行）
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (activeView === 'dogparks') {
          await fetchParkData();
        } else {
          await fetchFacilities();
        }
      } catch (error) {
        console.error('❌ データ取得エラー:', error);
      }
    };
    
    void loadInitialData();
  }, [activeView, fetchParkData, fetchFacilities]);

  // ドッグパークを距離順でソート
  const sortedParks = useMemo(() => {
    if (!userLocation || parks.length === 0) {
      return parks;
    }

    return [...parks].sort((a, b) => {
      const distanceA = calculateDistance(
        userLocation.lat, 
        userLocation.lng, 
        Number(a.latitude) || 0, 
        Number(a.longitude) || 0
      );
      const distanceB = calculateDistance(
        userLocation.lat, 
        userLocation.lng, 
        Number(b.latitude) || 0, 
        Number(b.longitude) || 0
      );
      return distanceA - distanceB;
    });
  }, [parks, userLocation]);

  // カテゴリフィルター機能（一時的に全施設表示）
  const filteredFacilities = useMemo(() => {
    // デバッグ用ログ
    console.log('🏢 All facilities:', facilities);
    console.log('📋 Selected categories:', selectedCategories);
    
    // 一時的に全ての施設を表示（カテゴリーフィルター無効化）
    let filtered = facilities; // 全施設を表示
    
    // 各施設のカテゴリー情報をログ出力
    facilities.forEach(facility => {
      console.log(`施設: ${facility.name}, カテゴリー: ${facility.category}, カテゴリー名: ${facility.category_name}`);
    });

    // 距離順でソート（位置情報がある場合）
    if (userLocation && filtered.length > 0) {
      filtered = filtered.sort((a, b) => {
        const distanceA = calculateDistance(
          userLocation.lat, 
          userLocation.lng, 
          a.latitude || 0, 
          a.longitude || 0
        );
        const distanceB = calculateDistance(
          userLocation.lat, 
          userLocation.lng, 
          b.latitude || 0, 
          b.longitude || 0
        );
        return distanceA - distanceB;
      });
    }

    console.log('🎯 Filtered facilities:', filtered);
    return filtered;
  }, [facilities, selectedCategories, userLocation]);

  // カテゴリ選択の処理
  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // 全選択/全解除の処理
  const handleSelectAll = () => {
    setSelectedCategories(Object.keys(CATEGORY_LABELS));
  };

  const handleDeselectAll = () => {
    setSelectedCategories([]);
  };

  // デバッグ情報取得
  const fetchDebugInfo = async () => {
    try {
      // 認証状態確認
      const { data: { session } } = await supabase.auth.getSession();
      
      // テーブル存在確認
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
    return (
      <div className="min-h-screen bg-gray-50">
        {/* デバッグ情報（ローディング中でも表示） */}
        {import.meta.env.DEV && (
          <div className="bg-yellow-100 border-b p-4">
            <div className="max-w-7xl mx-auto">
              <div className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-3 rounded mb-4">
                <strong>デバッグ情報（ローディング中）:</strong>
                <div className="mt-2 text-sm">
                  <p>現在のビュー: {activeView}</p>
                  <p>ドッグランローディング: {parksLoading ? '読み込み中...' : '完了'}</p>
                  <p>施設ローディング: {facilitiesLoading ? '読み込み中...' : '完了'}</p>
                  <p>ドッグラン数: {parks.length}</p>
                  <p>施設数: {facilities.length}</p>
                  <p>ドッグランエラー: {parksError || 'なし'}</p>
                  <p>施設エラー: {facilityError || 'なし'}</p>
                  <p>現在のローディング状態: {isCurrentlyLoading ? '読み込み中' : '完了'}</p>
                  <p>現在のエラー: {currentError || 'なし'}</p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  console.log('ローディング中に手動データ再取得を開始');
                  handleManualUpdate();
                }}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm mr-2"
              >
                データを再取得
              </button>
              
              <button
                onClick={() => {
                  console.log('ローディング中に強制リセット');
                  void fetchParkData();
                }}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm mr-2"
              >
                強制リセット
              </button>
              
              <button
                onClick={() => {
                  console.log('強制的にローディング状態を解除');
                  // ページをリロードしてローディング状態をクリア
                  window.location.reload();
                }}
                className="bg-purple-500 text-white px-3 py-1 rounded text-sm"
              >
                ページ再読み込み
              </button>
            </div>
          </div>
        )}
        
        <LoadingState />
      </div>
    );
  }

  // エラー状態
  if (currentError) {
    return <ErrorState error={currentError} onRetry={handleManualUpdate} />;
  }

  // データが空の場合
  if (activeView === 'dogparks' && parks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EmptyState
          title="ドッグランが見つかりません"
          description="まだドッグランのデータが登録されていません。"
        />
      </div>
    );
  }

  if (activeView === 'facilities' && facilities.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EmptyState
          title="施設が見つかりません"
          description="まだ施設のデータが登録されていません。"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">ドッグパーク一覧</h1>
            <p className="mt-2 text-gray-600">お近くのドッグランを見つけましょう</p>
          </div>
        </div>
      </div>

      {/* デバッグボタン（開発環境のみ） */}
      {import.meta.env.DEV && (
        <div className="bg-yellow-100 border-b p-4">
          <div className="max-w-7xl mx-auto">
            {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
                <strong>警告:</strong> Google Maps API キーが設定されていません。地図機能が正常に動作しない可能性があります。
              </div>
            )}
            
            {/* 常にローディング状態を表示 */}
            <div className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-3 rounded mb-4">
              <strong>デバッグ情報:</strong>
              <div className="mt-2 text-sm">
                <p>現在のビュー: {activeView}</p>
                <p>ドッグランローディング: {parksLoading ? '読み込み中...' : '完了'}</p>
                <p>施設ローディング: {facilitiesLoading ? '読み込み中...' : '完了'}</p>
                <p>ドッグラン数: {parks.length}</p>
                <p>施設数: {facilities.length}</p>
                <p>ドッグランエラー: {parksError || 'なし'}</p>
                <p>施設エラー: {facilityError || 'なし'}</p>
                <p>現在のローディング状態: {isCurrentlyLoading ? '読み込み中' : '完了'}</p>
                <p>現在のエラー: {currentError || 'なし'}</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowDebug(!showDebug);
                if (!showDebug) {
                  void fetchDebugInfo();
                }
              }}
              className="bg-yellow-500 text-white px-3 py-1 rounded text-sm mr-2"
            >
              {showDebug ? 'デバッグ情報を非表示' : 'デバッグ情報を表示'}
            </button>
            
            <button
              onClick={() => {
                console.log('手動データ再取得を開始');
                handleManualUpdate();
              }}
              className="bg-green-500 text-white px-3 py-1 rounded text-sm mr-2"
            >
              データを再取得
            </button>
            
            <button
              onClick={() => {
                console.log('強制的にローディング状態をリセット');
                if (activeView === 'dogparks') {
                  void fetchParkData();
                } else {
                  void fetchFacilities();
                }
              }}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              強制リセット
            </button>
            
            {showDebug && debugInfo && (
              <div className="mt-4 bg-white p-4 rounded border text-sm">
                <h3 className="font-bold mb-2">デバッグ情報</h3>
                <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
                <div className="mt-2">
                  <p><strong>ドッグラン数:</strong> {parks.length}</p>
                  <p><strong>施設数:</strong> {facilities.length}</p>
                  <p><strong>Google Maps API:</strong> {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? '設定済み' : '未設定'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* タブ風ボタン */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center py-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView('dogparks')}
                className={`px-6 py-3 rounded-md font-medium transition-all ${
                  activeView === 'dogparks'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                🐕 ドッグラン
              </button>
              <button
                onClick={() => setActiveView('facilities')}
                className={`px-6 py-3 rounded-md font-medium transition-all ${
                  activeView === 'facilities'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                🏢 ワンちゃんと行ける施設
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* カテゴリフィルター（施設表示時のみ） */}
        {activeView === 'facilities' && (
          <div className="mb-4 bg-white rounded-lg shadow-sm border">
            {/* フィルターヘッダー（クリックで開閉） */}
            <button
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              className="w-full px-3 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">🏢 カテゴリフィルター</span>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                  {selectedCategories.length} / {Object.keys(CATEGORY_LABELS).length}
                </span>
                {userLocation && (
                  <span className="text-xs text-green-600">📍 距離順</span>
                )}
              </div>
              <span className={`text-gray-400 transition-transform ${showCategoryFilter ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {/* フィルター内容（折りたたみ可能） */}
            {showCategoryFilter && (
              <div className="px-3 pb-3 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2 mb-3 pt-3">
                  <button
                    onClick={handleSelectAll}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    全選択
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    全解除
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORY_LABELS).map(([categoryId, categoryName]) => (
                    <button
                      key={categoryId}
                      onClick={() => handleCategoryToggle(categoryId)}
                      className={`px-3 py-2 text-sm rounded-full border transition-all ${
                        selectedCategories.includes(categoryId)
                          ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {getCategoryIcon(categoryId)} {categoryName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Google Map */}
        <div className="mb-8">
          <MapView 
            parks={sortedParks}
            facilities={activeView === 'facilities' ? filteredFacilities : facilities}
            activeView={activeView}
            userLocation={userLocation}
          />
        </div>

        {/* リスト表示 */}
        {activeView === 'dogparks' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">ドッグラン一覧</h2>
            {parks.length === 0 ? (
              <EmptyState
                title="ドッグランが見つかりません"
                description="現在登録されているドッグランがありません。"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedParks.map((park) => {
                  // 現在地からの距離を計算
                  const distance = userLocation && park.latitude && park.longitude
                    ? calculateDistance(
                        userLocation.lat, 
                        userLocation.lng, 
                        Number(park.latitude), 
                        Number(park.longitude)
                      )
                    : undefined;

                  return (
                    <DogParkCard 
                      key={park.id} 
                      park={park} 
                      userLocation={userLocation}
                      {...(distance !== undefined && { distance })}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeView === 'facilities' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">ワンちゃんと行ける施設</h2>

            {filteredFacilities.length === 0 ? (
              <EmptyState
                title="施設が見つかりません"
                description={selectedCategories.length === 0 
                  ? "カテゴリを選択してください。" 
                  : "選択したカテゴリの施設が登録されていません。"}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredFacilities.map((facility) => {
                  // 現在地からの距離を計算
                  const distance = userLocation && facility.latitude && facility.longitude
                    ? calculateDistance(
                        userLocation.lat, 
                        userLocation.lng, 
                        facility.latitude, 
                        facility.longitude
                      )
                    : undefined;

                  return (
                    <FacilityCard 
                      key={facility.id} 
                      facility={facility} 
                      showDistance={!!userLocation}
                      {...(distance !== undefined && { distance })}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

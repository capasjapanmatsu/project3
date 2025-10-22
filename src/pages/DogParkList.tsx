import {
    Bed,
    Building2,
    Coffee,
    GraduationCap,
    Heart,
    Home,
    MapPin,
    Scissors,
    ShoppingBag,
    Star,
    Utensils
} from 'lucide-react';
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
const getCategoryIcon = (categoryId: string): React.ReactNode => {
  const iconClass = "w-4 h-4 text-white";
  const icons: { [key: string]: React.ReactNode } = {
    'pet_hotel': <Bed className={iconClass} />,
    'pet_salon': <Scissors className={iconClass} />,
    'veterinary': <Heart className={iconClass} />,
    'pet_cafe': <Coffee className={iconClass} />,
    'pet_restaurant': <Utensils className={iconClass} />,
    'pet_shop': <ShoppingBag className={iconClass} />,
    'pet_accommodation': <Home className={iconClass} />,
    'dog_training': <GraduationCap className={iconClass} />,
    'pet_friendly_other': <Star className={iconClass} />
  };
  return icons[categoryId] || <Building2 className={iconClass} />;
};

import { useLocation, useNavigate } from 'react-router-dom';

export function DogParkList() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'dogparks' | 'facilities'>('dogparks');
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(Object.keys(CATEGORY_LABELS));
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [facilityStatusFilter, setFacilityStatusFilter] = useState<'all'|'official'|'unverified'>('all');
  
  const { user, isAuthenticated } = useAuth();
  
  // データ管理
  const { parks, isLoading: parksLoading, error: parksError, fetchParkData } = useParkData();
  const { facilities, facilitiesLoading, error: facilityError, fetchFacilities } = useFacilityData();

  const location = useLocation();

  // 初期タブ: クエリ `?view=facilities` が明示された場合のみ「その他施設」タブを初期表示
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if (view === 'facilities') {
      setActiveView('facilities');
    }
    // それ以外はデフォルトのドッグランを維持
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ドッグランを距離順でソート
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

  // カテゴリフィルター機能
  const filteredFacilities = useMemo(() => {
    // すべて選択時はフィルタしない（実質全表示）
    let base = facilities as any[];

    // 公式/未確認フィルタ
    if (facilityStatusFilter === 'official') {
      base = base.filter(f => !f.is_user_submitted);
    } else if (facilityStatusFilter === 'unverified') {
      base = base.filter(f => f.is_user_submitted);
    }

    if (selectedCategories.length === Object.keys(CATEGORY_LABELS).length) return base as any;

    // 表示と同じ日本語カテゴリ名でフィルタ（サムネイルの表記に合わせる）
    const selectedNameSet = new Set(
      selectedCategories.map((code) => CATEGORY_LABELS[code] || code)
    );

    // f.category_name（日本語）を優先。なければ code でも判定
    let filtered = base.filter((f: any) => {
      const nameJa = (f as any).category_name as string | undefined;
      const code = (f as any).category as string | undefined;
      if (nameJa && selectedNameSet.has(nameJa)) return true;
      if (code && selectedCategories.includes(code)) return true;
      return false;
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
    return filtered;
  }, [facilities, selectedCategories, userLocation, facilityStatusFilter]);

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
    return (
      <div className="min-h-screen bg-gray-50">
        <ErrorState 
          title="データの取得に失敗しました"
          description={`${currentError}\n\n以下をお試しください：\n1. ページを再読み込みしてください\n2. しばらく時間をおいてから再度アクセスしてください\n3. 問題が続く場合は管理者にお問い合わせください`}
          onRetry={handleManualUpdate}
        />
        
        {/* デバッグ情報（開発環境） */}
        {import.meta.env.DEV && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
              <h3 className="font-bold mb-2">デバッグ情報（エラー状態）</h3>
              <div className="text-sm space-y-1">
                <p><strong>現在のビュー:</strong> {activeView}</p>
                <p><strong>エラー内容:</strong> {currentError}</p>
                <p><strong>ドッグランデータ:</strong> {parks.length}件</p>
                <p><strong>施設データ:</strong> {facilities.length}件</p>
                <p><strong>ローディング状態:</strong> {isCurrentlyLoading ? '読み込み中' : '完了'}</p>
              </div>
              
              <div className="mt-3 space-x-2">
                <button
                  onClick={handleManualUpdate}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  データを再取得
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                >
                  ページ再読み込み
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // データが空の場合
  if (activeView === 'dogparks' && parks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EmptyState
          title="スマートドッグランが見つかりません"
          description="まだスマートドッグランのデータが登録されていません。"
        />
      </div>
    );
  }

  // 施設が0件でもマップは表示したいので early return はしない

  return (
    <div className="min-h-screen bg-gray-50 pt-3">
      {/* ヘッダー */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">スマートドッグラン一覧</h1>
            <p className="mt-2 text-gray-600">お近くのスマートドッグランを見つけましょう</p>
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

      {/* タブ風ボタン（縦並び + 新タブ: 映えスポット） */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex flex-col gap-3 items-stretch">
              <button
                onClick={() => setActiveView('dogparks')}
                className={`w-full text-left px-6 py-3 rounded-md font-medium transition-all ${
                  activeView === 'dogparks'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <MapPin className="w-4 h-4 mr-2 inline text-current" />
                スマートドッグラン
              </button>
              <button
                onClick={() => setActiveView('facilities')}
                className={`w-full text-left px-6 py-3 rounded-md font-medium transition-all ${
                  activeView === 'facilities'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <MapPin className="w-4 h-4 mr-2 inline text-current" />
                ワンちゃんと行ける施設
              </button>
              {activeView === 'facilities' && (
                <div className="grid grid-cols-1 gap-2 mt-1">
                  <button
                    onClick={() => navigate('/facility-registration?mode=user')}
                    className="w-full px-4 py-2 rounded-md bg-green-100 text-green-800 border border-green-300 hover:bg-green-200"
                  >
                    知ってるお店を登録する
                  </button>
                </div>
              )}
              <button
                onClick={() => navigate('/spots')}
                className="w-full text-left px-6 py-3 rounded-md font-medium transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <MapPin className="w-4 h-4 mr-2 inline text-current" />
                ワンちゃんと行ける映えスポット
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 施設向けの説明文（トップ） */}
        {activeView === 'facilities' && (
          <div className="mb-4 bg-white rounded-lg border p-4 text-sm text-gray-700">
            <p>
              このコーナーでは個人店など有料の施設検索ができるコーナーです。また、ユーザー行きつけのお店やご近所の施設を他のユーザーにも認知してもらえるように掲載する事ができます。
            </p>
            <p className="mt-1">
              お店のオーナーの場合はより詳しいお店の情報等（ホームページ・メニュー・予約管理など）の設定が可能となります。（プレミアム会員）
            </p>
          </div>
        )}
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
                    className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    全選択
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-3 py-1.5 text-xs bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    全解除
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORY_LABELS).map(([categoryId, categoryName]) => (
                    <button
                      key={categoryId}
                      onClick={() => handleCategoryToggle(categoryId)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border transition-all ${
                        selectedCategories.includes(categoryId)
                          ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded ${
                        selectedCategories.includes(categoryId)
                          ? 'bg-blue-600'
                          : 'bg-gray-400'
                      }`}>
                        {getCategoryIcon(categoryId)}
                      </span>
                      {categoryName}
                    </button>
                  ))}
                </div>

                {/* 公式/未確認フィルタ */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-gray-600">表示:</span>
                  <button
                    onClick={()=>setFacilityStatusFilter('all')}
                    className={`px-3 py-1 rounded border ${facilityStatusFilter==='all'?'bg-gray-800 text-white border-gray-800':'bg-white text-gray-700 border-gray-300'}`}
                  >すべて</button>
                  <button
                    onClick={()=>setFacilityStatusFilter('official')}
                    className={`px-3 py-1 rounded border ${facilityStatusFilter==='official'?'bg-blue-700 text-white border-blue-700':'bg-white text-gray-700 border-gray-300'}`}
                  >公式</button>
                  <button
                    onClick={()=>setFacilityStatusFilter('unverified')}
                    className={`px-3 py-1 rounded border ${facilityStatusFilter==='unverified'?'bg-gray-600 text-white border-gray-600':'bg-white text-gray-700 border-gray-300'}`}
                  >未確認</button>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">スマートドッグラン一覧</h2>
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

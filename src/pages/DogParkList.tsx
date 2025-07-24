import { useEffect, useState } from 'react';
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
  'pet_accommodation': 'ペット同伴宿泊'
};

export function DogParkList() {
  const [activeView, setActiveView] = useState<'dogparks' | 'facilities'>('dogparks');
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  const { user, isAuthenticated } = useAuth();
  
  // データ管理
  const { parks, isLoading: parksLoading, error: parksError, fetchParkData } = useParkData();
  const { facilities, facilitiesLoading, error: facilityError, fetchFacilities } = useFacilityData();

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

  // 初回データ取得
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log(`🔄 データ取得開始: ${activeView}`);
        
        if (activeView === 'dogparks') {
          console.log('📍 ドッグランデータを取得中...');
          await fetchParkData();
          console.log(`✅ ドッグランデータ取得完了: ${parks.length}件`);
        } else {
          console.log('🏢 施設データを取得中...');
          await fetchFacilities();
          console.log(`✅ 施設データ取得完了: ${facilities.length}件`);
        }
        console.log('🎉 データ取得処理完了');
      } catch (error) {
        console.error('❌ データ取得エラー:', error);
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
        {/* Google Map */}
        <div className="mb-8">
          <MapView 
            parks={parks}
            facilities={facilities}
            activeView={activeView}
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
                {parks.map((park) => (
                  <DogParkCard key={park.id} park={park} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'facilities' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">ワンちゃんと行ける施設</h2>
            {facilities.length === 0 ? (
              <EmptyState
                title="施設が見つかりません"
                description="現在登録されている施設がありません。"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {facilities.map((facility) => (
                  <FacilityCard key={facility.id} facility={facility} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

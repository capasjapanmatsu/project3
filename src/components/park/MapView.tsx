// MapView.tsx - シンプルなマップ表示コンポーネント
import { MapPin, Navigation } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import useAuth from '../../context/AuthContext';
import { type DogPark } from '../../types';
import { type PetFacility } from '../../types/facilities';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';

// Google Maps API の簡単な型定義
declare global {
  interface Window {
    google: any;
  }
}

// 犬のデータ型
interface Dog {
  id: string;
  name: string;
  image_url?: string;
}

interface MapViewProps {
  parks?: DogPark[];
  facilities?: PetFacility[];
  activeView?: 'dogparks' | 'facilities';
  onLocationSelect?: (location: { lat: number; lng: number }) => void;
  center?: { lat: number; lng: number };
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
}

// デフォルトの中心位置（東京駅）
const DEFAULT_CENTER = { lat: 35.6762, lng: 139.6503 };

export function MapView({ 
  parks = [], 
  facilities = [], 
  activeView = 'dogparks',
  onLocationSelect, 
  center,
  userLocation,
  className = '' 
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(userLocation || null);
  const [mapError, setMapError] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  
  // 認証とユーザーの犬データ
  const { user } = useAuth();
  const [userDogs, setUserDogs] = useState<Dog[]>([]);
  const [userDogIcon, setUserDogIcon] = useState<string>('');

  // デフォルトの犬アイコン（SVG）
  const defaultDogIcon = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="15" fill="#EF4444" stroke="white" stroke-width="2"/>
      <path d="M10 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm8 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM8 18c0-2.2 3.6-4 8-4s8 1.8 8 4c0 1.1-3.6 2-8 2s-8-.9-8-2z" fill="white"/>
      <path d="M14 16h4v2h-4z" fill="#EF4444"/>
    </svg>
  `;

  // ユーザーの犬データを取得
  useEffect(() => {
    const fetchUserDogs = async () => {
      if (!user) return;
      
      try {
        const { data: dogs, error } = await supabase
          .from('dogs')
          .select('id, name, image_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        if (dogs && dogs.length > 0) {
          setUserDogs(dogs);
          // 1頭目の犬の画像を使用
          const firstDog = dogs[0];
          if (firstDog.image_url) {
            setUserDogIcon(firstDog.image_url);
          } else {
            setUserDogIcon('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(defaultDogIcon));
          }
        } else {
          // 犬が未登録の場合はデフォルトアイコン
          setUserDogIcon('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(defaultDogIcon));
        }
      } catch (error) {
        console.error('Error fetching user dogs:', error);
        setUserDogIcon('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(defaultDogIcon));
      }
    };

    fetchUserDogs();
  }, [user]);

  // 犬の画像を円形マーカー用に変換
  const createDogMarkerIcon = (imageUrl: string): string => {
    if (imageUrl.startsWith('data:image/svg+xml')) {
      return imageUrl; // SVGの場合はそのまま使用
    }
    
    // 犬の画像を円形にトリミングしたSVGを生成
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="clip">
            <circle cx="20" cy="20" r="18"/>
          </clipPath>
        </defs>
        <circle cx="20" cy="20" r="19" fill="white" stroke="#EF4444" stroke-width="2"/>
        <image href="${imageUrl}" x="2" y="2" width="36" height="36" clip-path="url(#clip)" preserveAspectRatio="xMidYMid slice"/>
        <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(239, 68, 68, 0.8)" stroke-width="3"/>
      </svg>
    `)}`;
  };

  // マップの中心位置を決定（現在地 > 指定されたcenter > デフォルト）
  const mapCenter = currentLocation || center || DEFAULT_CENTER;

  // 現在地を自動取得
  useEffect(() => {
    if (!currentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          // 親コンポーネントに位置情報を通知
          if (onLocationSelect) {
            onLocationSelect(location);
          }
        },
        (error) => {
          console.warn('位置情報の取得に失敗:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000
        }
      );
    }
  }, [currentLocation, onLocationSelect]);

  // 現在地を手動取得
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          // 親コンポーネントに位置情報を通知
          if (onLocationSelect) {
            onLocationSelect(location);
          }
        },
        (error) => {
          console.warn('位置情報の取得に失敗:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000
        }
      );
    }
  }, [onLocationSelect]);

  // Google Maps の初期化
  useEffect(() => {
    const initializeMap = () => {
      if (mapRef.current && window.google?.maps) {
        const map = new window.google.maps.Map(mapRef.current, {
          center: mapCenter,
          zoom: currentLocation ? 15 : 13, // 現在地がある場合はズームを大きく
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        // マーカーを追加
        addMarkers(map);
        setIsLoaded(true);
      }
    };

    // GoogleMapsProviderが読み込み完了したら地図を初期化
    initializeMap();
  }, [parks, facilities, activeView, center, currentLocation, mapCenter, userDogIcon, userDogs]);

  // Google Maps API キーが設定されていない場合のフォールバック
  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API キーが設定されていません');
    return (
      <Card className="p-6 text-center">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">マップは現在利用できません</h3>
        <p className="text-gray-600 text-sm mb-4">
          Google Maps API キーが設定されていないため、マップ機能を使用できません
        </p>
        <div className="text-xs text-gray-500">
          <p>ドッグパーク: {parks.length}件</p>
          <p>ペット施設: {facilities.length}件</p>
        </div>
      </Card>
    );
  }

  const currentData = activeView === 'dogparks' ? parks : facilities;
  const currentCount = currentData.length;

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* ヘッダー */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-semibold">
              {activeView === 'dogparks' ? 'ドッグパーク' : 'ペット施設'}マップ
            </h3>
          </div>
          <span className="text-sm text-gray-500">
            {currentCount}件
          </span>
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center space-x-4 text-xs">
            {activeView === 'dogparks' && (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                <span>ドッグパーク</span>
              </div>
            )}
            {activeView === 'facilities' && (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                <span>ペット施設</span>
              </div>
            )}
            {currentLocation && (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span>現在地</span>
              </div>
            )}
          </div>
          
          <Button
            size="sm"
            variant="secondary"
            onClick={getCurrentLocation}
            className="text-xs"
          >
            <Navigation className="w-3 h-3 mr-1" />
            現在地
          </Button>
        </div>
      </div>

      {/* マップ */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-96"
          style={{ minHeight: '400px' }}
        />
        
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">マップを読み込み中...</p>
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 text-center">
        マーカーをクリックすると詳細情報が表示されます
      </div>
    </Card>
  );
}

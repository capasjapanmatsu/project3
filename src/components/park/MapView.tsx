// MapView.tsx - シンプルなマップ表示コンポーネント
import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type DogPark } from '../../types';
import { type PetFacility } from '../../types/facilities';
import Button from '../Button';
import Card from '../Card';

// Google Maps API の簡単な型定義
declare global {
  interface Window {
    google: any;
  }
}

interface MapViewProps {
  parks?: DogPark[];
  facilities?: PetFacility[];
  activeView?: 'dogparks' | 'facilities';
  onLocationSelect?: (location: { lat: number; lng: number }) => void;
  center?: { lat: number; lng: number };
  className?: string;
}

// デフォルトの中心位置（東京駅）
const DEFAULT_CENTER = { lat: 35.6762, lng: 139.6503 };

export function MapView({ 
  parks = [], 
  facilities = [], 
  activeView = 'dogparks',
  onLocationSelect, 
  center = DEFAULT_CENTER,
  className = '' 
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 現在地を取得
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
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
  }, []);

  // Google Maps の初期化
  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        // Google Maps API がまだ読み込まれていない場合
        if (!window.google) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
          script.async = true;
          script.defer = true;
          
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Google Maps API の読み込みに失敗しました'));
            document.head.appendChild(script);
          });
        }

        if (mapRef.current && window.google) {
          const map = new window.google.maps.Map(mapRef.current, {
            center,
            zoom: 13,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });

          // マーカーを追加
          addMarkers(map);
          setIsLoaded(true);
        }
      } catch (error) {
        console.warn('Google Maps の初期化に失敗:', error);
        setIsLoaded(false);
      }
    };

    const addMarkers = (map: any) => {
      // ドッグパークのマーカー
      if (activeView === 'dogparks' || activeView === 'facilities') {
        parks.forEach(park => {
          if (park.latitude && park.longitude) {
            const marker = new window.google.maps.Marker({
              position: { lat: Number(park.latitude), lng: Number(park.longitude) },
              map,
              title: park.name,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#3B82F6',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#FFFFFF',
              }
            });

            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 8px; max-width: 200px;">
                  <h3 style="font-weight: bold; margin-bottom: 4px; color: #1F2937;">${park.name}</h3>
                  ${park.address ? `<p style="font-size: 12px; color: #6B7280; margin-bottom: 8px;">${park.address}</p>` : ''}
                  ${park.price ? `<p style="font-size: 12px; color: #6B7280;">料金: ¥${park.price}/時間</p>` : ''}
                </div>
              `
            });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });
          }
        });
      }

      // ペット施設のマーカー
      if (activeView === 'facilities' || activeView === 'dogparks') {
        facilities.forEach(facility => {
          if (facility.latitude && facility.longitude) {
            const marker = new window.google.maps.Marker({
              position: { lat: Number(facility.latitude), lng: Number(facility.longitude) },
              map,
              title: facility.name,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: '#10B981',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#FFFFFF',
              }
            });

            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 8px; max-width: 200px;">
                  <h3 style="font-weight: bold; margin-bottom: 4px; color: #1F2937;">${facility.name}</h3>
                  ${facility.address ? `<p style="font-size: 12px; color: #6B7280; margin-bottom: 8px;">${facility.address}</p>` : ''}
                  ${facility.phone ? `<p style="font-size: 12px; color: #6B7280;">TEL: ${facility.phone}</p>` : ''}
                </div>
              `
            });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });
          }
        });
      }

      // ユーザーの現在地マーカー
      if (userLocation) {
        new window.google.maps.Marker({
          position: userLocation,
          map,
          title: '現在地',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#EF4444',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
          }
        });
      }
    };

    void loadGoogleMaps();
  }, [parks, facilities, activeView, center, userLocation]);

  // Google Maps API キーが設定されていない場合のフォールバック
  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <Card className="p-6 text-center">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">マップ設定が必要です</h3>
        <p className="text-gray-600 text-sm mb-4">
          Google Maps API キーが設定されていません
        </p>
        <Button 
          onClick={() => window.open('https://developers.google.com/maps/documentation/javascript/get-api-key', '_blank')}
          size="sm"
          variant="secondary"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          API キー取得方法
        </Button>
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
            {userLocation && (
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

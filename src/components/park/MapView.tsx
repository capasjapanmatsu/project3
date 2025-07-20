// MapView.tsx - Google Maps表示コンポーネント
import { Loader, Navigation } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type DogPark } from '../../types';
import { type PetFacility } from '../../types/facilities';

interface MapViewProps {
  parks?: DogPark[];
  facilities?: PetFacility[];
  onLocationSelect?: (location: { lat: number; lng: number }) => void;
  center?: { lat: number; lng: number };
  className?: string;
}

// デフォルトの中心位置（東京駅）
const DEFAULT_CENTER = { lat: 35.6762, lng: 139.6503 };

export function MapView({ 
  parks = [], 
  facilities = [], 
  onLocationSelect, 
  center = DEFAULT_CENTER,
  className = '' 
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Google Maps API の初期化
  const initializeMap = useCallback(async () => {
    if (!mapRef.current || !window.google) return;

    try {
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      googleMapRef.current = map;

      // マップクリックイベント
      if (onLocationSelect) {
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            onLocationSelect({
              lat: event.latLng.lat(),
              lng: event.latLng.lng()
            });
          }
        });
      }

      setIsMapLoaded(true);
    } catch (error) {
      console.warn('Google Maps initialization failed:', error);
    }
  }, [center, onLocationSelect]);

  // マーカーの更新
  const updateMarkers = useCallback(() => {
    if (!googleMapRef.current || !isMapLoaded) return;

    // 既存のマーカーをクリア
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // パークのマーカーを追加
    parks.forEach(park => {
      if (park.latitude && park.longitude) {
        const marker = new google.maps.Marker({
          position: { lat: Number(park.latitude), lng: Number(park.longitude) },
          map: googleMapRef.current,
          title: park.name,
          icon: {
            url: '/icons/park-marker.png',
            scaledSize: new google.maps.Size(40, 40),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(20, 40)
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-3 max-w-xs">
              <h3 class="font-semibold text-gray-900 mb-1">${park.name}</h3>
              ${park.address ? `<p class="text-sm text-gray-600 mb-2">${park.address}</p>` : ''}
              ${park.current_occupancy !== undefined && park.max_capacity ? 
                `<p class="text-xs text-gray-500">現在の利用者: ${park.current_occupancy}/${park.max_capacity}名</p>` : 
                ''
              }
              <button onclick="window.location.href='/parks/${park.id}'" 
                      class="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                詳細を見る
              </button>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(googleMapRef.current, marker);
        });

        markersRef.current.push(marker);
      }
    });

    // 施設のマーカーを追加
    facilities.forEach(facility => {
      if (facility.latitude && facility.longitude) {
        const marker = new google.maps.Marker({
          position: { lat: Number(facility.latitude), lng: Number(facility.longitude) },
          map: googleMapRef.current,
          title: facility.name,
          icon: {
            url: '/icons/facility-marker.png',
            scaledSize: new google.maps.Size(35, 35),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(17, 35)
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-3 max-w-xs">
              <h3 class="font-semibold text-gray-900 mb-1">${facility.name}</h3>
              ${facility.address ? `<p class="text-sm text-gray-600 mb-2">${facility.address}</p>` : ''}
              ${facility.phone ? `<p class="text-xs text-gray-500">TEL: ${facility.phone}</p>` : ''}
              <button onclick="window.location.href='/facilities/${facility.id}'" 
                      class="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                詳細を見る
              </button>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(googleMapRef.current, marker);
        });

        markersRef.current.push(marker);
      }
    });
  }, [parks, facilities, isMapLoaded]);

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

          if (googleMapRef.current) {
            googleMapRef.current.setCenter(location);
            googleMapRef.current.setZoom(15);

            // 現在地マーカーを追加
            new google.maps.Marker({
              position: location,
              map: googleMapRef.current,
              title: '現在地',
              icon: {
                url: '/icons/current-location.png',
                scaledSize: new google.maps.Size(20, 20),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(10, 10)
              }
            });
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
  }, []);

  // Google Maps API の読み込み
  useEffect(() => {
    if (window.google) {
      void initializeMap();
    } else {
      // Google Maps API が読み込まれていない場合は、DogParkList.tsx で読み込み済みを待つ
      const checkGoogleMaps = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogleMaps);
          void initializeMap();
        }
      }, 100);

      return () => clearInterval(checkGoogleMaps);
    }
  }, [initializeMap]);

  // マーカーの更新
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  if (!isMapLoaded) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">マップを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {/* 現在地ボタン */}
      <button
        onClick={getCurrentLocation}
        className="absolute bottom-4 right-4 p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
        title="現在地を表示"
      >
        <Navigation className="w-5 h-5 text-gray-600" />
      </button>

      {/* 凡例 */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">マーカー</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-xs text-gray-600">ドッグパーク</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-600">ペット施設</span>
          </div>
          {userLocation && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-600">現在地</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapView;

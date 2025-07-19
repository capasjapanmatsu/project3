import { Loader } from '@googlemaps/js-api-loader';
import { useEffect, useRef, useState } from 'react';
import { PetFacility } from '../../hooks/useParkData';
import type { DogPark } from '../../types';
import Card from '../Card';

interface MapViewProps {
  parks?: DogPark[];
  facilities?: PetFacility[];
  type: 'dogparks' | 'facilities';
}

const CATEGORY_LABELS: { [key: string]: string } = {
  'pet_hotel': 'ペットホテル',
  'pet_salon': 'ペットサロン',
  'veterinary': '動物病院',
  'pet_cafe': 'ペットカフェ',
  'pet_restaurant': 'ペット同伴レストラン',
  'pet_shop': 'ペットショップ',
  'pet_accommodation': 'ペット同伴宿泊'
};

// 数値を安全に変換する関数
const safeNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

export const MapView: React.FC<MapViewProps> = ({ parks = [], facilities = [], type }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapError, setMapError] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    // ユーザーの現在位置を取得
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        // デフォルトの位置（東京駅）
        setUserLocation({ lat: 35.6812, lng: 139.7671 });
      }
    );
  }, []);

  // Google Map初期化
  const initializeMap = async () => {
    if (!mapRef.current || !userLocation) return;

    try {
      setMapError('');
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        setMapError('Google Maps APIキーが設定されていません。環境変数 VITE_GOOGLE_MAPS_API_KEY を設定してください。');
        return;
      }

      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places', 'geometry']
      });

      const google = await loader.load();
      
      const map = new google.maps.Map(mapRef.current, {
        center: userLocation,
        zoom: 12,
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
      setIsMapLoaded(true);

      // マーカーを追加
      if (type === 'dogparks' && parks.length > 0) {
        addParkMarkers(map, google, parks);
      } else if (type === 'facilities' && facilities.length > 0) {
        addFacilityMarkers(map, google, facilities);
      }

    } catch (error) {
      console.error('❌ Map initialization error:', error);
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          setMapError('Google Maps APIキーが無効です。正しいAPIキーを設定してください。');
        } else if (error.message.includes('quota')) {
          setMapError('Google Maps APIの利用制限に達しました。後ほど再試行してください。');
        } else {
          setMapError(`地図の初期化に失敗しました: ${error.message}`);
        }
      } else {
        setMapError('地図の初期化に失敗しました。APIキーまたはネットワーク接続を確認してください。');
      }
    }
  };

  // ドッグランマーカーを追加
  const addParkMarkers = (map: any, google: any, parkData: DogPark[]) => {
    // 既存のマーカーを削除
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    parkData.forEach(park => {
      const lat = safeNumber(park.latitude);
      const lng = safeNumber(park.longitude);
      
      if (!lat || !lng) return;

      // ドッグラン用の青色マーカー
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: park.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="#3B82F6" stroke="#ffffff" stroke-width="2"/>
              <text x="20" y="27" text-anchor="middle" fill="white" font-size="16" font-family="Arial">🐕</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 40)
        }
      });

      // InfoWindow作成
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 250px;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 20px; margin-right: 8px;">🐕</span>
              <h3 style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">${park.name}</h3>
            </div>
            <div style="margin-bottom: 12px;">
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="margin-right: 8px;">📍</span>
                <span style="color: #6b7280; font-size: 14px;">${park.address}</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="margin-right: 8px;">💰</span>
                <span style="color: #6b7280; font-size: 14px;">¥${park.price}/日</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <span style="margin-right: 8px;">👥</span>
                <span style="color: #6b7280; font-size: 14px;">混雑度: ${safeNumber(park.current_occupancy)}/${safeNumber(park.max_capacity)}頭</span>
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <a href="/parks/${park.id}" style="
                background-color: #6b7280; 
                color: white; 
                padding: 6px 12px; 
                border-radius: 6px; 
                text-decoration: none; 
                font-size: 12px;
                font-weight: 500;
              ">詳細を見る</a>
              <a href="/parks/${park.id}/reserve" style="
                background-color: #3b82f6; 
                color: white; 
                padding: 6px 12px; 
                border-radius: 6px; 
                text-decoration: none; 
                font-size: 12px;
                font-weight: 500;
              ">予約する</a>
            </div>
          </div>
        `
      });

      // クリックイベント
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // マーカーが全て表示されるようにズーム調整
    if (markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getPosition());
      });
      map.fitBounds(bounds);
      
      // 最小ズームレベルを設定
      const zoomListener = google.maps.event.addListener(map, 'bounds_changed', () => {
        if (map.getZoom() > 15) {
          map.setZoom(15);
        }
        google.maps.event.removeListener(zoomListener);
      });
    }
  };

  // 施設マーカーを追加
  const addFacilityMarkers = (map: any, google: any, facilityData: PetFacility[]) => {
    // 既存のマーカーを削除
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    facilityData.forEach(facility => {
      const lat = safeNumber(facility.latitude);
      const lng = safeNumber(facility.longitude);
      
      if (!lat || !lng) return;

      // 施設カテゴリ別のアイコン
      const categoryIcons: { [key: string]: string } = {
        'pet_hotel': '🏨',
        'pet_salon': '✂️',
        'veterinary': '🏥',
        'pet_cafe': '☕',
        'pet_restaurant': '🍽️',
        'pet_shop': '🛒',
        'pet_accommodation': '🏠'
      };

      const icon = categoryIcons[facility.category_id] || '🏪';

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: facility.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <rect x="4" y="4" width="32" height="32" fill="#7C3AED" stroke="#ffffff" stroke-width="2" rx="6"/>
              <text x="20" y="27" text-anchor="middle" fill="white" font-size="16" font-family="Arial">${icon}</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 40)
        }
      });

      const categoryLabel = CATEGORY_LABELS[facility.category_id] || facility.category_id;

      // InfoWindow作成
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 250px;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 20px; margin-right: 8px;">${icon}</span>
              <h3 style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">${facility.name}</h3>
            </div>
            <div style="margin-bottom: 12px;">
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="margin-right: 8px;">🏷️</span>
                <span style="color: #7c3aed; font-size: 14px; font-weight: 500;">${categoryLabel}</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="margin-right: 8px;">📍</span>
                <span style="color: #6b7280; font-size: 14px;">${facility.address}</span>
              </div>
              ${facility.phone ? `
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                  <span style="margin-right: 8px;">📞</span>
                  <span style="color: #6b7280; font-size: 14px;">${facility.phone}</span>
                </div>
              ` : ''}
              ${facility.description ? `
                <div style="margin-top: 8px; padding: 6px; background-color: #f3f4f6; border-radius: 4px;">
                  <p style="margin: 0; color: #4b5563; font-size: 13px; line-height: 1.4;">${facility.description}</p>
                </div>
              ` : ''}
            </div>
            <div style="display: flex; gap: 8px;">
              ${facility.website ? `
                <a href="${facility.website}" target="_blank" rel="noopener noreferrer" style="
                  background-color: #6b7280; 
                  color: white; 
                  padding: 6px 12px; 
                  border-radius: 6px; 
                  text-decoration: none; 
                  font-size: 12px;
                  font-weight: 500;
                ">🌐 サイト</a>
              ` : ''}
              ${facility.phone ? `
                <a href="tel:${facility.phone}" style="
                  background-color: #7c3aed; 
                  color: white; 
                  padding: 6px 12px; 
                  border-radius: 6px; 
                  text-decoration: none; 
                  font-size: 12px;
                  font-weight: 500;
                ">📞 電話</a>
              ` : ''}
            </div>
          </div>
        `
      });

      // クリックイベント
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // マーカーが全て表示されるようにズーム調整
    if (markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getPosition());
      });
      map.fitBounds(bounds);
      
      // 最小ズームレベルを設定
      const zoomListener = google.maps.event.addListener(map, 'bounds_changed', () => {
        if (map.getZoom() > 15) {
          map.setZoom(15);
        }
        google.maps.event.removeListener(zoomListener);
      });
    }
  };

  // 位置情報取得後にマップ初期化
  useEffect(() => {
    if (userLocation) {
      initializeMap();
    }
  }, [userLocation]);

  // データ変更時にマーカー更新
  useEffect(() => {
    if (isMapLoaded && googleMapRef.current) {
      if (type === 'dogparks' && parks.length > 0) {
        addParkMarkers(googleMapRef.current, (window as any).google, parks);
      } else if (type === 'facilities' && facilities.length > 0) {
        addFacilityMarkers(googleMapRef.current, (window as any).google, facilities);
      }
    }
  }, [parks, facilities, type, isMapLoaded]);

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {type === 'dogparks' ? 'ドッグラン位置' : '施設位置'}
        </h2>
      </div>
      
      {mapError ? (
        <div className="w-full h-96 rounded-lg border bg-red-50 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="text-red-500 text-4xl mb-4">🗺️</div>
            <p className="text-red-600 font-medium mb-2">地図を表示できません</p>
            <p className="text-red-500 text-sm mb-4">{mapError}</p>
            <div className="bg-red-100 border border-red-300 rounded p-3 text-left text-sm">
              <p className="font-medium mb-2">設定手順：</p>
              <ol className="list-decimal list-inside space-y-1 text-red-600">
                <li>Google Cloud Console でMaps JavaScript API を有効化</li>
                <li>APIキーを作成</li>
                <li>.env.local ファイルに VITE_GOOGLE_MAPS_API_KEY=your_key を追加</li>
                <li>開発サーバーを再起動</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div 
            ref={mapRef}
            className="w-full h-96 rounded-lg border bg-gray-100"
            style={{ minHeight: '400px' }}
          />
          {!isMapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">マップを読み込み中...</p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}; 
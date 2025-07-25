// MapView.tsx - シンプルなマップ表示コンポーネント
import { MapPin, Navigation } from 'lucide-react';
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
    const loadGoogleMaps = async () => {
      try {
        // Google Maps API キーの確認
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.warn('Google Maps API キーが設定されていません');
          return;
        }

        // Google Maps API がまだ読み込まれていない場合
        if (!window.google) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
          script.async = true;
          script.defer = true;
          
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Google Maps API の読み込みに失敗しました'));
            document.head.appendChild(script);
          });
        }

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
      } catch (error) {
        console.error('Google Maps の初期化に失敗:', error);
        setIsLoaded(false);
      }
    };

    const addMarkers = (map: any) => {
      // ドッグパークのマーカー
      if (activeView === 'dogparks' || activeView === 'facilities') {
        if (window.google?.maps && parks.length > 0) {
          // 肉球アイコンのSVGデータを定義（favicon.svgと同じデザイン）
          const pawIconSvg = `
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="url(#paint0_linear)" />
              <path d="M22.4 10.4C22.4 11.7255 21.3255 12.8 20 12.8C18.6745 12.8 17.6 11.7255 17.6 10.4C17.6 9.07452 18.6745 8 20 8C21.3255 8 22.4 9.07452 22.4 10.4Z" fill="white"/>
              <path d="M14.4 10.4C14.4 11.7255 13.3255 12.8 12 12.8C10.6745 12.8 9.6 11.7255 9.6 10.4C9.6 9.07452 10.6745 8 12 8C13.3255 8 14.4 9.07452 14.4 10.4Z" fill="white"/>
              <path d="M22.4 18.4C22.4 19.7255 21.3255 20.8 20 20.8C18.6745 20.8 17.6 19.7255 17.6 18.4C17.6 17.0745 18.6745 16 20 16C21.3255 16 22.4 17.0745 22.4 18.4Z" fill="white"/>
              <path d="M14.4 18.4C14.4 19.7255 13.3255 20.8 12 20.8C10.6745 20.8 9.6 19.7255 9.6 18.4C9.6 17.0745 10.6745 16 12 16C13.3255 16 14.4 17.0745 14.4 18.4Z" fill="white"/>
              <path d="M18.4 14.4C19.7255 14.4 20.8 13.3255 20.8 12C20.8 10.6745 19.7255 9.6 18.4 9.6C17.0745 9.6 16 10.6745 16 12C16 13.3255 17.0745 14.4 18.4 14.4Z" fill="white"/>
              <path d="M18.4 22.4C19.7255 22.4 20.8 21.3255 20.8 20C20.8 18.6745 19.7255 17.6 18.4 17.6C17.0745 17.6 16 18.6745 16 20C16 21.3255 17.0745 22.4 18.4 22.4Z" fill="white"/>
              <path d="M10.4 14.4C11.7255 14.4 12.8 13.3255 12.8 12C12.8 10.6745 11.7255 9.6 10.4 9.6C9.07452 9.6 8 10.6745 8 12C8 13.3255 9.07452 14.4 10.4 14.4Z" fill="white"/>
              <path d="M10.4 22.4C11.7255 22.4 12.8 21.3255 12.8 20C12.8 18.6745 11.7255 17.6 10.4 17.6C9.07452 17.6 8 18.6745 8 20C8 21.3255 9.07452 22.4 10.4 22.4Z" fill="white"/>
              <defs>
                <linearGradient id="paint0_linear" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#3B82F6"/>
                  <stop offset="1" stop-color="#10B981"/>
                </linearGradient>
              </defs>
            </svg>
          `;

          // SVGをData URIに変換
          const pawIconDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pawIconSvg);

          parks.forEach(park => {
            if (park.latitude && park.longitude) {
              const marker = new window.google.maps.Marker({
                position: { lat: Number(park.latitude), lng: Number(park.longitude) },
                map,
                title: park.name,
                icon: {
                  url: pawIconDataUri,
                  scaledSize: new window.google.maps.Size(32, 32),
                  anchor: new window.google.maps.Point(16, 16)
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
      if (currentLocation) {
        // 現在地用の足跡アイコン（赤色）
        const currentLocationPawPath = 'M10,4 C12,4 14,6 14,8 C14,10 12,12 10,12 C8,12 6,10 6,8 C6,6 8,4 10,4 Z ' +
                                      'M6,12 C7,12 8,13 8,14 C8,15 7,16 6,16 C5,16 4,15 4,14 C4,13 5,12 6,12 Z ' +
                                      'M14,12 C15,12 16,13 16,14 C16,15 15,16 14,16 C13,16 12,15 12,14 C12,13 13,12 14,12 Z ' +
                                      'M8,16 C9,16 10,17 10,18 C10,19 9,20 8,20 C7,20 6,19 6,18 C6,17 7,16 8,16 Z ' +
                                      'M12,16 C13,16 14,17 14,18 C14,19 13,20 12,20 C11,20 10,19 10,18 C10,17 11,16 12,16 Z';
        
        new window.google.maps.Marker({
          position: currentLocation,
          map,
          title: '現在地',
          icon: {
            path: currentLocationPawPath,
            scale: 1.8,
            fillColor: '#EF4444',
            fillOpacity: 0.9,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
            anchor: new window.google.maps.Point(10, 20)
          }
        });
      }
    };

    void loadGoogleMaps();
  }, [parks, facilities, activeView, center, currentLocation, mapCenter]);

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

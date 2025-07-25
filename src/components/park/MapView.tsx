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
                  <div style="padding: 12px; max-width: 250px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <h3 style="font-weight: bold; margin-bottom: 8px; color: #1F2937; font-size: 16px;">${park.name}</h3>
                    ${park.address ? `<p style="font-size: 12px; color: #6B7280; margin-bottom: 6px; line-height: 1.4;">${park.address}</p>` : ''}
                    ${park.price ? `<p style="font-size: 12px; color: #6B7280; margin-bottom: 12px;">料金: ¥${park.price}/時間</p>` : ''}
                    <div style="text-align: center; margin-top: 12px;">
                      <a 
                        href="/parks/${park.id}" 
                        target="_blank"
                        style="
                          display: inline-block;
                          background: linear-gradient(135deg, #3B82F6, #10B981);
                          color: white;
                          padding: 8px 16px;
                          border-radius: 6px;
                          text-decoration: none;
                          font-size: 13px;
                          font-weight: 500;
                          transition: all 0.2s;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        "
                        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';"
                      >
                        🐾 詳細を見る
                      </a>
                    </div>
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
                <div style="padding: 12px; max-width: 250px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  <h3 style="font-weight: bold; margin-bottom: 8px; color: #1F2937; font-size: 16px;">${facility.name}</h3>
                  ${facility.address ? `<p style="font-size: 12px; color: #6B7280; margin-bottom: 6px; line-height: 1.4;">${facility.address}</p>` : ''}
                  ${facility.phone ? `<p style="font-size: 12px; color: #6B7280; margin-bottom: 12px;">📞 ${facility.phone}</p>` : ''}
                  <div style="text-align: center; margin-top: 12px;">
                    <a 
                      href="/facilities/${facility.id}" 
                      target="_blank"
                      style="
                        display: inline-block;
                        background: linear-gradient(135deg, #10B981, #3B82F6);
                        color: white;
                        padding: 8px 16px;
                        border-radius: 6px;
                        text-decoration: none;
                        font-size: 13px;
                        font-weight: 500;
                        transition: all 0.2s;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                      "
                      onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';"
                      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';"
                    >
                      🏢 詳細を見る
                    </a>
                  </div>
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
      if (currentLocation && userDogIcon) {
        // 犬のアイコンでユーザー位置を表示
        const markerIcon = createDogMarkerIcon(userDogIcon);
        
        new window.google.maps.Marker({
          position: currentLocation,
          map,
          title: userDogs.length > 0 ? `現在地 (${userDogs[0]?.name || 'あなた'})` : '現在地',
          icon: {
            url: markerIcon,
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20)
          },
          zIndex: 1000 // 他のマーカーより前面に表示
        });
      }
    };

    void loadGoogleMaps();
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

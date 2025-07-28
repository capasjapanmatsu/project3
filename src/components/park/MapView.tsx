/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { MapPin, Navigation } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../context/AuthContext';
import { type DogPark } from '../../types';
import { type PetFacility } from '../../types/facilities';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';
import { useGoogleMaps } from '../GoogleMapsProvider';

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
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(userLocation || null);
  const [mapError, setMapError] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  const [infoWindow, setInfoWindow] = useState<any>(null);
  
  // GoogleMapsProviderから状態を取得
  const { isLoaded: isGoogleMapsLoaded, isLoading: isGoogleMapsLoading, error: googleMapsError } = useGoogleMaps();
  
  // 認証とユーザーの犬データ
  const { user } = useAuth();
  const [userDogs, setUserDogs] = useState<Dog[]>([]);
  
  // ナビゲーション
  const navigate = useNavigate();

  // マップの中心位置を決定
  const mapCenter = center || currentLocation || DEFAULT_CENTER;

  // デフォルトの犬アイコン（SVG）
  const defaultDogIcon = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="15" fill="#EF4444" stroke="white" stroke-width="2"/>
      <path d="M10 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm8 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM8 18c0-2.2 3.6-4 8-4s8 1.8 8 4c0 1.1-3.6 2-8 2s-8-.9-8-2z" fill="white"/>
      <path d="M14 16h4v2h-4z" fill="#EF4444"/>
    </svg>
  `;

  // 【Phase 3】距離計算機能を追加
  // Haversine公式で2点間の距離を計算
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // 距離を適切な単位で表示する関数
  const formatDistance = useCallback((distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  }, []);

  // 【Phase 3】距離計算付きInfoWindowコンテンツを生成する関数
  const createSimpleInfoWindowContent = useCallback((item: DogPark | PetFacility, type: 'park' | 'facility'): string => {
    const itemName = item.name || '名前未設定';
    const detailPath = type === 'park' ? `/parks/${item.id}` : `/facilities/${item.id}`;
    
    // 現在地がある場合は距離を計算
    let distanceText = '';
    if (currentLocation && item.latitude && item.longitude) {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        item.latitude,
        item.longitude
      );
      distanceText = `
        <p style="
          font-size: 12px;
          color: #6b7280;
          margin: 4px 0 8px 0;
          display: flex;
          align-items: center;
        ">
          <span style="margin-right: 4px;">📍</span>
          現在地から ${formatDistance(distance)}
        </p>
      `;
    }
    
    return `
      <div style="
        min-width: 200px;
        max-width: 240px;
        padding: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <h3 style="
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #1f2937;
          line-height: 1.3;
        ">${itemName}</h3>
        
        ${distanceText}
        
        <button
          onclick="window.infoWindowNavigate('${detailPath}')"
          style="
            width: 100%;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
          "
          onmouseover="this.style.background='#2563eb'"
          onmouseout="this.style.background='#3b82f6'"
        >
          詳細を見る
        </button>
      </div>
    `;
  }, [currentLocation, calculateDistance, formatDistance]);

  // 【Phase 2】InfoWindowのナビゲーション用グローバル関数を設定
  useEffect(() => {
    (window as any).infoWindowNavigate = (path: string) => {
      navigate(path);
    };
    
    return () => {
      delete (window as any).infoWindowNavigate;
    };
  }, [navigate]);

  // マーカーを追加する関数
  const addMarkers = useCallback((map: any) => {
    try {
      const windowObj = window as any;
      
      // 【段階的復活】新しいInfoWindowを作成
      const newInfoWindow = new windowObj.google.maps.InfoWindow();
      setInfoWindow(newInfoWindow);
      
      // ドッグパークのマーカーを追加
      if (activeView === 'dogparks' && parks) {
        parks.forEach(park => {
          if (park.latitude && park.longitude) {
            const marker = new windowObj.google.maps.Marker({
              position: { lat: park.latitude, lng: park.longitude },
              map: map,
              title: park.name,
              icon: {
                url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
                  <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="white" stroke-width="2"/>
                    <path d="M12 10h8v2h-8zm0 4h8v2h-8zm0 4h6v2h-6z" fill="white"/>
                  </svg>
                `)}`
              }
            });
            
            // 【段階的復活】シンプルなマーカークリックイベントを追加
            marker.addListener('click', () => {
              const content = createSimpleInfoWindowContent(park, 'park');
              newInfoWindow.setContent(content);
              newInfoWindow.open(map, marker);
            });
          }
        });
      }

      // ペット施設のマーカーを追加
      if (activeView === 'facilities' && facilities) {
        facilities.forEach(facility => {
          if (facility.latitude && facility.longitude) {
            const marker = new windowObj.google.maps.Marker({
              position: { lat: facility.latitude, lng: facility.longitude },
              map: map,
              title: facility.name,
              icon: {
                url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
                  <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="12" fill="#10B981" stroke="white" stroke-width="2"/>
                    <path d="M10 14h12v2h-12zm2-4h8v2h-8zm-2 8h12v2h-12z" fill="white"/>
                  </svg>
                `)}`
              }
            });
            
            // 【段階的復活】シンプルなマーカークリックイベントを追加
            marker.addListener('click', () => {
              const content = createSimpleInfoWindowContent(facility, 'facility');
              newInfoWindow.setContent(content);
              newInfoWindow.open(map, marker);
            });
          }
        });
      }

      // ユーザーの現在地マーカー
      if (currentLocation) {
        new windowObj.google.maps.Marker({
          position: currentLocation,
          map: map,
          title: '現在地',
          icon: {
            url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(defaultDogIcon)}`
          }
        });
      }

    } catch (error) {
      console.error('マーカー追加エラー:', error);
    }
  }, [activeView, parks, facilities, currentLocation, defaultDogIcon, createSimpleInfoWindowContent]);

  // マップを初期化する関数
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !isGoogleMapsLoaded) return;
    
    const windowObj = window as any;
    if (!windowObj.google?.maps) {
      console.warn('Google Maps API未読み込み');
      return;
    }

    try {
      const map = new windowObj.google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: currentLocation ? 15 : 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // マーカーを追加
      addMarkers(map);
      setIsMapInitialized(true);
      setMapError('');
      
    } catch (error) {
      console.error('マップ初期化エラー:', error);
      setMapError('地図の初期化に失敗しました');
    }
  }, [mapCenter, currentLocation, addMarkers, isGoogleMapsLoaded]);

  // Google Maps API読み込み完了後にマップを初期化
  useEffect(() => {
    if (isGoogleMapsLoaded && !googleMapsError) {
      initializeMap();
    } else if (googleMapsError) {
      setMapError(googleMapsError);
    }
  }, [isGoogleMapsLoaded, googleMapsError, initializeMap, parks, facilities, activeView]);

  // 現在地を取得
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMapError('位置情報がサポートされていません');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(location);
        setIsLocating(false);
        // 親コンポーネントに位置情報を通知
        if (onLocationSelect) {
          onLocationSelect(location);
        }
      },
      (error) => {
        console.warn('位置情報の取得に失敗:', error);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000
      }
    );
  }, [onLocationSelect]);

  // 初回読み込み時に自動的に現在地を取得
  useEffect(() => {
    // userLocationが既に設定されている場合や、現在地が既に取得済みの場合はスキップ
    if (userLocation || currentLocation) return;
    
    // 位置情報がサポートされていない場合はスキップ
    if (!navigator.geolocation) return;

    console.log('初回読み込み: 現在地を自動取得中...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('現在地取得成功:', location);
        setCurrentLocation(location);
        // 親コンポーネントに位置情報を通知
        if (onLocationSelect) {
          onLocationSelect(location);
        }
      },
      (error) => {
        console.warn('初回現在地取得に失敗（デフォルト位置を使用）:', error);
        // エラーの場合はデフォルトの東京中心を使用（何もしない）
      },
      {
        enableHighAccuracy: false, // 初回は精度より速度を優先
        timeout: 8000,
        maximumAge: 300000 // 5分間キャッシュ
      }
    );
  }, [userLocation, currentLocation, onLocationSelect]);

  // ユーザーの犬データを取得（簡略化）
  useEffect(() => {
    const fetchUserDogs = async () => {
      if (!user) return;
      
      try {
        const { data: dogs, error } = await supabase
          .from('dogs')
          .select('id, name, image_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (!error && dogs && dogs.length > 0) {
          setUserDogs(dogs);
        }
        
      } catch (error) {
        console.error('Error fetching user dogs:', error);
      }
    };

    void fetchUserDogs();
  }, [user]);

  // Google Maps APIが利用できない場合の表示
  if (googleMapsError) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <MapPin className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">マップ機能は現在利用できません</h3>
        <p className="text-gray-600 text-sm mb-4">{googleMapsError}</p>
        <div className="text-xs text-gray-500">
          <p>{activeView === 'dogparks' ? 'ドッグラン' : 'ペット施設'}: {activeView === 'dogparks' ? parks.length : facilities.length}件</p>
        </div>
      </Card>
    );
  }

  // マップエラーが発生した場合の表示
  if (mapError && mapError !== googleMapsError) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <MapPin className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">マップを読み込めませんでした</h3>
        <p className="text-gray-600 text-sm mb-4">{mapError}</p>
        <Button onClick={() => {
          setMapError('');
          initializeMap();
        }}>
          再読み込み
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
              {activeView === 'dogparks' ? 'ドッグラン' : 'ペット施設'}マップ
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
                <span>ドッグラン</span>
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
            disabled={isLocating}
          >
            <Navigation className="w-3 h-3 mr-1" />
            {isLocating ? '取得中...' : '現在地'}
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
        
        {(isGoogleMapsLoading || !isMapInitialized) && !googleMapsError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">
                {isGoogleMapsLoading ? 'Google Maps APIを読み込み中...' : 'マップを初期化中...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 text-center">
        {googleMapsError ? 'マップ機能は現在利用できません' : 'マーカーをクリックすると詳細情報が表示されます'}
      </div>
    </Card>
  );
}

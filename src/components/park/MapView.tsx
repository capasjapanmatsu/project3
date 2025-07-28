/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
  const [isLoadingAPI, setIsLoadingAPI] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(userLocation || null);
  const [mapError, setMapError] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  
  // 認証とユーザーの犬データ
  const { user } = useAuth();
  const [userDogs, setUserDogs] = useState<Dog[]>([]);
  const [userDogIcon, setUserDogIcon] = useState<string>('');

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

  // Google Maps API を動的に読み込む
  const loadGoogleMapsAPI = useCallback(async () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
    
    if (!apiKey) {
      setMapError('Google Maps API キーが設定されていません');
      setIsLoadingAPI(false);
      return;
    }

    // すでに読み込み済みの場合
    const windowObj = window as any;
    if (windowObj.google?.maps) {
      setIsLoadingAPI(false);
      return;
    }

    // 読み込み中の場合は待機
    if (windowObj._googleMapsLoading) {
      const checkInterval = setInterval(() => {
        if (windowObj.google?.maps) {
          clearInterval(checkInterval);
          setIsLoadingAPI(false);
        }
      }, 100);
      return;
    }

    try {
      windowObj._googleMapsLoading = true;
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      await new Promise<void>((resolve, reject) => {
        script.onload = () => {
          windowObj._googleMapsLoading = false;
          if (windowObj.google?.maps) {
            console.log('Google Maps API 読み込み完了');
            resolve();
          } else {
            reject(new Error('Google Maps API読み込み後にAPIが利用できません'));
          }
        };

        script.onerror = () => {
          windowObj._googleMapsLoading = false;
          reject(new Error('Google Maps APIの読み込みに失敗しました'));
        };

        document.head.appendChild(script);
      });

    } catch (error) {
      console.error('Google Maps API読み込みエラー:', error);
      setMapError('Google Maps APIの読み込みに失敗しました');
    } finally {
      setIsLoadingAPI(false);
    }
  }, []);

  // マーカーを追加する関数
  const addMarkers = useCallback((map: any) => {
    try {
      const windowObj = window as any;
      
      // ドッグパークのマーカーを追加
      if (activeView === 'dogparks' && parks) {
        parks.forEach(park => {
          if (park.latitude && park.longitude) {
            new windowObj.google.maps.Marker({
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
          }
        });
      }

      // ペット施設のマーカーを追加
      if (activeView === 'facilities' && facilities) {
        facilities.forEach(facility => {
          if (facility.latitude && facility.longitude) {
            new windowObj.google.maps.Marker({
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
  }, [activeView, parks, facilities, currentLocation, defaultDogIcon]);

  // マップを初期化する関数
  const initializeMap = useCallback(() => {
    if (!mapRef.current) return;
    
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
      setIsLoaded(true);
      setMapError('');
      
    } catch (error) {
      console.error('マップ初期化エラー:', error);
      setMapError('地図の初期化に失敗しました');
    }
  }, [mapCenter, currentLocation, addMarkers]);

  // Google Maps API読み込み
  useEffect(() => {
    void loadGoogleMapsAPI();
  }, [loadGoogleMapsAPI]);

  // API読み込み完了後にマップを初期化
  useEffect(() => {
    if (!isLoadingAPI && !mapError) {
      initializeMap();
    }
  }, [isLoadingAPI, mapError, initializeMap, parks, facilities, activeView]);

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

  // ユーザーの犬データを取得（簡略化）
  useEffect(() => {
    const fetchUserDogs = async () => {
      if (!user) {
        setUserDogIcon('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(defaultDogIcon));
        return;
      }
      
      try {
        const { data: dogs, error } = await supabase
          .from('dogs')
          .select('id, name, image_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (!error && dogs && dogs.length > 0) {
          setUserDogs(dogs);
        }
        
        // 常にデフォルトアイコンを使用
        setUserDogIcon('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(defaultDogIcon));
        
      } catch (error) {
        console.error('Error fetching user dogs:', error);
        setUserDogIcon('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(defaultDogIcon));
      }
    };

    void fetchUserDogs();
  }, [user, defaultDogIcon]);

  // エラー状態の表示
  if (mapError) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <MapPin className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">マップを読み込めませんでした</h3>
        <p className="text-gray-600 text-sm mb-4">{mapError}</p>
        <Button onClick={() => {
          setMapError('');
          setIsLoadingAPI(true);
          void loadGoogleMapsAPI();
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
        
        {(isLoadingAPI || !isLoaded) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">
                {isLoadingAPI ? 'Google Maps APIを読み込み中...' : 'マップを初期化中...'}
              </p>
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

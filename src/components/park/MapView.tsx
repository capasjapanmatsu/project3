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
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(userLocation || null);
  const [mapError, setMapError] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  const [infoWindow, setInfoWindow] = useState<any>(null);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  
  // GoogleMapsProviderから状態を取得
  const { isLoaded, isLoading: isGoogleMapsLoading, error } = useGoogleMaps();
  
  // 認証とユーザーの犬データ
  const { user } = useAuth();
  const [userDogs, setUserDogs] = useState<Dog[]>([]);
  
  // ナビゲーション
  const navigate = useNavigate();

  // マップの中心位置を決定
  const mapCenter = center || currentLocation || DEFAULT_CENTER;

  // ドッグパークアイコン（先がとがったピンデザイン・肉球付き）
  const dogParkIcon = `
    <svg width="40" height="56" viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- ピンの形状（先がとがった） -->
      <path d="M20 0C8.954 0 0 8.954 0 20C0 31.046 20 56 20 56S40 31.046 40 20C40 8.954 31.046 0 20 0Z" fill="url(#dogParkGradient)" stroke="white" stroke-width="2"/>
      <!-- 背景円 -->
      <circle cx="20" cy="20" r="15" fill="white"/>
      <!-- 肉球デザイン -->
      <g transform="translate(20, 20) scale(0.8)">
        <!-- メイン肉球 -->
        <ellipse cx="0" cy="3" rx="6" ry="4" fill="#3B82F6"/>
        <!-- 上の小さな肉球（左上） -->
        <ellipse cx="-4" cy="-5" rx="2.5" ry="3" fill="#3B82F6"/>
        <!-- 上の小さな肉球（右上） -->
        <ellipse cx="4" cy="-5" rx="2.5" ry="3" fill="#3B82F6"/>
        <!-- 上の小さな肉球（中央上） -->
        <ellipse cx="0" cy="-7" rx="2" ry="2.5" fill="#3B82F6"/>
      </g>
      <defs>
        <linearGradient id="dogParkGradient" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop stop-color="#3B82F6"/>
          <stop offset="1" stop-color="#2563EB"/>
        </linearGradient>
      </defs>
    </svg>
  `;

  // ペット施設アイコン（先がとがったピンデザイン・十字マーク）
  const facilityIcon = `
    <svg width="36" height="50" viewBox="0 0 36 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- ピンの形状（先がとがった） -->
      <path d="M18 0C8.059 0 0 8.059 0 18C0 27.941 18 50 18 50S36 27.941 36 18C36 8.059 27.941 0 18 0Z" fill="#22C55E" stroke="white" stroke-width="2"/>
      <!-- 背景円 -->
      <circle cx="18" cy="18" r="13" fill="white"/>
      <!-- 十字マーク -->
      <path d="M16 10h4v6h6v4h-6v6h-4v-6h-6v-4h6z" fill="#22C55E"/>
    </svg>
  `;

  // 現在地アイコン（ポールに丸のピンデザイン）
  const currentLocationIcon = `
    <svg width="24" height="40" viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- ポール部分 -->
      <rect x="11" y="20" width="2" height="20" fill="#DC2626" stroke="white" stroke-width="1"/>
      <!-- 丸い部分 -->
      <circle cx="12" cy="12" r="11" fill="url(#currentLocationGradient)" stroke="white" stroke-width="2"/>
      <!-- 中央の小さな円 -->
      <circle cx="12" cy="12" r="6" fill="white"/>
      <!-- 中央のドット -->
      <circle cx="12" cy="12" r="3" fill="#DC2626"/>
      <defs>
        <linearGradient id="currentLocationGradient" x1="12" y1="1" x2="12" y2="23" gradientUnits="userSpaceOnUse">
          <stop stop-color="#EF4444"/>
          <stop offset="1" stop-color="#DC2626"/>
        </linearGradient>
      </defs>
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

  // 【Phase 4】サムネイル画像付きInfoWindowコンテンツを生成する関数
  const createSimpleInfoWindowContent = useCallback((item: DogPark | PetFacility, type: 'park' | 'facility'): string => {
    const itemName = item.name || '名前未設定';
    const detailPath = type === 'park' ? `/parks/${item.id}` : `/facilities/${item.id}`;
    
    // 画像URLを取得（複数の可能性のあるフィールドから取得）
    let imageUrl = '';
    // プロパティの存在チェックを使用
    if ('main_image_url' in item && item.main_image_url) {
      imageUrl = item.main_image_url;
    } else if ('image_url' in item && item.image_url) {
      imageUrl = item.image_url;
    } else if ('cover_image_url' in item && item.cover_image_url) {
      imageUrl = item.cover_image_url;
    } else if ('thumbnail_url' in item && item.thumbnail_url) {
      imageUrl = item.thumbnail_url;
    }
    
    // サムネイル画像のHTML（画像がある場合のみ表示）
    const thumbnailHtml = imageUrl ? `
      <div style="
        width: 100%;
        height: 80px;
        margin: 0px 0px 2px 0px;
        border-radius: 8px;
        overflow: hidden;
        background: #f3f4f6;
      ">
        <img 
          src="${imageUrl}" 
          alt="${itemName}"
          style="
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 8px;
          "
          onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af;font-size:12px;\\'>画像なし</div>';"
        />
      </div>
    ` : `
      <div style="
        width: 100%;
        height: 50px;
        margin: 0px 0px 2px 0px;
        border-radius: 8px;
        background: #f3f4f6;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        font-size: 12px;
      ">
        ${type === 'park' ? '🐾' : '🏥'} 画像なし
      </div>
    `;
    
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
          margin: 2px 0 2px 0;
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
        min-width: 220px;
        max-width: 260px;
        padding: 0px 12px 12px 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        ${thumbnailHtml}
        
        <h3 style="
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 2px 0;
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
            transition: background 0.2s ease-in-out;
            margin-top: 2px;
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
              position: { lat: park.latitude!, lng: park.longitude! },
              map: map,
              title: park.name,
              icon: {
                url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dogParkIcon)}`,
                scaledSize: new windowObj.google.maps.Size(40, 56),
                anchor: new windowObj.google.maps.Point(20, 56)
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
              position: { lat: facility.latitude!, lng: facility.longitude! },
              map: map,
              title: facility.name,
              icon: {
                url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(facilityIcon)}`,
                scaledSize: new windowObj.google.maps.Size(36, 50),
                anchor: new windowObj.google.maps.Point(18, 50)
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
            url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(currentLocationIcon)}`,
            scaledSize: new windowObj.google.maps.Size(24, 40),
            anchor: new windowObj.google.maps.Point(12, 40)
          }
        });
      }

    } catch (error) {
      console.error('マーカー追加エラー:', error);
    }
  }, [activeView, parks, facilities, currentLocation, dogParkIcon, facilityIcon, currentLocationIcon, createSimpleInfoWindowContent]);

  // マップを初期化する関数
  const initializeMap = useCallback((mapContainer: HTMLElement) => {
    try {
      const window: any = globalThis.window;
      
      if (!window.google?.maps || !isLoaded) {
        console.warn('Google Maps API not loaded yet');
        return;
      }

      const mapCenter = userLocation || currentLocation || center || { lat: 35.6762, lng: 139.6503 };
      
      // POI（Points of Interest）を非表示にするマップスタイル（動物病院は表示）
      const mapStyles = [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "poi.business",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "poi.park",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "poi.attraction",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "poi.government",
          stylers: [{ visibility: "off" }]
        },
        // 動物病院を明示的に表示
        {
          featureType: "poi.medical",
          stylers: [{ visibility: "on" }]
        },
        {
          featureType: "poi.medical",
          elementType: "labels",
          stylers: [{ visibility: "on" }]
        },
        {
          featureType: "poi.place_of_worship",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "poi.school",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "poi.sports_complex",
          stylers: [{ visibility: "off" }]
        }
      ];

      const mapOptions = {
        center: mapCenter,
        zoom: 13,
        styles: mapStyles, // POI非表示スタイルを適用
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        scrollwheel: true,
        disableDoubleClickZoom: false,
      };

      const map = new window.google.maps.Map(mapContainer, mapOptions);

      // マーカーを追加
      addMarkers(map);
      
      setMapError('');
      setIsMapInitialized(true);
      console.log('マップ初期化完了（POI非表示）');
    } catch (error) {
      console.error('マップ初期化エラー:', error);
      setMapError('地図の初期化に失敗しました');
    }
  }, [userLocation, currentLocation, center, addMarkers, isLoaded]);

  // Google Maps API読み込み完了後にマップを初期化
  useEffect(() => {
    if (!mapRef.current) return;
    
    if (isLoaded && !error) {
      initializeMap(mapRef.current);
    } else if (error) {
      setMapError(error);
    }
  }, [isLoaded, error, initializeMap]);

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
  if (error) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <MapPin className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">マップ機能は現在利用できません</h3>
        <p className="text-gray-600 text-sm mb-4">{error}</p>
        <div className="text-xs text-gray-500">
          <p>{activeView === 'dogparks' ? 'ドッグラン' : 'ペット施設'}: {activeView === 'dogparks' ? parks.length : facilities.length}件</p>
        </div>
      </Card>
    );
  }

  // マップエラーが発生した場合の表示
  if (mapError && mapError !== error) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <MapPin className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">マップを読み込めませんでした</h3>
        <p className="text-gray-600 text-sm mb-4">{mapError}</p>
        <Button onClick={() => {
          setMapError('');
          setIsMapInitialized(false);
          if (mapRef.current) {
            initializeMap(mapRef.current);
          }
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
        
        {(isGoogleMapsLoading || !isMapInitialized) && !error && (
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
        {error ? 'マップ機能は現在利用できません' : 'マーカーをクリックすると詳細情報が表示されます'}
      </div>
    </Card>
  );
}

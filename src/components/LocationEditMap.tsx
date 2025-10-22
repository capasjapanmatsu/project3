import { MapPin, Search } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from './Button';
import { useGoogleMaps } from './GoogleMapsProvider';
import Input from './Input';

interface LocationEditMapProps {
  initialAddress?: string;
  initialLatitude?: number | undefined;
  initialLongitude?: number | undefined;
  onLocationChange: (latitude: number, longitude: number, address?: string) => void;
  className?: string;
}

export const LocationEditMap: React.FC<LocationEditMapProps> = ({
  initialAddress = '',
  initialLatitude,
  initialLongitude,
  onLocationChange,
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  
  const [address, setAddress] = useState(initialAddress);
  const [latitude, setLatitude] = useState<number>(initialLatitude || 35.6762);
  const [longitude, setLongitude] = useState<number>(initialLongitude || 139.6503);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapError, setMapError] = useState<string>('');
  const [mapReady, setMapReady] = useState(false);

  // GoogleMapsProviderからgoogleインスタンスを取得
  const { isLoaded, google: googleInstance } = useGoogleMaps();

  // Google Maps初期化
  const initMap = useCallback(async () => {
    if (!mapRef.current || !googleInstance) return;

    try {
      // GoogleMapsProviderから提供されるgoogleインスタンスを使用
      const google = googleInstance;

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: latitude, lng: longitude },
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      googleMapRef.current = map;
      geocoderRef.current = new google.maps.Geocoder();

      // ドラッグ可能なマーカーを作成
      const marker = new google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: map,
        draggable: true,
        title: '施設の位置（ドラッグして調整可能）',
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 16 16 24 16 24s16-8 16-24C32 7.163 24.837 0 16 0z" fill="#EF4444"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <circle cx="16" cy="16" r="4" fill="#EF4444"/>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(32, 40),
          anchor: new google.maps.Point(16, 40),
        }
      });

      markerRef.current = marker;

      // 逆ジオコーディング共通関数
      const reverseGeocodeAndNotify = (lat: number, lng: number) => {
        const geo = geocoderRef.current;
        if (!geo) {
          onLocationChange(lat, lng);
          return;
        }
        geo.geocode({ location: { lat, lng }, region: 'JP' }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            const formatted = results[0].formatted_address || '';
            setAddress((prev) => formatted || prev);
            onLocationChange(lat, lng, formatted || undefined);
          } else {
            onLocationChange(lat, lng);
          }
        });
      };

      // ドラッグイベントリスナー
      marker.addListener('dragend', () => {
        const position = marker.getPosition();
        if (position) {
          const newLat = position.lat();
          const newLng = position.lng();
          setLatitude(newLat);
          setLongitude(newLng);
          reverseGeocodeAndNotify(newLat, newLng);
        }
      });

      // マップクリックでマーカー移動
      map.addListener('click', (e: any) => {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        marker.setPosition({ lat: newLat, lng: newLng });
        setLatitude(newLat);
        setLongitude(newLng);
        reverseGeocodeAndNotify(newLat, newLng);
      });

      setIsLoading(false);
      setMapReady(true);
    } catch (error) {
      console.error('Google Maps初期化エラー:', error);
      setMapError('地図の読み込みに失敗しました。');
      setIsLoading(false);
    }
  }, [latitude, longitude, onLocationChange]);

  // 住所検索とジオコーディング（JS Geocoder → Places findPlaceFromQuery の順）
  const handleAddressSearch = useCallback(async () => {
    if (!address.trim() || !googleMapRef.current || !markerRef.current) return;
    setIsGeocoding(true);
    try {
      const google = googleInstance;
      const geocoder = geocoderRef.current;
      // 1) JS Geocoderで前方ジオコーディング
      if (geocoder) {
        await new Promise<void>((resolve, reject) => {
          geocoder.geocode({ address: address.trim(), region: 'JP' }, (results: any, status: any) => {
            if (status === 'OK' && results && results[0]?.geometry?.location) {
              const loc = results[0].geometry.location;
              const ll = { lat: loc.lat(), lng: loc.lng() };
              googleMapRef.current!.setCenter(ll);
              googleMapRef.current!.setZoom(16);
              markerRef.current!.setPosition(ll);
              setLatitude(ll.lat); setLongitude(ll.lng);
              const formatted = results[0].formatted_address || undefined;
              setAddress((prev)=> formatted || prev);
              onLocationChange(ll.lat, ll.lng, formatted);
              resolve();
            } else {
              reject(new Error(status || 'GEOCODER_FAILED'));
            }
          });
        });
        return; // 成功
      }

      // 2) Places (New) findPlaceFromQuery にフォールバック
      if (google?.maps?.places) {
        await new Promise<void>((resolve, reject) => {
          const svc = new google.maps.places.PlacesService(googleMapRef.current as any);
          // @ts-ignore - new API typings may vary
          const req: any = { query: address.trim(), fields: ['geometry','formatted_address'], language: 'ja', region: 'JP' };
          // try findPlaceFromQuery; fallback to textSearch if not available
          if (typeof svc.findPlaceFromQuery === 'function') {
            svc.findPlaceFromQuery(req, (places: any, status: any) => {
              if (status === 'OK' && places && places[0]?.geometry?.location) {
                const loc = places[0].geometry.location;
                const ll = { lat: loc.lat(), lng: loc.lng() };
                googleMapRef.current!.setCenter(ll);
                googleMapRef.current!.setZoom(16);
                markerRef.current!.setPosition(ll);
                setLatitude(ll.lat); setLongitude(ll.lng);
                const formatted = places[0].formatted_address || undefined;
                setAddress((prev)=> formatted || prev);
                onLocationChange(ll.lat, ll.lng, formatted);
                resolve();
              } else {
                reject(new Error(status || 'PLACES_FAILED'));
              }
            });
          } else if (typeof svc.textSearch === 'function') {
            svc.textSearch({ query: address.trim(), region: 'JP', language: 'ja' }, (results: any, status: any) => {
              if (status === 'OK' && results && results[0]?.geometry?.location) {
                const loc = results[0].geometry.location;
                const ll = { lat: loc.lat(), lng: loc.lng() };
                googleMapRef.current!.setCenter(ll);
                googleMapRef.current!.setZoom(16);
                markerRef.current!.setPosition(ll);
                setLatitude(ll.lat); setLongitude(ll.lng);
                const formatted = results[0].formatted_address || undefined;
                setAddress((prev)=> formatted || prev);
                onLocationChange(ll.lat, ll.lng, formatted);
                resolve();
              } else {
                reject(new Error(status || 'TEXT_SEARCH_FAILED'));
              }
            });
          } else {
            reject(new Error('PLACES_UNAVAILABLE'));
          }
        });
        return; // 成功
      }

      alert(`住所が見つかりませんでした。\n\n入力: ${address}\nマーカーをドラッグして調整してください。`);
      // 失敗時は現在地へ自動フォールバック
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            googleMapRef.current!.setCenter(ll);
            googleMapRef.current!.setZoom(15);
            markerRef.current!.setPosition(ll);
            setLatitude(ll.lat); setLongitude(ll.lng);
            onLocationChange(ll.lat, ll.lng);
          });
        }
      } catch {}
    } catch (error) {
      console.warn('住所検索フォールバックも失敗:', error);
      alert(`住所が見つかりませんでした。\n\n入力: ${address}\nマーカーをドラッグして調整してください。`);
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            googleMapRef.current!.setCenter(ll);
            googleMapRef.current!.setZoom(15);
            markerRef.current!.setPosition(ll);
            setLatitude(ll.lat); setLongitude(ll.lng);
            onLocationChange(ll.lat, ll.lng);
          });
        }
      } catch {}
    } finally {
      setIsGeocoding(false);
    }
  }, [address, onLocationChange, googleInstance]);

  // 初期化
  useEffect(() => {
    if (isLoaded && googleInstance) {
      void initMap();
    }
  }, [initMap, isLoaded, googleInstance]);

  // 現在地を取得して初期中心に（可能なら）
  useEffect(() => {
    if (!mapReady || !googleMapRef.current || !markerRef.current) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLatitude(loc.lat); setLongitude(loc.lng);
      try {
        googleMapRef.current!.setCenter(loc);
        googleMapRef.current!.setZoom(15);
        markerRef.current!.setPosition(loc);
        onLocationChange(loc.lat, loc.lng);
      } catch {}
    });
  }, [mapReady, onLocationChange]);

  // 初期住所が設定されているが座標が未設定の場合、自動ジオコーディング（JS Geocoder優先）
  useEffect(() => {
    const performInitialGeocoding = async () => {
      console.log('🏁 自動ジオコーディング条件チェック:', {
        initialAddress,
        hasInitialCoords: !!(initialLatitude && initialLongitude),
        isGeocoding,
        hasMapAndMarker: !!(googleMapRef.current && markerRef.current)
      });
      
      // 初期住所があり、座標が未設定で、マップが初期化済みの場合
      // 位置が手動固定されている場合は自動ジオコーディングを行わない
      const locked = (window as any).__PARK_LOCATION_LOCKED__ === true;

      if (!locked && initialAddress && 
          !initialLatitude && 
          !initialLongitude && 
          !isGeocoding && 
          googleMapRef.current && 
          markerRef.current) {
        
        console.log('🚀 初期住所での自動ジオコーディングを実行:', initialAddress);
        
        try {
          setIsGeocoding(true);
          const geocoder = geocoderRef.current;
          if (geocoder) {
            geocoder.geocode({ address: initialAddress, region: 'JP' }, (results: any, status: any) => {
              if (status === 'OK' && results && results[0]?.geometry?.location) {
                const loc = results[0].geometry.location;
                const ll = { lat: loc.lat(), lng: loc.lng() };
                googleMapRef.current!.setCenter(ll);
                googleMapRef.current!.setZoom(16);
                markerRef.current!.setPosition(ll);
                setLatitude(ll.lat); setLongitude(ll.lng);
                const formatted = results[0].formatted_address || undefined;
                onLocationChange(ll.lat, ll.lng, formatted);
              }
              setIsGeocoding(false);
            });
          } else {
            setIsGeocoding(false);
          }
        } catch (error) {
          console.error('💥 初期ジオコーディングエラー:', error);
          setIsGeocoding(false);
        }
      } else {
        console.log('⏭️ 自動ジオコーディングをスキップ');
      }
    };

    // マップが初期化されてから少し待って実行
    const timer = setTimeout(() => {
      console.log('⏰ 自動ジオコーディング実行タイマー開始');
      void performInitialGeocoding();
    }, 1000);

    return () => clearTimeout(timer);
  }, [initialAddress, initialLatitude, initialLongitude, isGeocoding, onLocationChange]);

  // エンターキーでの検索
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleAddressSearch();
    }
  };

  if (mapError) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-red-800">
          <MapPin className="w-5 h-5 mr-2" />
          {mapError}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 住所検索 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          住所で検索
        </label>
        <div className="flex space-x-2">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="住所を入力してください"
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleAddressSearch}
            disabled={isGeocoding || !address.trim()}
            className="px-4"
          >
            {isGeocoding ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 地図表示 */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-80 rounded-lg border border-gray-300"
          style={{ minHeight: '320px' }}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">地図を読み込み中...</p>
            </div>
          </div>
        )}
      </div>

      {/* 座標表示 */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">現在の座標:</span>
          <span className="text-gray-600">
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          ※ 赤いマーカーをドラッグして位置を調整できます
        </p>
      </div>
    </div>
  );
}; 
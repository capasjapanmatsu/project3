import { MapPin, Search } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { geocodeAddress } from '../utils/geocoding';
import Button from './Button';
import { useGoogleMaps } from './GoogleMapsProvider';
import Input from './Input';

interface LocationEditMapProps {
  initialAddress?: string;
  initialLatitude?: number;
  initialLongitude?: number;
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
  
  const [address, setAddress] = useState(initialAddress);
  const [latitude, setLatitude] = useState<number>(initialLatitude || 35.6762);
  const [longitude, setLongitude] = useState<number>(initialLongitude || 139.6503);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapError, setMapError] = useState<string>('');

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

      // ドラッグイベントリスナー
      marker.addListener('dragend', () => {
        const position = marker.getPosition();
        if (position) {
          const newLat = position.lat();
          const newLng = position.lng();
          setLatitude(newLat);
          setLongitude(newLng);
          onLocationChange(newLat, newLng);
        }
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Google Maps初期化エラー:', error);
      setMapError('地図の読み込みに失敗しました。');
      setIsLoading(false);
    }
  }, [latitude, longitude, onLocationChange]);

  // 住所検索とジオコーディング
  const handleAddressSearch = useCallback(async () => {
    if (!address.trim() || !googleMapRef.current || !markerRef.current) return;

    setIsGeocoding(true);

    try {
      console.log(`🔍 住所検索開始: "${address}"`);
      
      // 複数の住所形式で試行
      const addressVariations = [
        address.trim(),
        `〒861-8006 ${address.trim()}`,
        address.trim().replace(/[－]/g, '-'),
        address.trim().replace(/(\d+)丁目(\d+)-(\d+)/g, '$1-$2-$3'),
        address.trim().replace(/(\d+)丁目(\d+)－(\d+)/g, '$1-$2-$3')
      ];

      let result = null;
      let lastError = null;

      for (const addressVariation of addressVariations) {
        console.log(`🔍 試行中の住所: "${addressVariation}"`);
        try {
          result = await geocodeAddress(addressVariation);
          if (result) {
            console.log(`✅ 成功した住所形式: "${addressVariation}"`);
            break;
          }
        } catch (error) {
          console.warn(`⚠️ 住所形式 "${addressVariation}" で失敗:`, error);
          lastError = error;
        }
      }
      
      if (result) {
        const newLat = result.latitude;
        const newLng = result.longitude;
        
        // マップとマーカーの位置を更新
        const newPosition = { lat: newLat, lng: newLng };
        googleMapRef.current.setCenter(newPosition);
        googleMapRef.current.setZoom(16);
        markerRef.current.setPosition(newPosition);
        
        setLatitude(newLat);
        setLongitude(newLng);
        onLocationChange(newLat, newLng, result.formatted_address);
        
        console.log(`✅ マーカー位置更新完了: ${newLat}, ${newLng}`);
      } else {
        console.error('❌ 全ての住所形式で失敗');
        alert(`住所が見つかりませんでした。\n\n入力された住所: ${address}\n\n以下をご確認ください：\n・住所が正確に入力されているか\n・郵便番号が含まれているか\n・全角文字が使用されていないか\n\nもしくは、マーカーを直接ドラッグして位置を調整してください。`);
      }
    } catch (error) {
      console.error('住所検索エラー:', error);
      alert(`住所の検索中にエラーが発生しました。\n\nエラー詳細: ${error}\n\nマーカーを直接ドラッグして位置を調整してください。`);
    } finally {
      setIsGeocoding(false);
    }
  }, [address, onLocationChange]);

  // 初期化
  useEffect(() => {
    if (isLoaded && googleInstance) {
      void initMap();
    }
  }, [initMap, isLoaded, googleInstance]);

  // 初期住所が設定されているが座標が未設定の場合、自動ジオコーディング
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
          const result = await geocodeAddress(initialAddress);
          
          if (result) {
            const newLat = result.latitude;
            const newLng = result.longitude;
            
            console.log('📍 新しい座標:', { newLat, newLng });
            
            // マップとマーカーの位置を更新
            const newPosition = { lat: newLat, lng: newLng };
            googleMapRef.current.setCenter(newPosition);
            googleMapRef.current.setZoom(16);
            markerRef.current.setPosition(newPosition);
            
            setLatitude(newLat);
            setLongitude(newLng);
            onLocationChange(newLat, newLng, result.formatted_address);
            
            console.log('✅ 初期ジオコーディング成功:', newLat, newLng);
          } else {
            console.log('❌ 初期ジオコーディング失敗:', initialAddress);
          }
        } catch (error) {
          console.error('💥 初期ジオコーディングエラー:', error);
        } finally {
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
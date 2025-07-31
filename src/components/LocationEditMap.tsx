import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Search } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { geocodeAddress } from '../utils/geocoding';
import Button from './Button';
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

  // Google Maps初期化
  const initMap = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      const loader = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        version: 'weekly',
        libraries: ['places', 'geometry']
      });

      await loader.load();

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
      const result = await geocodeAddress(address);
      
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
      } else {
        alert('住所が見つかりませんでした。別の住所を試してください。');
      }
    } catch (error) {
      console.error('ジオコーディングエラー:', error);
      alert('住所の検索中にエラーが発生しました。');
    } finally {
      setIsGeocoding(false);
    }
  }, [address, onLocationChange]);

  // 初期化
  useEffect(() => {
    void initMap();
  }, [initMap]);

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
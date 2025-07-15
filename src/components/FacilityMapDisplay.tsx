import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Phone, Globe, Star, Clock, AlertCircle } from 'lucide-react';
import { MapDisplayItem, FACILITY_CATEGORY_LABELS, FACILITY_ICONS, FacilityFilter } from '../types/facilities';

interface FacilityMapDisplayProps {
  items: MapDisplayItem[];
  filters: FacilityFilter;
  userLocation: { lat: number; lng: number } | null;
  onItemClick?: (item: MapDisplayItem) => void;
  className?: string;
}

const FacilityMapDisplay: React.FC<FacilityMapDisplayProps> = ({
  items,
  filters,
  userLocation,
  onItemClick,
  className = '',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapError, setMapError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // フィルターされたアイテムを取得
  const filteredItems = items.filter(item => {
    if (item.type === 'dog_park') return filters.showDogParks;
    if (item.category === 'pet_friendly_restaurant') return filters.showPetFriendlyRestaurants;
    if (item.category === 'pet_friendly_hotel') return filters.showPetFriendlyHotels;
    if (item.category === 'pet_shop') return filters.showPetShops;
    if (item.category === 'pet_salon') return filters.showPetSalons;
    if (item.category === 'pet_hotel') return filters.showPetHotels;
    if (item.category === 'veterinary_clinic') return filters.showVeterinaryClinics;
    return false;
  });

  // 地図の初期化
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
        });

        await loader.load();
        
        const defaultCenter = userLocation || { lat: 35.6812, lng: 139.7671 };
        
        const map = new google.maps.Map(mapRef.current!, {
          zoom: 12,
          center: defaultCenter,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        googleMapRef.current = map;
        
        // 情報ウィンドウの初期化
        infoWindowRef.current = new google.maps.InfoWindow();
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError('地図の読み込みに失敗しました');
        setIsLoading(false);
      }
    };

    initMap();
  }, [userLocation]);

  // マーカーの更新
  useEffect(() => {
    if (!googleMapRef.current || !filteredItems.length) return;

    // 既存のマーカーをクリア
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // 新しいマーカーを作成
    filteredItems.forEach(item => {
      if (!item.latitude || !item.longitude) return;

      const marker = new google.maps.Marker({
        position: { lat: item.latitude, lng: item.longitude },
        map: googleMapRef.current,
        title: item.name,
        icon: createCustomMarkerIcon(item),
      });

      // クリックイベント
      marker.addListener('click', () => {
        if (onItemClick) {
          onItemClick(item);
        }
        showInfoWindow(marker, item);
      });

      markersRef.current.push(marker);
    });

    // マーカーが表示されるように地図の表示範囲を調整
    if (filteredItems.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      filteredItems.forEach(item => {
        if (item.latitude && item.longitude) {
          bounds.extend({ lat: item.latitude, lng: item.longitude });
        }
      });
      googleMapRef.current.fitBounds(bounds);
    }
  }, [filteredItems, onItemClick]);

  // カスタムマーカーアイコンの作成
  const createCustomMarkerIcon = (item: MapDisplayItem) => {
    const colors = {
      dog_park: '#3B82F6',
      pet_friendly_restaurant: '#10B981',
      pet_friendly_hotel: '#8B5CF6',
      pet_shop: '#F59E0B',
      pet_salon: '#EC4899',
      pet_hotel: '#6366F1',
      veterinary_clinic: '#EF4444',
    };

    const color = colors[item.category as keyof typeof colors] || '#6B7280';
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="2"/>
          <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">
            ${FACILITY_ICONS[item.category as keyof typeof FACILITY_ICONS] || '📍'}
          </text>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 16),
    };
  };

  // 情報ウィンドウの表示
  const showInfoWindow = (marker: google.maps.Marker, item: MapDisplayItem) => {
    if (!infoWindowRef.current) return;

    const content = `
      <div style="max-width: 280px; padding: 12px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 16px; margin-right: 8px;">${FACILITY_ICONS[item.category as keyof typeof FACILITY_ICONS] || '📍'}</span>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1F2937;">${item.name}</h3>
        </div>
        <p style="margin: 4px 0; font-size: 12px; color: #6B7280;">${item.category_ja}</p>
        <p style="margin: 8px 0; font-size: 14px; color: #374151; display: flex; align-items: center;">
          <span style="margin-right: 4px;">📍</span>
          ${item.address}
        </p>
        ${item.phone ? `
          <p style="margin: 4px 0; font-size: 14px; color: #374151; display: flex; align-items: center;">
            <span style="margin-right: 4px;">📞</span>
            ${item.phone}
          </p>
        ` : ''}
        ${item.website ? `
          <p style="margin: 4px 0; font-size: 14px; color: #374151; display: flex; align-items: center;">
            <span style="margin-right: 4px;">🌐</span>
            <a href="${item.website}" target="_blank" style="color: #3B82F6; text-decoration: none;">ウェブサイト</a>
          </p>
        ` : ''}
        ${item.description ? `
          <p style="margin: 8px 0; font-size: 13px; color: #6B7280; line-height: 1.4;">${item.description}</p>
        ` : ''}
        ${item.rating ? `
          <div style="margin: 8px 0; display: flex; align-items: center;">
            <span style="color: #F59E0B; margin-right: 4px;">⭐</span>
            <span style="font-size: 14px; color: #374151;">${item.rating.toFixed(1)}</span>
          </div>
        ` : ''}
        ${item.type === 'dog_park' ? `
          <button 
            onclick="window.location.href='/parks/${item.id}'" 
            style="
              margin-top: 8px;
              background: #3B82F6;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              font-size: 14px;
              cursor: pointer;
              width: 100%;
            "
          >
            詳細を見る
          </button>
        ` : ''}
      </div>
    `;

    infoWindowRef.current.setContent(content);
    infoWindowRef.current.open(googleMapRef.current, marker);
  };

  if (mapError) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">地図を読み込み中...</p>
          </div>
        </div>
      )}
      <div
        ref={mapRef}
        className="w-full h-96 rounded-lg shadow-md"
        style={{ minHeight: '400px' }}
      />
      
      {/* 凡例 */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 max-w-xs">
        <h4 className="text-sm font-medium text-gray-800 mb-2">凡例</h4>
        <div className="space-y-1">
          {Object.entries(FACILITY_CATEGORY_LABELS).map(([key, label]) => {
            const isActive = filters.categories.includes(key);
            if (!isActive) return null;
            
            return (
              <div key={key} className="flex items-center space-x-2 text-xs">
                <span className="text-base">{FACILITY_ICONS[key as keyof typeof FACILITY_ICONS]}</span>
                <span className="text-gray-600">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FacilityMapDisplay; 
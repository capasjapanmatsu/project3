import { MapPin } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';

interface OptimizedMapProps {
  locations?: Array<{
    id: string;
    lat: number;
    lng: number;
    name: string;
  }>;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

/**
 * Google Maps APIを遅延読み込みする最適化されたマップコンポーネント
 */
const OptimizedMap = memo(({ 
  locations = [], 
  center = { lat: 35.6762, lng: 139.6503 }, 
  zoom = 12,
  className = ''
}: OptimizedMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    let isMounted = true;
    let observer: IntersectionObserver | null = null;

    const loadMap = async () => {
      try {
        // Google Maps APIを動的にインポート
        const { Loader } = await import('@googlemaps/js-api-loader');
        
        if (!isMounted) return;

        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
          libraries: ['places'],
        });

        const google = await loader.load();
        
        if (!isMounted || !mapRef.current) return;

        // マップの初期化
        googleMapRef.current = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // マーカーの追加
        markersRef.current = locations.map(location => {
          const marker = new google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: googleMapRef.current!,
            title: location.name,
            animation: google.maps.Animation.DROP,
          });

          // InfoWindow
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div class="p-2">
                <h3 class="font-semibold">${location.name}</h3>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(googleMapRef.current!, marker);
          });

          return marker;
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load Google Maps:', err);
        setError('地図の読み込みに失敗しました');
        setIsLoading(false);
      }
    };

    // IntersectionObserverで遅延読み込み
    if (mapRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && observer) {
              observer.disconnect();
              loadMap();
            }
          });
        },
        { rootMargin: '100px' }
      );

      observer.observe(mapRef.current);
    }

    return () => {
      isMounted = false;
      if (observer) {
        observer.disconnect();
      }
      
      // マーカーのクリーンアップ
      markersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      markersRef.current = [];
    };
  }, [center.lat, center.lng, zoom]);

  // ロケーションが変更されたときにマーカーを更新
  useEffect(() => {
    if (!googleMapRef.current || isLoading) return;

    // 既存のマーカーをクリア
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });

    // 新しいマーカーを追加
    markersRef.current = locations.map(location => {
      const marker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: googleMapRef.current!,
        title: location.name,
      });
      return marker;
    });
  }, [locations, isLoading]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">地図を読み込み中...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
});

OptimizedMap.displayName = 'OptimizedMap';

export default OptimizedMap;

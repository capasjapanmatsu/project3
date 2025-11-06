import { MapPin, Navigation } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../Button';
import Card from '../Card';
import { useGoogleMaps } from '../GoogleMapsProvider';

export type SpotForMap = {
  id: string;
  title: string;
  latitude: number | null;
  longitude: number | null;
  dogAllowed?: boolean | null;
};

type Props = {
  spots: SpotForMap[];
  thumbMap: Record<string, { url: string } | undefined>;
  className?: string;
};

export default function SpotsMap({ spots, thumbMap, className = '' }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const { isLoaded, error } = useGoogleMaps();
  const [mapObj, setMapObj] = useState<any>(null);
  const [infoWindow, setInfoWindow] = useState<any>(null);
  const [currentLoc, setCurrentLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const DEFAULT_CENTER = { lat: 35.6762, lng: 139.6503 };

  const createInfoContent = useCallback((spot: SpotForMap): string => {
    const t = spot.title || '名称未設定';
    const media = thumbMap[spot.id];
    const img = media?.url;
    const detailPath = `/spots/${spot.id}`;
    const imgHtml = img
      ? `<img src="${img}" alt="${t}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>`
      : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af;font-size:12px;">画像なし</div>`;
    return `
      <div style="min-width:220px;max-width:260px;padding:0 12px 6px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="width:100%;height:90px;border-radius:8px;overflow:hidden;background:#f3f4f6;margin:0 0 4px 0;">${imgHtml}</div>
        <h3 style="font-size:13px;font-weight:600;margin:6px 0 6px 0;line-height:1.3;color:#111827;">${t}</h3>
        <button onclick="window.infoWindowNavigate('${detailPath}')" style="width:100%;background:#3b82f6;color:white;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;">詳細</button>
      </div>
    `;
  }, [thumbMap]);

  useEffect(() => {
    (window as any).infoWindowNavigate = (path: string) => {
      window.location.assign(path);
    };
    return () => { delete (window as any).infoWindowNavigate; };
  }, []);

  // 現在地を取得して中心に
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCurrentLoc(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  // 初期化
  useEffect(() => {
    if (!isLoaded || error || !mapRef.current) return;
    const win: any = window;
    const map = new win.google.maps.Map(mapRef.current, {
      center: currentLoc || DEFAULT_CENTER,
      zoom: currentLoc ? 13 : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    setMapObj(map);
    setInfoWindow(new win.google.maps.InfoWindow());
    if (currentLoc) {
      new win.google.maps.Marker({ position: currentLoc, map, title: '現在地' });
    }
  }, [isLoaded, error, currentLoc]);

  // マーカー更新（現在地がある場合は現在地を優先してセンターに保つ）
  useEffect(() => {
    if (!mapObj || !infoWindow) return;
    const win: any = window;
    const markers: any[] = [];
    spots.forEach((s) => {
      if (!s.latitude || !s.longitude) return;
      const icon = (s.dogAllowed === false)
        ? {
            // Drop-pin shape (24x24-ish) in gray
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z M12 12.5c-1.93 0-3.5-1.57-3.5-3.5S10.07 5.5 12 5.5s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z',
            fillColor: '#9ca3af', // gray-400
            fillOpacity: 1,
            strokeColor: '#6b7280', // gray-500
            strokeWeight: 1,
            anchor: new win.google.maps.Point(12, 22),
            scale: 1.2,
          }
        : undefined;
      const marker = new win.google.maps.Marker({
        position: { lat: s.latitude, lng: s.longitude },
        map: mapObj,
        title: s.title,
        icon,
      });
      marker.addListener('click', () => {
        infoWindow.setContent(createInfoContent(s));
        infoWindow.open(mapObj, marker);
      });
      markers.push(marker);
    });
    if (currentLoc) {
      mapObj.setCenter(currentLoc);
      mapObj.setZoom(13);
    } else if (markers.length > 0) {
      const bounds = new (window as any).google.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend(m.getPosition()));
      mapObj.fitBounds(bounds, 80);
    }
    return () => {
      markers.forEach((m) => m.setMap(null));
    };
  }, [spots, mapObj, infoWindow, createInfoContent, currentLoc]);

  if (error) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <MapPin className="w-12 h-12 text-red-400 mx-auto mb-2"/>
        <p className="text-sm text-gray-600">地図の読み込みに失敗しました</p>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center"><MapPin className="w-4 h-4 text-blue-600 mr-2"/>スポットマップ</div>
        <Button size="sm" variant="secondary" onClick={() => {
          if (!navigator.geolocation) return;
          setIsLocating(true);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setCurrentLoc(loc);
              if (mapObj) { mapObj.setCenter(loc); mapObj.setZoom(13); }
              setIsLocating(false);
            },
            () => setIsLocating(false),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
          );
        }} disabled={isLocating} className="text-xs">
          <Navigation className="w-3 h-3 mr-1" />{isLocating ? '取得中...' : '現在地'}
        </Button>
      </div>
      <div ref={mapRef} className="w-full h-96" style={{ minHeight: '400px' }}/>
      <div className="p-2 border-t bg-gray-50 text-center text-xs text-gray-500">マーカーをクリックすると詳細が表示されます</div>
    </Card>
  );
}



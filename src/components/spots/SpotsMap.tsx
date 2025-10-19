import { useCallback, useEffect, useRef, useState } from 'react';
import Card from '../Card';
import { MapPin } from 'lucide-react';
import { useGoogleMaps } from '../GoogleMapsProvider';

export type SpotForMap = {
  id: string;
  title: string;
  latitude: number | null;
  longitude: number | null;
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

  // 初期化
  useEffect(() => {
    if (!isLoaded || error || !mapRef.current) return;
    const win: any = window;
    const map = new win.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    setMapObj(map);
    setInfoWindow(new win.google.maps.InfoWindow());
  }, [isLoaded, error]);

  // マーカー更新
  useEffect(() => {
    if (!mapObj || !infoWindow) return;
    const win: any = window;
    const markers: any[] = [];
    spots.forEach((s) => {
      if (!s.latitude || !s.longitude) return;
      const marker = new win.google.maps.Marker({
        position: { lat: s.latitude, lng: s.longitude },
        map: mapObj,
        title: s.title,
      });
      marker.addListener('click', () => {
        infoWindow.setContent(createInfoContent(s));
        infoWindow.open(mapObj, marker);
      });
      markers.push(marker);
    });
    if (markers.length > 0) {
      const bounds = new (window as any).google.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend(m.getPosition()));
      mapObj.fitBounds(bounds, 80);
    }
    return () => {
      markers.forEach((m) => m.setMap(null));
    };
  }, [spots, mapObj, infoWindow, createInfoContent]);

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
      <div className="p-3 border-b bg-gray-50 flex items-center"><MapPin className="w-4 h-4 text-blue-600 mr-2"/>映えスポットマップ</div>
      <div ref={mapRef} className="w-full h-96" style={{ minHeight: '400px' }}/>
      <div className="p-2 border-t bg-gray-50 text-center text-xs text-gray-500">マーカーをクリックすると詳細が表示されます</div>
    </Card>
  );
}



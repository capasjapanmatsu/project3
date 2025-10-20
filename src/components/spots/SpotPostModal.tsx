import { MapPin, Search, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';

type Props = { onClose: () => void; onCreated: (id: string) => void };

export default function SpotPostModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapObj, setMapObj] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [address, setAddress] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      });
    }
  }, []);

  // 地図初期化
  useEffect(() => {
    const win: any = window;
    if (!mapContainerRef.current || !win.google?.maps) return;
    const center = lat && lng ? { lat, lng } : { lat: 35.6762, lng: 139.6503 };
    const map = new win.google.maps.Map(mapContainerRef.current, {
      center,
      zoom: lat && lng ? 14 : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    setMapObj(map);
    const marker = new win.google.maps.Marker({ position: center, map, draggable: true });
    win.google.maps.event.addListener(marker, 'dragend', (e: any) => {
      setLat(e.latLng.lat());
      setLng(e.latLng.lng());
    });
    win.google.maps.event.addListener(map, 'click', (e: any) => {
      marker.setPosition(e.latLng);
      setLat(e.latLng.lat());
      setLng(e.latLng.lng());
    });
  }, [mapContainerRef, lat, lng]);

  const handleSubmit = async () => {
    if (!user) {
      navigate('/login?redirect=/spots');
      return;
    }
    if (!title.trim()) {
      setError('タイトルは必須です');
      return;
    }
    if (files.length === 0) {
      setError('最初に1枚以上の画像を選択してください');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      // 1. create spot
      const { data: spotRow, error: e1 } = await supabase
        .from('spots')
        .insert({
          author_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          latitude: lat,
          longitude: lng,
          address: address || null,
        })
        .select('id')
        .single();
      if (e1) throw e1;
      const spotId = spotRow!.id as string;

      // 2. upload images (limit: first 3 files only)
      const upFiles = files.slice(0, 3);
      for (let i = 0; i < upFiles.length; i++) {
        const f = upFiles[i];
        // NOTE: Simplified: for now upload original; server-side edge function for resize/webp can be added later
        const key = `${user.id}/${spotId}/${Date.now()}_${i}_${f.name}`;
        const { data: storageRes, error: uerr } = await supabase.storage.from('spot-images').upload(key, f, {
          cacheControl: '31536000',
          upsert: false,
        });
        if (uerr) throw uerr;
        const { data: pub } = supabase.storage.from('spot-images').getPublicUrl(storageRes!.path);
        const { error: insErr } = await supabase.from('spot_media').insert({
          spot_id: spotId,
          author_id: user.id,
          url: pub.publicUrl,
          storage_key: storageRes!.path,
          sort_order: i,
        });
        if (insErr) throw insErr;
      }

      onCreated(spotId);
    } catch (e: any) {
      setError(e?.message || '投稿に失敗しました');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">スポットを投稿</h2>
          <button onClick={onClose}><X className="w-5 h-5"/></button>
        </div>
        <div className="p-4 space-y-4">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}

          <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 p-2 rounded">
            このコーナーは公共施設など無料でワンちゃん同伴できるスポットを投稿できます。個人店や有料スポットは掲載できません。
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">位置を地図で指定（必須）</label>
            <div ref={mapContainerRef} style={{ width: '100%', height: 240, borderRadius: 8, background: '#f3f4f6' }} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">住所（任意）</label>
            <div className="flex gap-2">
              <input value={address} onChange={(e)=>setAddress(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="例: 東京都港区芝公園4-2-8"/>
              <button type="button" className="px-3 py-2 border rounded bg-gray-100 hover:bg-gray-200 text-sm" onClick={async ()=>{
                if (!address.trim()) return;
                try {
                  const resp = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`);
                  const json = await resp.json();
                  const loc = json?.results?.[0]?.geometry?.location;
                  if (loc && mapObj) {
                    setLat(loc.lat); setLng(loc.lng);
                    (mapObj as any).setCenter(loc);
                    (mapObj as any).setZoom(15);
                  }
                } catch {}
              }}>
                <Search className="w-4 h-4 inline mr-1"/>検索
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">タイトル（必須）</label>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="場所の名前"/>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-medium mb-1">カテゴリ</label>
            <select value={category} onChange={(e)=>setCategory(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="">選択してください</option>
              <option value="海辺">海辺</option>
              <option value="高台/夕日">高台/夕日</option>
              <option value="公園">公園</option>
              <option value="寺社">寺社</option>
              <option value="公共施設">公共施設</option>
              <option value="川沿い/湖畔">川沿い/湖畔</option>
              <option value="展望台">展望台</option>
              <option value="花畑">花畑</option>
              <option value="桜/紅葉">桜/紅葉</option>
              <option value="散歩道">散歩道</option>
            </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">住所（任意）</label>
              <input value={address} onChange={(e)=>setAddress(e.target.value)} className="w-full border rounded px-3 py-2"/>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">コメント（任意）</label>
            <textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={3} className="w-full border rounded px-3 py-2"/>
          </div>

          {/* 緯度経度入力は地図指定に移行（必要に応じてデバッグ用で再導入可） */}

          <div>
            <label className="block text-sm font-medium mb-1 flex items-center"><Upload className="w-4 h-4 mr-2"/>画像（1〜3枚）</label>
            <input type="file" accept="image/*" multiple onChange={(e)=>{
              const arr = Array.from(e.target.files || []);
              setFiles(arr.slice(0,3));
            }} />
            <p className="text-xs text-gray-500 mt-1">投稿後に他のユーザーもこのスポットへ最大3枚まで追加できます。</p>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>投稿する</Button>
        </div>
      </Card>
    </div>
  );
}



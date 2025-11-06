import { Search, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';
import ImageCropper from '../ImageCropper';

type Props = { onClose: () => void; onCreated: (id: string) => void };

export default function SpotPostModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [dogAllowed, setDogAllowed] = useState<boolean>(true);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapObj, setMapObj] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [address, setAddress] = useState('');
  const [files, setFiles] = useState<Array<File | null>>([null, null, null]);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 住所検索（入力から座標へ）
  const handleAddressSearchClick = async () => {
    if (!address.trim()) return;
    try {
      const win: any = window;
      // 1) Geocoder（地域バイアス: 日本）
      if (win.google?.maps) {
        const geocoder = new win.google.maps.Geocoder();
        geocoder.geocode({ address, region: 'JP' }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            const latlng = { lat: loc.lat(), lng: loc.lng() };
            setLat(latlng.lat); setLng(latlng.lng);
            if (mapObj) { (mapObj as any).setCenter(latlng); (mapObj as any).setZoom(15); }
            const formatted = results[0].formatted_address || '';
            setAddress(formatted);
          } else {
            // 2) Fallback: Places Autocomplete → Place Details
            if (win.google?.maps?.places) {
              const auto = new win.google.maps.places.AutocompleteService();
              auto.getPlacePredictions({ input: address, componentRestrictions: { country: 'jp' } }, (preds: any, pStatus: any) => {
                if (pStatus === 'OK' && preds && preds[0]) {
                  const placeId = preds[0].place_id;
                  const svc = new win.google.maps.places.PlacesService(mapObj || document.createElement('div'));
                  svc.getDetails({ placeId, fields: ['geometry','formatted_address'] }, (place: any, dStatus: any) => {
                    if (dStatus === 'OK' && place?.geometry?.location) {
                      const loc2 = place.geometry.location; const ll = { lat: loc2.lat(), lng: loc2.lng() };
                      setLat(ll.lat); setLng(ll.lng);
                      if (mapObj) { (mapObj as any).setCenter(ll); (mapObj as any).setZoom(15); }
                      if (place.formatted_address) setAddress(place.formatted_address);
                    } else {
                      alert('位置を特定できませんでした');
                    }
                  });
                } else {
                  alert('位置を特定できませんでした');
                }
              });
            }
          }
        });
      }
    } catch {}
  };

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
    const geocoder = new win.google.maps.Geocoder();
    const reverseGeocode = (ll: {lat: number; lng: number}) => {
      geocoder.geocode({ location: ll, region: 'JP' }, async (results: any, status: any) => {
        let formatted = (status === 'OK' && results && results[0]) ? (results[0].formatted_address || '') : '';
        if (!formatted) {
          // iOS WebView等でGeocoderが失敗する場合のフォールバック
          try {
            const key = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY_MOBILE || import.meta.env.VITE_GOOGLE_MAPS_API_KEY) as string | undefined;
            if (key) {
              const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${ll.lat},${ll.lng}&language=ja&region=JP&key=${key}`;
              const res = await fetch(url, { credentials: 'omit' });
              const json = await res.json();
              formatted = json?.status === 'OK' ? (json.results?.[0]?.formatted_address || '') : '';
            }
          } catch {}
        }
        if (formatted) setAddress(formatted);
      });
    };
    win.google.maps.event.addListener(marker, 'dragend', (e: any) => {
      setLat(e.latLng.lat());
      setLng(e.latLng.lng());
      reverseGeocode({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    win.google.maps.event.addListener(map, 'click', (e: any) => {
      marker.setPosition(e.latLng);
      setLat(e.latLng.lat());
      setLng(e.latLng.lng());
      reverseGeocode({ lat: e.latLng.lat(), lng: e.latLng.lng() });
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
    // 画像は任意（0枚でも可）
    if (dogAllowed && !category && categories.length === 0) {
      setError('タグを1つ以上選択してください');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      // 画像を1:1にトリミングし、WebP(1024x1024)へ変換
      const processToSquareWebp = (file: File, size = 1024): Promise<File> => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          const canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas not supported')); return; }
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('Failed to convert image')); return; }
            const out = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
            resolve(out);
          }, 'image/webp', 0.9);
        };
        img.onerror = reject;
        img.crossOrigin = 'anonymous';
        img.src = URL.createObjectURL(file);
      });

      // 1. create spot (fallback: if schema cache misses categories column)
      const payload: Record<string, any> = {
        author_id: user.id,
        title: title.trim(),
        description: dogAllowed ? (description.trim() || null) : 'この施設へのワンちゃん同伴は禁止となっています。',
        category: null,
        categories: dogAllowed ? (categories.length > 0 ? categories : [category].filter(Boolean)) : [],
        latitude: lat,
        longitude: lng,
        address: address || null,
        dog_allowed: dogAllowed,
      };

      let spotRow: any = null;
      let insertErr: any = null;
      {
        const { data, error } = await supabase.from('spots').insert(payload).select('id').single();
        spotRow = data; insertErr = error;
      }
      if (insertErr) {
        const msg = String(insertErr?.message || insertErr?.details || '');
        if (/categories/.test(msg)) {
          // fallback without categories (schema cache not updated). Put first tag into legacy category
          const payloadFallback = { ...payload };
          delete (payloadFallback as any).categories;
          payloadFallback.category = (categories[0] || category || null);
          const { data, error } = await supabase.from('spots').insert(payloadFallback).select('id').single();
          if (error) throw error; spotRow = data;
        } else if (/dog_allowed/.test(msg)) {
          const payloadFallback2 = { ...payload };
          delete (payloadFallback2 as any).dog_allowed;
          const { data, error } = await supabase.from('spots').insert(payloadFallback2).select('id').single();
          if (error) throw error; spotRow = data;
        } else {
          throw insertErr;
        }
      }
      const spotId = spotRow!.id as string;

      // 2. upload images (limit: first 3 files only)
      const upFiles = files.filter(Boolean).slice(0, 3) as File[];
      for (let i = 0; i < upFiles.length; i++) {
        const f = await processToSquareWebp(upFiles[i]);
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
      <Card className="max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">スポットを投稿</h2>
          <button onClick={onClose}><X className="w-5 h-5"/></button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}

          <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 p-2 rounded">
            このコーナーは公共施設など無料でワンちゃん同伴できるスポットを投稿できます。個人店や有料スポットは掲載できません。
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">位置を地図で指定（必須）</label>
            <div ref={mapContainerRef} style={{ width: '100%', height: 420, borderRadius: 8, background: '#f3f4f6' }} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">住所（任意）</label>
            <div className="flex gap-2">
              <input value={address} onChange={(e)=>setAddress(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="例: 東京都港区芝公園4-2-8"/>
              <button type="button" className="px-3 py-2 border rounded bg-gray-100 hover:bg-gray-200 text-sm" onClick={()=>{ void handleAddressSearchClick(); }}>
                <Search className="w-4 h-4 inline mr-1"/>検索
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">タイトル（必須）</label>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="場所の名前"/>
          </div>

          {/* ワンちゃん同伴 可/不可 */}
          <div>
            <label className="block text-sm font-medium mb-1">ワンちゃん同伴</label>
            <div className="flex items-center gap-6 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="dog_allowed" checked={dogAllowed} onChange={()=>setDogAllowed(true)} /> 可
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="dog_allowed" checked={!dogAllowed} onChange={()=>setDogAllowed(false)} /> 不可
              </label>
            </div>
            {!dogAllowed && (
              <p className="mt-1 text-xs text-gray-600">不可の場合はタグ選択は無効、説明は固定文になります。画像は白黒で掲載されます。</p>
            )}
          </div>

          {dogAllowed && (
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">タグ（複数可・最低1つ）</label>
                <div className="flex flex-wrap gap-2">
                  {["海辺","高台","夕日","公園","寺社","公共施設","川沿い/湖畔","展望台","花畑","桜","紅葉","散歩道","オブジェ"].map((c)=>(
                    <button type="button" key={c} onClick={()=>setCategories(prev=>prev.includes(c)?prev.filter(x=>x!==c):[...prev,c])} className={`px-3 py-1 rounded-full border text-sm ${categories.includes(c)?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300'}`}>{c}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">コメント（任意）</label>
            <textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={3} className="w-full border rounded px-3 py-2"/>
          </div>

          {/* 緯度経度入力は地図指定に移行（必要に応じてデバッグ用で再導入可） */}

          <div>
            <label className="block text-sm font-medium mb-1 flex items-center"><Upload className="w-4 h-4 mr-2"/>画像（任意・最大3枚）</label>
            <div className="space-y-2">
              {[0,1,2].map((idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-12">画像{idx+1}</span>
                  <input type="file" accept="image/*" onChange={(e)=>{
                    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                    if (f) { setCropIndex(idx); setCropFile(f); }
                  }} />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">投稿後に他のユーザーもこのスポットへ最大3枚まで追加できます。</p>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2 shrink-0 bg-white">
          <Button variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>保存</Button>
        </div>
        {cropFile && cropIndex !== null && (
          <ImageCropper
            imageFile={cropFile}
            aspectRatio={1}
            maxWidth={1024}
            maxHeight={1024}
            onCropComplete={(blob: Blob) => {
              const out = new File([blob], cropFile.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
              setFiles(prev => { const copy = [...prev]; copy[cropIndex] = out; return copy; });
              setCropFile(null); setCropIndex(null);
            }}
            onCancel={() => { setCropFile(null); setCropIndex(null); }}
          />
        )}
      </Card>
    </div>
  );
}



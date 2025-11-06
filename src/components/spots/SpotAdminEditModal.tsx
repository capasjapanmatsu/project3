import { MapPin, Save, Search, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';

type Props = {
  spot: any;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
};

export default function SpotAdminEditModal({ spot, onClose, onSaved, onDeleted }: Props) {
  const [title, setTitle] = useState(spot?.title || '');
  const [description, setDescription] = useState(spot?.description || '');
  const [address, setAddress] = useState(spot?.address || '');
  const [lat, setLat] = useState<number | null>(spot?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(spot?.longitude ?? null);
  const [dogAllowed, setDogAllowed] = useState<boolean>(spot?.dog_allowed !== false);
  const [categories, setCategories] = useState<string[]>(Array.isArray(spot?.categories) ? spot.categories as string[] : (spot?.category ? [spot.category] : []));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<any>(null);
  const mapObjRef = useRef<any>(null);

  useEffect(() => {
    try {
      const win: any = window;
      if (!mapRef.current || !win.google?.maps) return;
      const center = lat && lng ? { lat, lng } : { lat: 35.6762, lng: 139.6503 };
      const map = new win.google.maps.Map(mapRef.current, {
        center,
        zoom: lat && lng ? 15 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapObjRef.current = map;
      const marker = new win.google.maps.Marker({ position: center, map, draggable: true });
      markerRef.current = marker;
      const geocoder = new win.google.maps.Geocoder();
      const reverse = (ll: { lat: number; lng: number }) => {
        geocoder.geocode({ location: ll, region: 'JP' }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) setAddress(results[0].formatted_address || '');
        });
      };
      win.google.maps.event.addListener(marker, 'dragend', (e: any) => {
        const ll = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setLat(ll.lat); setLng(ll.lng); reverse(ll);
      });
      win.google.maps.event.addListener(map, 'click', (e: any) => {
        const ll = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        marker.setPosition(ll); setLat(ll.lat); setLng(ll.lng); reverse(ll);
      });
    } catch {}
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      // まずは categories を更新（列がない環境ではフォールバック）
      const updateCommon = {
        title: title.trim(),
        description: description.trim() || null,
        address: address || null,
        latitude: lat,
        longitude: lng,
        dog_allowed: dogAllowed,
      } as Record<string, any>;

      let upErr: any = null;
      {
        const { error } = await supabase.from('spots').update({ ...updateCommon, categories }).eq('id', spot.id);
        upErr = error;
      }
      if (upErr) {
        const msg = String(upErr?.message || upErr?.details || '');
        if (/categories/.test(msg)) {
          const payloadFallback = { ...updateCommon, category: (categories[0] || null) };
          const { error: e2 } = await supabase.from('spots').update(payloadFallback).eq('id', spot.id);
          if (e2) throw e2;
        } else {
          throw upErr;
        }
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm('このスポットを削除しますか？ この操作は取り消せません。')) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('spots').delete().eq('id', spot.id);
      if (error) throw error;
      onDeleted();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">スポットを編集（管理者）</h2>
          <button onClick={onClose}><X className="w-5 h-5"/></button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-1">タイトル</label>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full border rounded px-3 py-2"/>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ワンちゃん同伴</label>
            <div className="flex items-center gap-6 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="dog_allowed_admin" checked={dogAllowed} onChange={()=>setDogAllowed(true)} /> 可
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="dog_allowed_admin" checked={!dogAllowed} onChange={()=>setDogAllowed(false)} /> 不可
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">タグ（複数可）</label>
            <div className="flex flex-wrap gap-2">
              {['海辺','高台','夕日','公園','寺社','公共施設','川沿い/湖畔','展望台','花畑','桜','紅葉','散歩道','オブジェ'].map((c)=>(
                <button
                  type="button"
                  key={c}
                  onClick={()=>setCategories(prev=>prev.includes(c)?prev.filter(x=>x!==c):[...prev,c])}
                  className={`px-3 py-1 rounded-full border text-sm ${categories.includes(c)?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300'}`}
                >{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">説明（任意）</label>
            <textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={3} className="w-full border rounded px-3 py-2"/>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">住所</label>
            <div className="flex gap-2">
              <input value={address} onChange={(e)=>setAddress(e.target.value)} className="flex-1 border rounded px-3 py-2"/>
              <button
                type="button"
                className="px-3 py-2 border rounded bg-gray-100 hover:bg-gray-200 text-sm"
                onClick={async ()=>{
                  const addr = address.trim();
                  if (!addr) return;
                  try {
                    const win: any = window;
                    if (!win.google?.maps) return;
                    const geocoder = new win.google.maps.Geocoder();
                    geocoder.geocode({ address: addr, region: 'JP' }, (results: any, status: any) => {
                      if (status === 'OK' && results && results[0]) {
                        const loc = results[0].geometry.location;
                        const latlng = { lat: loc.lat(), lng: loc.lng() };
                        setLat(latlng.lat); setLng(latlng.lng);
                        if (mapObjRef.current) { mapObjRef.current.setCenter(latlng); mapObjRef.current.setZoom(15); }
                        if (markerRef.current) markerRef.current.setPosition(latlng);
                        const formatted = results[0].formatted_address || '';
                        setAddress(formatted);
                      } else if (win.google?.maps?.places) {
                        const auto = new win.google.maps.places.AutocompleteService();
                        auto.getPlacePredictions({ input: addr, componentRestrictions: { country: 'jp' } }, (preds: any, pStatus: any) => {
                          if (pStatus === 'OK' && preds && preds[0]) {
                            const placeId = preds[0].place_id;
                            const svc = new win.google.maps.places.PlacesService(mapObjRef.current || document.createElement('div'));
                            svc.getDetails({ placeId, fields: ['geometry','formatted_address'] }, (place: any, dStatus: any) => {
                              if (dStatus === 'OK' && place?.geometry?.location) {
                                const loc2 = place.geometry.location; const ll = { lat: loc2.lat(), lng: loc2.lng() };
                                setLat(ll.lat); setLng(ll.lng);
                                if (mapObjRef.current) { mapObjRef.current.setCenter(ll); mapObjRef.current.setZoom(15); }
                                if (markerRef.current) markerRef.current.setPosition(ll);
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
                    });
                  } catch {}
                }}
              >
                <Search className="w-4 h-4 inline mr-1"/>検索
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center"><MapPin className="w-4 h-4 mr-2"/>位置</label>
            <div ref={mapRef} className="w-full h-64 rounded" style={{ background: '#f3f4f6' }}/>
          </div>
        </div>
        <div className="p-4 border-t flex justify-between items-center">
          <Button variant="danger" onClick={remove} isLoading={deleting}><Trash2 className="w-4 h-4 mr-2"/>削除</Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>キャンセル</Button>
            <Button onClick={save} isLoading={saving}><Save className="w-4 h-4 mr-2"/>保存</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}



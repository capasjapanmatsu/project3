import { Edit3, ExternalLink, Flag, ImageIcon, MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import SpotAddPostModal from '../components/spots/SpotAddPostModal';
import SpotAdminEditModal from '../components/spots/SpotAdminEditModal';
import SpotReportModal from '../components/spots/SpotReportModal';
import useAuth from '../context/AuthContext';
import isCapacitorNative from '../utils/isCapacitorNative';
import { supabase } from '../utils/supabase';

export default function SpotDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const [spot, setSpot] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [comment, setComment] = useState(''); // kept for future but UIは非表示
  const [comments, setComments] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [showAddPost, setShowAddPost] = useState(false);
  const [displayAddress, setDisplayAddress] = useState('');
  const [showAdminEdit, setShowAdminEdit] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setError('');
        const { data: s, error: e1 } = await supabase.from('spots').select('*').eq('id', id).single();
        if (e1) throw e1;
        setSpot(s);
        const { data: m } = await supabase.from('spot_media').select('*').eq('spot_id', id).order('is_thumbnail', { ascending: false }).order('created_at', { ascending: true });
        setMedia(m || []);
        const { data: cs } = await supabase.from('spot_comments').select('*').eq('spot_id', id).order('created_at', { ascending: true });
        setComments(cs || []);
      } catch (e: any) {
        setError(e?.message || '読み込みに失敗しました');
      }
    })();
  }, [id]);

  // 日本語住所の再取得（表示専用）
  useEffect(() => {
    try {
      const win: any = window;
      if (!spot?.latitude || !spot?.longitude || !win.google?.maps) return;
      const geocoder = new win.google.maps.Geocoder();
      geocoder.geocode({ location: { lat: spot.latitude, lng: spot.longitude }, region: 'JP' }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          setDisplayAddress(results[0].formatted_address || '');
        }
      });
    } catch {}
  }, [spot?.latitude, spot?.longitude]);

  // 追加フォールバック：REST Geocoding API を使って日本語住所を強制取得
  useEffect(() => {
    const fetchJa = async () => {
      if (!spot?.latitude || !spot?.longitude) return;
      if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(displayAddress)) return; // 既に日本語っぽければスキップ
      const key = isCapacitorNative()
        ? (import.meta.env.VITE_GOOGLE_MAPS_API_KEY_MOBILE || import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
        : import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!key) return;
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${spot.latitude},${spot.longitude}&language=ja&region=JP&key=${key}`;
        const res = await fetch(url, { credentials: 'omit' });
        const json = await res.json();
        if (json?.status === 'OK' && json.results?.[0]?.formatted_address) {
          setDisplayAddress(json.results[0].formatted_address as string);
        }
      } catch {}
    };
    void fetchJa();
  }, [spot?.latitude, spot?.longitude, displayAddress]);

  // 旧コメント送信機能は非表示化（必要に応じて復活）
  const addComment = async () => {};

  return (
    <div className="max-w-5xl mx-auto px-4 pt-10 md:pt-12 pb-8">
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      {!spot ? (
        <div className="py-16 text-center text-gray-500">読み込み中...</div>
      ) : (
        <>
          <div className="mb-4">
            <div className="text-sm text-blue-600 mb-1">{spot.category || '未分類'}</div>
            <h1 className="text-2xl font-bold">{spot.title}</h1>
            <div className="text-sm text-gray-600 mt-1 flex items-center flex-wrap gap-2">
              <span className="inline-flex items-center"><MapPin className="w-4 h-4 mr-1"/>{displayAddress || spot.address || `${spot.latitude?.toFixed(5)}, ${spot.longitude?.toFixed(5)}`}</span>
              {spot.latitude && spot.longitude && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${spot.latitude},${spot.longitude}`)}&hl=ja`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 underline"
                  aria-label="Googleマップで開く"
                >
                  <ExternalLink className="w-4 h-4 mr-1"/>Googleマップで開く
                </a>
              )}
            </div>
          </div>

          {/* swipeable gallery (basic horizontal scroll) */}
          <div ref={scrollerRef} className="relative overflow-x-auto whitespace-nowrap snap-x snap-mandatory mb-4">
            {media.length === 0 ? (
              <div className="h-64 bg-gray-100 flex items-center justify-center text-gray-400"><ImageIcon className="w-10 h-10"/></div>
            ) : (
              media.map((m) => (
                <img key={m.id} src={m.url} alt={spot.title} className="h-64 w-auto inline-block mr-2 rounded snap-center object-cover" loading="lazy" decoding="async"/>
              ))
            )}
          </div>

          {spot.description && (
            <Card className="p-4 mb-4"><p className="text-gray-700 whitespace-pre-wrap">{spot.description}</p></Card>
          )}

          {/* 投稿ボタンのみ表示（コメントUIは非表示） */}
          <Card className="p-4">
            <div className="flex justify-between items-center">
              {isAdmin && (
                <Button variant="secondary" size="sm" onClick={()=>setShowAdminEdit(true)}>
                  <Edit3 className="w-4 h-4 mr-2"/>管理者編集
                </Button>
              )}
              <Button size="sm" onClick={()=>setShowAddPost(true)}>この場所で投稿する</Button>
            </div>
          </Card>

          {/* report */}
          <div className="mt-4">
            <Button variant="secondary" onClick={()=>setShowReport(true)}>
              <Flag className="w-4 h-4 mr-2"/>通報
            </Button>
          </div>
          {showAddPost && (
            <SpotAddPostModal spotId={id as string} onClose={()=>setShowAddPost(false)} onAdded={async()=>{
              const { data: m } = await supabase.from('spot_media').select('*').eq('spot_id', id).order('is_thumbnail', { ascending: false }).order('created_at', { ascending: true });
              setMedia(m || []);
              const { data: cs } = await supabase.from('spot_comments').select('*').eq('spot_id', id).order('created_at', { ascending: true });
              setComments(cs || []);
            }}/>
          )}
          {showAdminEdit && spot && (
            <SpotAdminEditModal
              spot={spot}
              onClose={()=>setShowAdminEdit(false)}
              onSaved={async()=>{
                const { data: s } = await supabase.from('spots').select('*').eq('id', id).single();
                setSpot(s);
              }}
              onDeleted={()=>{
                window.history.back();
              }}
            />
          )}
          {showReport && (
            <SpotReportModal spotId={id as string} onClose={()=>setShowReport(false)}/>
          )}
        </>
      )}
    </div>
  );
}



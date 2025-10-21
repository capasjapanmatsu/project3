import { Building2, Filter, Flower2, Landmark, MapPin, Mountain, Plus, Sailboat, Search, Sun, Trees, Waves } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import SpotPostModal from '../components/spots/SpotPostModal';
import SpotsMap from '../components/spots/SpotsMap';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

type Spot = {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  is_hidden: boolean;
  created_at: string;
};

type SpotMedia = {
  id: string;
  spot_id: string;
  url: string;
  is_thumbnail: boolean;
  created_at: string;
};

const CATEGORIES = ['海辺', '高台/夕日', '公園', '寺社', '公共施設', '川沿い/湖畔', '展望台', '花畑', '桜/紅葉', '散歩道', 'オブジェ'];

export default function Spots() {
  const { user } = useAuth();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [thumbMap, setThumbMap] = useState<Record<string, SpotMedia | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPost, setShowPost] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(false);

  const filteredSpots = useMemo(() => {
    if (!category) return spots;
    return spots.filter((s: any) => {
      const cats: string[] = (s.categories as any) || [];
      return (s.category || '') === category || cats.includes(category);
    });
  }, [spots, category]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const { data: rows, error: e1 } = await supabase
          .from('spots')
          .select('*')
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(100);
        if (e1) throw e1;
        const list = (rows || []) as unknown as Spot[];
        setSpots(list);
        const ids = list.map((s) => s.id);
        if (ids.length > 0) {
          const { data: media, error: e2 } = await supabase
            .from('spot_media')
            .select('id,spot_id,url,is_thumbnail,created_at')
            .in('spot_id', ids)
            .order('is_thumbnail', { ascending: false })
            .order('created_at', { ascending: true });
          if (e2) throw e2;
          const map: Record<string, SpotMedia> = {};
          (media || []).forEach((m: any) => {
            if (!map[m.spot_id]) map[m.spot_id] = m;
          });
          setThumbMap(map);
        } else {
          setThumbMap({});
        }
      } catch (e: any) {
        setError(e?.message || '読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 pt-10 md:pt-12 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center"><MapPin className="w-6 h-6 text-blue-600 mr-2"/>映えスポット</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="hidden md:inline-flex"><Filter className="w-4 h-4 mr-2"/>絞り込み</Button>
          <Button onClick={() => setShowPost(true)}><Plus className="w-4 h-4 mr-2"/>スポットを投稿</Button>
        </div>
      </div>

      {/* アコーディオン（カテゴリ） */}
      <div className="mb-4 bg-white rounded-lg border">
        <button onClick={()=>setShowCategories(!showCategories)} className="w-full px-3 py-3 flex items-center justify-between text-left hover:bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">カテゴリ</span>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">{category ? 1 : 0} / {CATEGORIES.length}</span>
          </div>
          <span className={`text-gray-400 transition-transform ${showCategories ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {showCategories && (
          <div className="px-3 pb-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-2 pt-3">
              <button onClick={() => setCategory(null)} className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border ${category===null?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                <Sun className="w-4 h-4"/>すべて
              </button>
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border ${category===c?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                  {c === '海辺' && <Waves className="w-4 h-4"/>}
                  {c === '高台/夕日' && <Mountain className="w-4 h-4"/>}
                  {c === '公園' && <Trees className="w-4 h-4"/>}
                  {c === '寺社' && <Landmark className="w-4 h-4"/>}
                  {c === '公共施設' && <Building2 className="w-4 h-4"/>}
                  {c === '川沿い/湖畔' && <Sailboat className="w-4 h-4"/>}
                  {c === '展望台' && <Search className="w-4 h-4"/>}
                  {c === '花畑' && <Flower2 className="w-4 h-4"/>}
                  {c === '桜/紅葉' && <Flower2 className="w-4 h-4"/>}
                  {c === '散歩道' && <Trees className="w-4 h-4"/>}
                  {c === 'オブジェ' && <Landmark className="w-4 h-4"/>}
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      {/* マップがメイン */}
      <SpotsMap
        spots={filteredSpots.map(s => ({ id: s.id, title: s.title, latitude: s.latitude, longitude: s.longitude }))}
        thumbMap={thumbMap}
        className="mb-6"
      />
      {loading ? (
        <div className="py-16 text-center text-gray-500">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpots.map((s) => {
            const thumb = thumbMap[s.id];
            return (
              <Card key={s.id} className="overflow-hidden">
                <Link to={`/spots/${s.id}`} className="block no-underline hover:no-underline">
                  <div className="relative w-full pb-[100%] bg-gray-100 overflow-hidden">
                    {thumb ? (
                      <img src={thumb.url} alt={s.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async"/>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400"><MapPin className="w-8 h-8"/></div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-sm text-blue-600 mb-1">{s.category || '未分類'}</div>
                    <h2 className="font-semibold text-gray-900">{s.title}</h2>
                    {s.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{s.description}</p>}
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      {showPost && (
        <SpotPostModal onClose={() => setShowPost(false)} onCreated={(id) => {
          setShowPost(false);
          // naive refresh
          window.location.assign(`/spots/${id}`);
        }}/>
      )}
    </div>
  );
}



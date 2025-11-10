import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

type Banner = {
  id: string;
  image_url: string | null;
  storage_key: string | null;
  link_url: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
  slot?: number | null;
};

export default function TopBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const nowIso = new Date().toISOString();
        // 掲載期間内のバナーをスロット順・開始日降順で取得
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .lte('start_date', nowIso)
          .gte('end_date', nowIso)
          .order('slot', { ascending: true })
          .order('start_date', { ascending: false });
        if (error) throw error;
        const arr = (data || []) as Banner[];
        // スロットごとに最新1件に絞る
        const picked: Record<number, Banner> = {};
        arr.forEach(b => {
          const s = typeof b.slot === 'number' ? b.slot! : 1;
          if (s >= 1 && s <= 10 && !picked[s]) picked[s] = b;
        });
        const slotsToShow = Math.min(
          Math.max(Number(import.meta.env.VITE_BANNER_SLOTS || 5), 1),
          10
        );
        const out: Banner[] = [];
        for (let i = 1; i <= slotsToShow; i++) {
          if (picked[i]) out.push(picked[i]);
          else out.push({ id: `placeholder-${i}`, image_url: null, storage_key: null, link_url: '/sponsor-application', start_date: null, end_date: null, slot: i });
        }
        setBanners(out);
      } catch {
        // エラー時はすべてプレースホルダー
        const slotsToShow = Math.min(
          Math.max(Number(import.meta.env.VITE_BANNER_SLOTS || 5), 1),
          10
        );
        const out: Banner[] = [];
        for (let i = 1; i <= slotsToShow; i++) {
          out.push({ id: `placeholder-${i}`, image_url: null, storage_key: null, link_url: '/sponsor-application', start_date: null, end_date: null, slot: i });
        }
        setBanners(out);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {banners.map((b, idx) => {
          const href = b.link_url || '/sponsor-application';
          const slotNum = b.slot ?? (idx + 1);
          if (b.image_url) {
            return (
              <a key={b.id} href={href} aria-label={`バナー${slotNum}`} className="block">
                <img
                  src={b.image_url}
                  alt={`バナー${slotNum}`}
                  className="w-full h-24 sm:h-28 lg:h-32 rounded-lg shadow-md object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </a>
            );
          }
          return (
            <a key={b.id} href={href} aria-label={`バナー${slotNum}（募集中）`} className="block">
              <div className="w-full h-24 sm:h-28 lg:h-32 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <div className="text-center">
                  <div className="text-sm sm:text-base font-bold">バナー{slotNum} 募集中</div>
                  <div className="text-[10px] sm:text-xs opacity-90">募集要項はこちら</div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}



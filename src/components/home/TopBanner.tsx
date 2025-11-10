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
};

export default function TopBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const nowIso = new Date().toISOString();
        // 取得: 掲載期間内の最新バナーを1件
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .lte('start_date', nowIso)
          .gte('end_date', nowIso)
          .order('start_date', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) {
          setBanner(data[0] as any);
        } else {
          setBanner(null);
        }
      } catch {
        setBanner(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const content = (() => {
    if (loading) return null;
    if (banner?.image_url) {
      const href = banner.link_url || '/sponsor-application';
      return (
        <a
          href={href}
          className="block w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2"
          aria-label="トップバナー"
        >
          <img
            src={banner.image_url}
            alt="トップバナー"
            className="w-full h-auto rounded-lg shadow-md object-cover"
            loading="lazy"
            decoding="async"
          />
        </a>
      );
    }
    // フォールバック: 募集中バナー（リンク先は募集要項）
    return (
      <a
        href="/sponsor-application"
        className="block w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2"
        aria-label="スポンサー募集中"
      >
        <div className="w-full h-24 sm:h-28 lg:h-32 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
          <div className="text-center">
            <div className="text-lg sm:text-xl font-bold">トップバナー広告 募集中</div>
            <div className="text-xs sm:text-sm opacity-90">詳しくは募集要項ページをご覧ください</div>
          </div>
        </div>
      </a>
    );
  })();

  return <>{content}</>;
}



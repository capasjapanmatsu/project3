import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';

interface SponsorBanner {
  id: string;
  title: string;
  description: string;
  image_url: string;
  website_url: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

// スポンサー募集中のダミーデータ
const recruitmentBanners: SponsorBanner[] = [
  {
    id: 'recruit-1',
    title: 'スポンサー募集中',
    description: 'あなたの広告をここに掲載しませんか？多くのドッグオーナーにリーチできます！',
    image_url: '',
    website_url: '/sponsor-inquiry',
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'recruit-2',
    title: 'ペット関連サービス募集',
    description: 'ペット関連サービスの宣伝に最適！効果的な広告枠をご提供します。',
    image_url: '',
    website_url: '/sponsor-inquiry',
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 'recruit-3',
    title: '愛犬家向け広告募集',
    description: '愛犬家コミュニティに向けて、あなたのサービスを紹介してください！',
    image_url: '',
    website_url: '/sponsor-inquiry',
    is_active: true,
    display_order: 3,
    created_at: new Date().toISOString()
  },
  {
    id: 'recruit-4',
    title: 'ドッグフード・用品広告',
    description: 'ドッグフードやペット用品の広告掲載で売上アップを実現しましょう！',
    image_url: '',
    website_url: '/sponsor-inquiry',
    is_active: true,
    display_order: 4,
    created_at: new Date().toISOString()
  },
  {
    id: 'recruit-5',
    title: '動物病院・サービス',
    description: '動物病院やペットケアサービスの宣伝で地域の愛犬家にアピール！',
    image_url: '',
    website_url: '/sponsor-inquiry',
    is_active: true,
    display_order: 5,
    created_at: new Date().toISOString()
  }
];

interface SponsorBannerProps {
  banners?: SponsorBanner[];
}

export const SponsorBanner: React.FC<SponsorBannerProps> = ({ banners: propBanners }) => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<SponsorBanner[]>(recruitmentBanners);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // DBから掲載中バナーを取得して先頭に詰める（足りない分は募集中で埋める）
  useEffect(() => {
    (async () => {
      try {
        const nowIso = new Date().toISOString();
        const { data, error } = await supabase
          .from('banners')
          .select('id,image_url,link_url,start_date,end_date')
          .lte('start_date', nowIso)
          .gte('end_date', nowIso)
          .order('start_date', { ascending: false })
          .limit(10);
        if (error) throw error;
        const actives = (data || []).map((r: any, idx: number) => ({
          id: r.id,
          title: '', // スライドは入稿画像を全面表示、文言は不要
          description: '',
          image_url: r.image_url || '',
          website_url: r.link_url || '/sponsor-inquiry',
          is_active: true,
          display_order: idx + 1,
          created_at: r.start_date || new Date().toISOString(),
        })) as SponsorBanner[];
        // 5枠に満たない分を募集中で埋める
        const need = Math.max(0, 5 - actives.length);
        const filled = [...actives, ...recruitmentBanners.slice(0, need)];
        if (filled.length > 0) setBanners(filled);
      } catch {
        // 失敗時は募集中のまま
      }
    })();
  }, []);

  // 自動スライド機能（安定版：常時稼働）
  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(id);
  }, [banners.length]);

  // バナークリックハンドラー（スポンサーお問い合わせ画面へ遷移）
  const handleBannerClick = useCallback(() => {
    navigate('/sponsor-inquiry');
  }, [navigate]);

  if (banners.length === 0) {
    return null;
  }

  const slides = banners.length ? banners : recruitmentBanners;

  return (
    <section 
      className="w-full mb-8 relative pt-3"
      aria-label="スポンサー募集カルーセル"
    >
      {/* カルーセルコンテナ */}
      <div className="relative w-full h-36 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((banner) => (
            <div
              key={banner.id}
              className="min-w-full h-full relative cursor-pointer"
              onClick={() => {
                if (banner.website_url) {
                  window.location.assign(banner.website_url);
                } else {
                  handleBannerClick();
                }
              }}
            >
              {banner.image_url ? (
                <img
                  src={banner.image_url}
                  alt="スポンサー"
                  className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-lg"
                />
              ) : (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-lg" />
              )}
              {!banner.image_url && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                    詳細を見る →
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* インジケーターはモバイルで視認性が低く高さを圧迫するため非表示 */}
    </section>
  );
};

export default SponsorBanner; 
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
  const [isPlaying, setIsPlaying] = useState(true);
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

  // インデックス計算ヘルパー（循環）
  const getCircularIndex = useCallback((index: number) => {
    return ((index % banners.length) + banners.length) % banners.length;
  }, [banners.length]);

  // 表示するバナーを計算（中央±2の5つ）
  const getVisibleBanners = useCallback(() => {
    const visible = [];
    for (let i = -2; i <= 2; i++) {
      const index = getCircularIndex(currentIndex + i);
      visible.push({
        banner: banners[index],
        position: i,
        index: index
      });
    }
    return visible;
  }, [currentIndex, banners, getCircularIndex]);

  if (banners.length === 0) {
    return null;
  }

  const visibleBanners = getVisibleBanners();

  return (
    <section 
      className="w-full mb-8 relative pt-3 marquee-allow"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      aria-label="スポンサー募集カルーセル"
    >
      {/* カルーセルコンテナ */}
      <div className="relative w-full h-36 overflow-hidden">
        {/* バナー表示エリア */}
        <div className="flex items-center justify-center h-full">
          {visibleBanners.map(({ banner, position, index }) => {
            // バナーが存在しない場合はスキップ
            if (!banner) return null;
            
            const isCenter = position === 0;
            const isAdjacent = Math.abs(position) === 1;
            const isEdge = Math.abs(position) === 2;

            // 位置とサイズの計算
            let transform = '';
            let opacity = 1;
            let scale = 1;
            let zIndex = 10;

            if (isCenter) {
              // 中央バナー
              transform = 'translateX(0)';
              opacity = 1;
              scale = 1;
              zIndex = 20;
            } else if (isAdjacent) {
              // 隣接バナー（チラ見せ）- 適切な隙間を確保
              transform = `translateX(${position * 260}px)`;
              opacity = 0.7;
              scale = 0.85;
              zIndex = 15;
            } else if (isEdge) {
              // 端バナー（実際サイズで少し見える）- 適切な隙間を確保
              transform = `translateX(${position * 300}px)`;
              opacity = 0.4;
              scale = 1.0;
              zIndex = 10;
            }

            return (
              <div
                key={`pos-${position}`}  /* 位置でDOMを安定化させ、transformのアニメーションを有効化 */
                className={`absolute transition-all duration-700 ease-in-out cursor-pointer marquee-allow ${
                  isCenter ? 'w-[28rem] h-28' : isAdjacent ? 'w-96 h-24' : 'w-[28rem] h-28'
                }`}
                style={{
                  transform: `${transform} scale(${scale})`,
                  opacity,
                  zIndex
                }}
                onClick={() => {
                  if (banner.image_url) {
                    // 入稿済み広告はリンクへ飛ばす
                    window.location.assign(banner.website_url || '/sponsor-inquiry');
                  } else {
                    handleBannerClick();
                  }
                }}
              >
                <div className="w-full h-full rounded-lg relative overflow-hidden shadow-lg">
                  {/* 入稿済み画像 or 募集中プレースホルダー */}
                  {banner.image_url ? (
                    <img src={banner.image_url} alt="スポンサー" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className={`absolute inset-0 ${
                      position === 0 ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500' :
                      position === -1 || position === 1 ? 'bg-gradient-to-r from-green-500 via-blue-500 to-purple-500' :
                      'bg-gradient-to-r from-gray-400 to-gray-600'
                    }`}></div>
                  )}
                  
                  {/* ドット模様のオーバーレイ */}
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}></div>
                  
                  {/* コンテンツ（募集中のみ表示） */}
                  <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
                    {!banner.image_url && (
                      <div>
                        <h3 className={`font-bold text-white drop-shadow-lg mb-2 ${isCenter ? 'text-xl' : isAdjacent ? 'text-base' : 'text-lg'}`}>
                          スポンサー募集中
                        </h3>
                        {isCenter && (
                          <div>
                            <span className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm hover:bg-opacity-30 transition-all">
                              詳細を見る →
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* スポンサー募集ラベル（中央・募集中のみ） */}
                  {isCenter && !banner.image_url && (
                    <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                      募集中
                    </div>
                  )}

                  {/* 右下のアイコン（中央・募集中のみ） */}
                  {isCenter && !banner.image_url && (
                    <div className="absolute bottom-3 right-3">
                      <svg 
                        className="w-5 h-5 text-white opacity-70" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* スライド方向インジケーターは非表示にして高さを節約 */}
      </div>

      {/* インジケーターはモバイルで視認性が低く高さを圧迫するため非表示 */}
    </section>
  );
};

export default SponsorBanner; 
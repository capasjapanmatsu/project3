import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SponsorBanner {
  id: string;
  title: string;
  description: string;
  image_url: string;
  website_url: string;
  banner_type: 'top' | 'sidebar' | 'footer';
  is_active: boolean;
  display_order: number;
  created_at: string;
}

// サイドバー募集中のダミーデータ
const sidebarRecruitmentBanners: SponsorBanner[] = [
  {
    id: 'sidebar-1',
    title: 'サイドバナー募集',
    description: 'ページ右側の目立つ位置で継続的な宣伝効果！',
    image_url: '',
    website_url: '/sponsor-application',
    banner_type: 'sidebar',
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'sidebar-2',
    title: 'ペット商品広告',
    description: '愛犬家に直接アピール！高い効果が期待できます。',
    image_url: '',
    website_url: '/sponsor-application',
    banner_type: 'sidebar',
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 'sidebar-3',
    title: 'サービス宣伝',
    description: '動物病院・ペットホテルなどのサービス宣伝に！',
    image_url: '',
    website_url: '/sponsor-application',
    banner_type: 'sidebar',
    is_active: true,
    display_order: 3,
    created_at: new Date().toISOString()
  }
];

interface SidebarBannerProps {
  banners?: SponsorBanner[];
}

export const SidebarBanner: React.FC<SidebarBannerProps> = ({ banners: propBanners }) => {
  const navigate = useNavigate();
  const [banners] = useState<SponsorBanner[]>(sidebarRecruitmentBanners);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // 自動スライド機能
  useEffect(() => {
    if (!isPlaying || banners.length <= 1) return;

    const slideInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000); // 4秒間隔

    return () => clearInterval(slideInterval);
  }, [isPlaying, banners.length]);

  // バナークリックハンドラー
  const handleBannerClick = useCallback(() => {
    navigate('/sponsor-application');
  }, [navigate]);

  // デバッグ用：バナー数をコンソールに出力
  console.log('SidebarBanner - banners.length:', banners.length);

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  // currentBannerが存在しない場合の安全チェック
  if (!currentBanner) {
    return null;
  }

  return (
    <aside 
      className="fixed right-4 top-1/2 transform -translate-y-1/2 z-30 hidden md:block"
      aria-label="サイドバナー広告"
    >
      <div className="w-48 space-y-4">
        {/* メインサイドバナー */}
        <div
          className="relative overflow-hidden rounded-lg shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
          onClick={handleBannerClick}
          onMouseEnter={() => setIsPlaying(false)}
          onMouseLeave={() => setIsPlaying(true)}
        >
          <div className="w-full h-80 bg-gradient-to-b from-purple-500 via-pink-500 to-red-500 relative">
            {/* ドット模様のオーバーレイ */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '15px 15px'
            }}></div>

            {/* コンテンツ */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 py-6">
              <div>
                <h3 className="text-lg font-bold text-white drop-shadow-lg mb-3 leading-tight">
                  {currentBanner.title}
                </h3>
                <p className="text-xs text-white opacity-90 drop-shadow-md mb-6 leading-relaxed">
                  {currentBanner.description}
                </p>
                <div>
                  <span className="bg-white bg-opacity-20 text-white px-3 py-2 rounded-full text-xs font-medium backdrop-blur-sm hover:bg-opacity-30 transition-all">
                    詳細を見る ↓
                  </span>
                </div>
              </div>
            </div>

            {/* スポンサー募集ラベル */}
            <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
              募集中
            </div>

            {/* 下向き矢印アイコン */}
            <div className="absolute bottom-3 right-3">
              <svg 
                className="w-4 h-4 text-white opacity-70" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>

        {/* 小さなインジケーター */}
        {banners.length > 1 && (
          <div className="flex justify-center space-x-1">
            {banners.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                  index === currentIndex ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default SidebarBanner; 
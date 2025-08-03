import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
    website_url: '/sponsor-application',
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'recruit-2',
    title: 'ペット関連サービス募集',
    description: 'ペット関連サービスの宣伝に最適！効果的な広告枠をご提供します。',
    image_url: '',
    website_url: '/sponsor-application',
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 'recruit-3',
    title: '愛犬家向け広告募集',
    description: '愛犬家コミュニティに向けて、あなたのサービスを紹介してください！',
    image_url: '',
    website_url: '/sponsor-application',
    is_active: true,
    display_order: 3,
    created_at: new Date().toISOString()
  },
  {
    id: 'recruit-4',
    title: 'ドッグフード・用品広告',
    description: 'ドッグフードやペット用品の広告掲載で売上アップを実現しましょう！',
    image_url: '',
    website_url: '/sponsor-application',
    is_active: true,
    display_order: 4,
    created_at: new Date().toISOString()
  },
  {
    id: 'recruit-5',
    title: '動物病院・サービス',
    description: '動物病院やペットケアサービスの宣伝で地域の愛犬家にアピール！',
    image_url: '',
    website_url: '/sponsor-application',
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
  const [banners] = useState<SponsorBanner[]>(recruitmentBanners);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  // 自動スライド機能（右から左へループ）
  useEffect(() => {
    if (!isPlaying || isHovering || banners.length <= 1) return;

    const slideInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 3000); // 3秒間隔

    return () => clearInterval(slideInterval);
  }, [isPlaying, isHovering, banners.length]);

  // バナークリックハンドラー（スポンサー募集画面へ遷移）
  const handleBannerClick = useCallback(() => {
    navigate('/sponsor-application');
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
      className="w-full mb-8 px-4 relative"
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
              // 隣接バナー（チラ見せ）- 間隔を狭める
              transform = `translateX(${position * 250}px)`;
              opacity = 0.7;
              scale = 0.85;
              zIndex = 15;
            } else if (isEdge) {
              // 端バナー（実際サイズで少し見える）- 縮小せず位置のみ調整
              transform = `translateX(${position * 280}px)`;
              opacity = 0.4;
              scale = 1.0;
              zIndex = 10;
            }

            return (
              <div
                key={`${banner.id}-${index}`}
                className={`absolute transition-all duration-700 ease-in-out cursor-pointer ${
                  isCenter ? 'w-96 h-28' : isAdjacent ? 'w-80 h-24' : 'w-96 h-28'
                }`}
                style={{
                  transform: `${transform} scale(${scale})`,
                  opacity,
                  zIndex
                }}
                onClick={handleBannerClick}
              >
                <div className="w-full h-full rounded-lg relative overflow-hidden shadow-lg">
                  {/* グラデーション背景 */}
                  <div className={`absolute inset-0 ${
                    position === 0 ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500' :
                    position === -1 || position === 1 ? 'bg-gradient-to-r from-green-500 via-blue-500 to-purple-500' :
                    'bg-gradient-to-r from-gray-400 to-gray-600'
                  }`}></div>
                  
                  {/* ドット模様のオーバーレイ */}
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}></div>
                  
                  {/* コンテンツ */}
                  <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
                    <div>
                      <h3 className={`font-bold text-white drop-shadow-lg mb-2 ${
                        isCenter ? 'text-xl' : isAdjacent ? 'text-base' : 'text-lg'
                      }`}>
                        {banner.title}
                      </h3>
                      {isCenter && (
                        <>
                          <p className="text-sm text-white opacity-90 drop-shadow-md max-w-sm mb-3">
                            {banner.description}
                          </p>
                          <div>
                            <span className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm hover:bg-opacity-30 transition-all">
                              詳細を見る →
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* スポンサー募集ラベル（中央のみ） */}
                  {isCenter && (
                    <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                      募集中
                    </div>
                  )}

                  {/* 右下のアイコン（中央のみ） */}
                  {isCenter && (
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

        {/* スライド方向インジケーター */}
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 pointer-events-none">
          <div className="flex items-center space-x-1 text-white opacity-50">
            <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-4 h-4 animate-pulse" style={{ animationDelay: '0.2s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* 現在位置表示（小さく） */}
      <div className="flex justify-center mt-3">
        <div className="flex space-x-1">
          {banners.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SponsorBanner; 
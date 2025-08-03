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

// フッターバナー募集中のダミーデータ
const footerRecruitmentBanners: SponsorBanner[] = [
  {
    id: 'footer-1',
    title: 'フッターバナー募集中',
    description: 'ページ下部で全てのユーザーにリーチ！コスパ抜群の広告枠です。',
    image_url: '',
    website_url: '/sponsor-application',
    banner_type: 'footer',
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'footer-2',
    title: '地域サービス広告',
    description: '動物病院・ペットショップ・トリミングサロンなど地域サービスの宣伝に最適！',
    image_url: '',
    website_url: '/sponsor-application',
    banner_type: 'footer',
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 'footer-3',
    title: 'ペット用品・フード広告',
    description: 'ドッグフード・おやつ・おもちゃなどペット用品の宣伝で売上アップ！',
    image_url: '',
    website_url: '/sponsor-application',
    banner_type: 'footer',
    is_active: true,
    display_order: 3,
    created_at: new Date().toISOString()
  }
];

interface FooterBannerProps {
  banners?: SponsorBanner[];
}

export const FooterBanner: React.FC<FooterBannerProps> = ({ banners: propBanners }) => {
  const navigate = useNavigate();
  const [banners] = useState<SponsorBanner[]>(footerRecruitmentBanners);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  // 自動スライド機能
  useEffect(() => {
    if (!isPlaying || isHovering || banners.length <= 1) return;

    const slideInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // 5秒間隔

    return () => clearInterval(slideInterval);
  }, [isPlaying, isHovering, banners.length]);

  // バナークリックハンドラー
  const handleBannerClick = useCallback(() => {
    navigate('/sponsor-application');
  }, [navigate]);

  // デバッグ用：バナー数をコンソールに出力
  console.log('FooterBanner - banners.length:', banners.length);
  console.log('FooterBanner - Component is rendering!');

  // デバッグ用：強制表示（一時的）
  // if (banners.length === 0) {
  //   return null;
  // }

  const currentBanner = banners[currentIndex] || {
    id: 'debug-footer-banner',
    title: 'デバッグ用フッターバナー',
    description: 'この表示が見えている場合、フッターバナーは正常に動作しています。',
    image_url: '',
    website_url: '/sponsor-application',
    banner_type: 'footer' as const,
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString()
  };

  return (
    <section 
      className="w-full mt-12 mb-4 px-4"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      aria-label="フッターバナー広告"
      style={{ border: '3px solid blue' }} // デバッグ用：見やすくするため
    >
      {/* フッターバナーコンテナ */}
      <div className="max-w-6xl mx-auto">
        <div
          className="relative overflow-hidden rounded-lg shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
          onClick={handleBannerClick}
        >
          <div className="w-full h-24 bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 relative">
            {/* ドット模様のオーバーレイ */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}></div>

            {/* コンテンツ */}
            <div className="relative z-10 h-full flex items-center justify-between px-8">
              {/* 左側：テキストコンテンツ */}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white drop-shadow-lg mb-1">
                  {currentBanner.title}
                </h3>
                <p className="text-sm text-white opacity-90 drop-shadow-md">
                  {currentBanner.description}
                </p>
              </div>

              {/* 右側：CTA */}
              <div className="flex items-center space-x-4">
                <span className="bg-white bg-opacity-20 text-white px-6 py-2 rounded-full text-sm font-medium backdrop-blur-sm hover:bg-opacity-30 transition-all">
                  広告掲載の詳細 →
                </span>
                
                {/* 右向き矢印アイコン */}
                <svg 
                  className="w-6 h-6 text-white opacity-70" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>

            {/* スポンサー募集ラベル */}
            <div className="absolute top-2 left-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
              フッター募集中
            </div>
          </div>
        </div>

        {/* インジケーター */}
        {banners.length > 1 && (
          <div className="flex justify-center mt-3">
            <div className="flex space-x-1">
              {banners.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    index === currentIndex ? 'bg-teal-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FooterBanner; 
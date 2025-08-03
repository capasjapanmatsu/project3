import React, { useCallback, useEffect, useState } from 'react';

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

interface SponsorBannerProps {
  banners?: SponsorBanner[];
}

// テスト用のサンプルデータ
const sampleBanners: SponsorBanner[] = [
  {
    id: '1',
    title: 'ドッグフード専門店 ワンコマート',
    description: 'プレミアムドッグフードが最大30%OFF！愛犬の健康を考えた厳選商品をお届け',
    image_url: 'https://via.placeholder.com/800x200/4F46E5/ffffff?text=ワンコマート',
    website_url: 'https://example.com/wanko-mart',
    is_active: true,
    display_order: 1,
    created_at: '2025-01-31'
  },
  {
    id: '2',
    title: 'ペットホテル わんわんリゾート',
    description: '愛犬も飼い主も安心！24時間スタッフ常駐のペットホテル。初回利用20%OFF',
    image_url: 'https://via.placeholder.com/800x200/059669/ffffff?text=わんわんリゾート',
    website_url: 'https://example.com/wanwan-resort',
    is_active: true,
    display_order: 2,
    created_at: '2025-01-31'
  },
  {
    id: '3',
    title: 'ドッグトレーニング教室 パピーアカデミー',
    description: 'プロトレーナーによる個別指導！しつけの悩みを解決します。無料体験実施中',
    image_url: 'https://via.placeholder.com/800x200/DC2626/ffffff?text=パピーアカデミー',
    website_url: 'https://example.com/puppy-academy',
    is_active: true,
    display_order: 3,
    created_at: '2025-01-31'
  },
  {
    id: '4',
    title: 'ペット用品専門店 ドギーライフ',
    description: 'おしゃれなペット用品からケア用品まで！新商品続々入荷中',
    image_url: 'https://via.placeholder.com/800x200/7C3AED/ffffff?text=ドギーライフ',
    website_url: 'https://example.com/doggy-life',
    is_active: true,
    display_order: 4,
    created_at: '2025-01-31'
  },
  {
    id: '5',
    title: '動物病院 ハッピーアニマルクリニック',
    description: '愛犬の健康を守る信頼のクリニック。予防接種から緊急診療まで対応',
    image_url: 'https://via.placeholder.com/800x200/EA580C/ffffff?text=ハッピーアニマルクリニック',
    website_url: 'https://example.com/happy-animal',
    is_active: true,
    display_order: 5,
    created_at: '2025-01-31'
  }
];

export const SponsorBanner: React.FC<SponsorBannerProps> = ({ banners = sampleBanners }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  // アクティブなバナーのみをフィルタリング
  const activeBanners = banners.filter(banner => banner.is_active);

  // 自動スライド機能
  useEffect(() => {
    if (!isPlaying || isHovering || activeBanners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 4000); // 4秒間隔

    return () => clearInterval(interval);
  }, [isPlaying, isHovering, activeBanners.length]);

  // バナークリックハンドラー
  const handleBannerClick = useCallback((url: string) => {
    // 新しいタブでWebサイトを開く
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  // 再生/一時停止の切り替え
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // 手動でスライド変更
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  if (activeBanners.length === 0) {
    return null;
  }

  const currentBanner = activeBanners[currentIndex];

  return (
    <section 
      className="w-full bg-white rounded-lg shadow-lg overflow-hidden mb-8"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      aria-label="スポンサーバナー"
    >
      {/* メインバナー */}
      <div 
        className="relative h-48 cursor-pointer transform transition-transform duration-300 hover:scale-[1.02]"
        onClick={() => handleBannerClick(currentBanner.website_url)}
        role="button"
        tabIndex={0}
        aria-label={`${currentBanner.title} - 新しいタブで開く`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBannerClick(currentBanner.website_url);
          }
        }}
      >
        {/* バナー画像 */}
        <div 
          className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold"
          style={{
            backgroundImage: `url(${currentBanner.image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* オーバーレイ */}
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          
          {/* コンテンツ */}
          <div className="relative z-10 text-center px-6">
            <h3 className="text-2xl font-bold mb-2 drop-shadow-lg">
              {currentBanner.title}
            </h3>
            <p className="text-sm opacity-90 drop-shadow-md">
              {currentBanner.description}
            </p>
          </div>

          {/* 外部リンクアイコン */}
          <div className="absolute top-4 right-4 z-10">
            <svg 
              className="w-5 h-5 text-white opacity-70" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </div>
      </div>

      {/* コントロールバー */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
        {/* インジケーター */}
        <div className="flex space-x-2">
          {activeBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                index === currentIndex ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`バナー ${index + 1} に移動`}
            />
          ))}
        </div>

        {/* 再生/一時停止ボタン */}
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-500">
            {currentIndex + 1} / {activeBanners.length}
          </span>
          <button
            onClick={togglePlayPause}
            className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
            aria-label={isPlaying ? 'スライドを一時停止' : 'スライドを再生'}
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* スポンサー表示ラベル */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
        スポンサー
      </div>
    </section>
  );
};

export default SponsorBanner; 
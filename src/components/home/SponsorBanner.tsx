import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // 自動スライド機能
  useEffect(() => {
    if (!isPlaying || isHovering || banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // 5秒間隔

    return () => clearInterval(interval);
  }, [isPlaying, isHovering, banners.length]);

  // スライド移動関数
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // 前のスライドに移動
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // 次のスライドに移動
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  // バナークリックハンドラー（スポンサー募集画面へ遷移）
  const handleBannerClick = useCallback(() => {
    navigate('/sponsor-application');
  }, [navigate]);

  // 再生/一時停止の切り替え
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // スワイプ・ドラッグ操作のハンドラー
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX);
    setScrollLeft(0);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = (x - startX) * 2;
    setScrollLeft(walk);
  }, [isDragging, startX]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // スワイプの閾値を設定（50px以上で次/前に移動）
    if (scrollLeft > 50) {
      goToPrevious();
    } else if (scrollLeft < -50) {
      goToNext();
    }
    setScrollLeft(0);
  }, [isDragging, scrollLeft, goToPrevious, goToNext]);

  // タッチイベント（スマホ対応）
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX);
    setScrollLeft(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX;
    const walk = (x - startX) * 2;
    setScrollLeft(walk);
  }, [isDragging, startX]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (scrollLeft > 50) {
      goToPrevious();
    } else if (scrollLeft < -50) {
      goToNext();
    }
    setScrollLeft(0);
  }, [isDragging, scrollLeft, goToPrevious, goToNext]);

  if (banners.length === 0) {
    return null;
  }

  const getPeekIndex = (offset: number) => {
    return (currentIndex + offset + banners.length) % banners.length;
  };

  const currentBanner = banners[currentIndex];
  const prevBanner = banners[getPeekIndex(-1)];
  const nextBanner = banners[getPeekIndex(1)];

  // currentBannerが存在しない場合のフォールバック
  if (!currentBanner) {
    return null;
  }

  return (
    <section 
      className="w-full mb-8 px-4 relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      aria-label="スポンサー募集カルーセル"
    >
      {/* カルーセルコンテナ */}
      <div 
        ref={carouselRef}
        className="relative flex items-center justify-center space-x-4 overflow-hidden cursor-grab select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {/* 左矢印ボタン */}
        <button
          onClick={goToPrevious}
          className="absolute left-2 z-20 w-10 h-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
          aria-label="前のスライドへ"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>

        {/* 左のチラ見せスライド */}
        <div 
          className="hidden md:block w-64 h-32 opacity-60 transform scale-90 cursor-pointer transition-all duration-300 hover:opacity-80 hover:scale-95 rounded-lg overflow-hidden"
          onClick={() => goToSlide(getPeekIndex(-1))}
          style={{
            transform: `scale(0.9) translateX(${scrollLeft * 0.3}px)`,
          }}
        >
          <div className="h-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center text-white rounded-lg">
            <div className="text-center p-4">
              <h4 className="text-sm font-bold mb-1">{prevBanner.title}</h4>
              <p className="text-xs opacity-90 line-clamp-2">{prevBanner.description}</p>
            </div>
          </div>
        </div>

        {/* メインスライド（中央） */}
        <div 
          className="flex-1 max-w-3xl h-48 cursor-pointer transform transition-all duration-500 hover:scale-[1.02] bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg relative overflow-hidden shadow-xl"
          onClick={handleBannerClick}
          role="button"
          tabIndex={0}
          aria-label={`${currentBanner.title} - スポンサー申し込みページへ`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleBannerClick();
            }
          }}
          style={{
            transform: `translateX(${scrollLeft * 0.1}px)`,
          }}
        >
          {/* グラデーション背景 */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          {/* ドット模様のオーバーレイ */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}></div>
          
          {/* コンテンツ */}
          <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
            <div>
              <h3 className="text-3xl font-bold mb-3 text-white drop-shadow-lg">
                {currentBanner.title}
              </h3>
              <p className="text-base text-white opacity-90 drop-shadow-md max-w-2xl">
                {currentBanner.description}
              </p>
              <div className="mt-6">
                <span className="bg-white bg-opacity-20 text-white px-6 py-3 rounded-full text-base font-medium backdrop-blur-sm hover:bg-opacity-30 transition-all">
                  詳細を見る →
                </span>
              </div>
            </div>
          </div>

          {/* スポンサー募集ラベル */}
          <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-bold">
            募集中
          </div>

          {/* 右下のアイコン */}
          <div className="absolute bottom-4 right-4">
            <svg 
              className="w-8 h-8 text-white opacity-70" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </div>

        {/* 右のチラ見せスライド */}
        <div 
          className="hidden md:block w-64 h-32 opacity-60 transform scale-90 cursor-pointer transition-all duration-300 hover:opacity-80 hover:scale-95 rounded-lg overflow-hidden"
          onClick={() => goToSlide(getPeekIndex(1))}
          style={{
            transform: `scale(0.9) translateX(${scrollLeft * -0.3}px)`,
          }}
        >
          <div className="h-full bg-gradient-to-r from-green-400 to-blue-600 flex items-center justify-center text-white rounded-lg">
            <div className="text-center p-4">
              <h4 className="text-sm font-bold mb-1">{nextBanner.title}</h4>
              <p className="text-xs opacity-90 line-clamp-2">{nextBanner.description}</p>
            </div>
          </div>
        </div>

        {/* 右矢印ボタン */}
        <button
          onClick={goToNext}
          className="absolute right-2 z-20 w-10 h-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
          aria-label="次のスライドへ"
        >
          <ChevronRight className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* コントロールバー */}
      <div className="mt-6 flex items-center justify-center space-x-6">
        {/* インジケーター */}
        <div className="flex space-x-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentIndex 
                  ? 'bg-blue-600 scale-125' 
                  : 'bg-gray-300 hover:bg-gray-400 hover:scale-110'
              }`}
              aria-label={`スライド ${index + 1} に移動`}
            />
          ))}
        </div>

        {/* 再生/一時停止ボタン */}
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500 font-medium">
            {currentIndex + 1} / {banners.length}
          </span>
          <button
            onClick={togglePlayPause}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={isPlaying ? 'スライドを一時停止' : 'スライドを再生'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* プログレスバー（自動再生時） */}
      {!isHovering && isPlaying && (
        <div className="mt-4 w-full max-w-3xl mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-600 h-1 rounded-full transition-all duration-100"
              style={{
                width: '0%',
                animation: 'progress-bar 5s linear infinite'
              }}
            ></div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SponsorBanner; 
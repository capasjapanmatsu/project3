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
  const [nextIndex, setNextIndex] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showNext, setShowNext] = useState(false);

  // アニメーション付きスライド機能（右から左へ）
  useEffect(() => {
    if (!isPlaying || isHovering || banners.length <= 1) return;

    const slideInterval = setInterval(() => {
      // アニメーション開始
      setIsAnimating(true);
      setShowNext(true);
      
      // 次のバナーインデックスを計算
      const next = (currentIndex + 1) % banners.length;
      setNextIndex(next);
      
      // アニメーション完了後に状態更新
      setTimeout(() => {
        setCurrentIndex(next);
        setNextIndex((next + 1) % banners.length);
        setIsAnimating(false);
        setShowNext(false);
      }, 800); // アニメーション時間
      
    }, 5000); // 5秒間隔

    return () => clearInterval(slideInterval);
  }, [isPlaying, isHovering, banners.length, currentIndex]);

  // バナークリックハンドラー（スポンサー募集画面へ遷移）
  const handleBannerClick = useCallback(() => {
    navigate('/sponsor-application');
  }, [navigate]);

  // 再生/一時停止の切り替え
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // 手動でスライド変更
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setNextIndex((index + 1) % banners.length);
    setIsAnimating(false);
    setShowNext(false);
  }, [banners.length]);

  // 前のスライドに移動
  const goToPrevious = useCallback(() => {
    const prevIndex = (currentIndex - 1 + banners.length) % banners.length;
    setCurrentIndex(prevIndex);
    setNextIndex((prevIndex + 1) % banners.length);
  }, [currentIndex, banners.length]);

  // 次のスライドに移動
  const goToNext = useCallback(() => {
    const nextIdx = (currentIndex + 1) % banners.length;
    setCurrentIndex(nextIdx);
    setNextIndex((nextIdx + 1) % banners.length);
  }, [currentIndex, banners.length]);

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];
  const nextBanner = banners[nextIndex];

  // currentBannerが存在しない場合のフォールバック
  if (!currentBanner) {
    return null;
  }

  return (
    <section 
      className="w-full mb-8 px-4 relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      aria-label="スポンサー募集バナー"
    >
      {/* バナーコンテナ - 中央のバナーと左右のチラ見せ */}
      <div className="flex items-center justify-center space-x-4 overflow-hidden">
        {/* 左のチラ見せバナー */}
        <div className="hidden md:block w-20 h-32 opacity-30 bg-gradient-to-r from-gray-400 to-gray-500 rounded-lg flex-shrink-0">
          <div className="h-full flex items-center justify-center">
            <div className="text-white text-xs text-center">
              <div className="font-bold">スポンサー</div>
              <div>募集中</div>
            </div>
          </div>
        </div>

        {/* メインバナーコンテナ */}
        <div className="flex-1 max-w-2xl h-40 relative overflow-hidden rounded-lg">
          {/* 現在のバナー */}
          <div 
            className="absolute inset-0 cursor-pointer transform transition-all duration-300 hover:scale-[1.02] bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg relative overflow-hidden"
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
              transform: isAnimating ? 'translateX(-100%)' : 'translateX(0)',
              transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
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
                <h3 className="text-2xl font-bold mb-2 text-white drop-shadow-lg">
                  {currentBanner.title}
                </h3>
                <p className="text-sm text-white opacity-90 drop-shadow-md max-w-md">
                  {currentBanner.description}
                </p>
                <div className="mt-4">
                  <span className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                    詳細を見る →
                  </span>
                </div>
              </div>
            </div>

            {/* スポンサー募集ラベル */}
            <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
              募集中
            </div>

            {/* 右下のアイコン */}
            <div className="absolute bottom-3 right-3">
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

          {/* 次のバナー（アニメーション中のみ表示）- 右から左へスライドイン */}
          {showNext && nextBanner && (
            <div 
              className="absolute inset-0 cursor-pointer transform bg-gradient-to-r from-green-500 to-blue-600 rounded-lg relative overflow-hidden"
              onClick={handleBannerClick}
              style={{
                transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* グラデーション背景（次のバナー用） */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"></div>
              
              {/* ドット模様のオーバーレイ */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}></div>
              
              {/* コンテンツ */}
              <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2 text-white drop-shadow-lg">
                    {nextBanner.title}
                  </h3>
                  <p className="text-sm text-white opacity-90 drop-shadow-md max-w-md">
                    {nextBanner.description}
                  </p>
                  <div className="mt-4">
                    <span className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                      詳細を見る →
                    </span>
                  </div>
                </div>
              </div>

              {/* スポンサー募集ラベル */}
              <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                募集中
              </div>

              {/* 右下のアイコン */}
              <div className="absolute bottom-3 right-3">
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
          )}

          {/* スライド方向インジケーター（アニメーション中のみ） */}
          {isAnimating && (
            <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-20">
              <div className="flex items-center space-x-1 text-white">
                <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <svg className="w-4 h-4 animate-bounce" style={{ animationDelay: '0.1s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <svg className="w-4 h-4 animate-bounce" style={{ animationDelay: '0.2s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* 右のチラ見せバナー */}
        <div className="hidden md:block w-20 h-32 opacity-30 bg-gradient-to-r from-gray-500 to-gray-400 rounded-lg flex-shrink-0">
          <div className="h-full flex items-center justify-center">
            <div className="text-white text-xs text-center">
              <div className="font-bold">スポンサー</div>
              <div>募集中</div>
            </div>
          </div>
        </div>
      </div>

      {/* コントロールバー */}
      <div className="mt-4 flex items-center justify-center space-x-4">
        {/* インジケーター */}
        <div className="flex space-x-2">
          {banners.map((_, index) => (
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
            {currentIndex + 1} / {banners.length}
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
    </section>
  );
};

export default SponsorBanner; 
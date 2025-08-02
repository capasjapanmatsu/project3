import React, { useCallback, useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [imageOpacity, setImageOpacity] = useState(0.3);
  const [textCharacters, setTextCharacters] = useState<boolean[]>([]);

  const message = 'さぁ　ワンちゃんと冒険に出かけよう！';

  // 文字ごとのふわっと浮上アニメーション
  const animateText = useCallback(() => {
    const chars = new Array(message.length).fill(false);
    setTextCharacters(chars);

    // 一文字ずつ順番にふわっと表示
    message.split('').forEach((_, index) => {
      setTimeout(() => {
        setTextCharacters(prev => {
          const newChars = [...prev];
          newChars[index] = true;
          return newChars;
        });
      }, index * 120); // 120ms間隔でゆっくり表示
    });

    // 全文字表示完了後、自動終了
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800); // フェードアウト後に完了
    }, message.length * 120 + 2000); // 文字表示完了 + 2秒待機
  }, [message, onComplete]);

  // 画像の薄い→濃いアニメーション
  useEffect(() => {
    const imageAnimation = () => {
      let opacity = 0.3;
      const fadeIn = () => {
        if (opacity < 1.0) {
          opacity += 0.015;
          setImageOpacity(opacity);
          requestAnimationFrame(fadeIn);
        } else {
          // 画像が完全に表示されたら文字アニメーション開始
          setTimeout(animateText, 500);
        }
      };
      fadeIn();
    };

    // プリロード処理（裏で重要なルートを準備）
    const preloadRoutes = async () => {
      try {
        await Promise.all([
          import('../pages/Login'),
          import('../pages/Home'),
          import('../context/AuthContext'),
        ]);
        console.log('🚀 主要コンポーネントのプリロード完了');
      } catch (error) {
        console.warn('プリロードエラー:', error);
      }
    };

    setTimeout(imageAnimation, 800);
    void preloadRoutes();
  }, [animateText]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] transition-opacity duration-800 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'linear-gradient(135deg, #E8F4FD 0%, #F0F8FF 25%, #FFF8E1 50%, #F3E5F5 75%, #E1F5FE 100%)'
      }}
    >
      {/* Google Fonts読み込み */}
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@300;400;500&display=swap');`}
      </style>

      {/* ブランドロゴ（上部中央） */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
        <h1 className="text-3xl font-medium text-blue-400 opacity-80" style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}>
          ドッグパークJP
        </h1>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex flex-col items-center justify-center h-full space-y-12">
        {/* ワンちゃん画像（横幅いっぱい） */}
        <div className="w-full flex justify-center relative">
          <img
            src="/images/splash-dog-running.jpg"
            alt="走るワンちゃん"
            className="max-w-full h-64 object-contain transition-opacity duration-1000"
            style={{ 
              opacity: imageOpacity,
              filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.1))'
            }}
            onError={(e) => {
              // 画像が見つからない場合は絵文字を表示
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLElement).parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="text-9xl animate-bounce opacity-80">🐕</div>
                `;
              }
            }}
          />
          
          {/* やさしい光の効果 */}
          <div className="absolute inset-0 bg-gradient-radial from-white/20 via-transparent to-transparent rounded-full blur-3xl opacity-50" />
        </div>

        {/* ふわっと浮上するメッセージ */}
        <div className="text-center px-8 relative">
          {/* テキスト背景（視認性向上） */}
          <div className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-3xl shadow-lg" />
          
          <h2 
            className="relative text-4xl font-medium text-gray-700 leading-relaxed tracking-wide"
            style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}
          >
            {message.split('').map((char, index) => (
              <span
                key={index}
                className={`inline-block transition-all duration-700 ease-out ${
                  textCharacters[index] 
                    ? 'opacity-100 translate-y-0 scale-100' 
                    : 'opacity-0 translate-y-4 scale-95'
                }`}
                style={{
                  textShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transitionDelay: `${index * 50}ms`
                }}
              >
                {char === '　' ? '\u00A0' : char}
              </span>
            ))}
          </h2>
        </div>

        {/* やさしいローディングインジケーター */}
        <div className="flex items-center space-x-3 text-blue-300 opacity-70">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-gradient-to-r from-blue-300 to-indigo-300 rounded-full animate-pulse"
              style={{ 
                animationDelay: `${i * 0.3}s`,
                animationDuration: '1.5s'
              }}
            />
          ))}
          <span className="ml-4 text-lg font-light" style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}>
            準備中...
          </span>
        </div>
      </div>

      {/* バージョン情報（右下、やさしく） */}
      <div className="absolute bottom-6 right-6 text-sm text-blue-300 opacity-60" style={{ fontFamily: 'Zen Maru Gothic, sans-serif' }}>
        v1.0.0
      </div>

      {/* 背景装飾（やさしいパーティクル効果） */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen; 
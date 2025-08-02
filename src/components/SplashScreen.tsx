import React, { useCallback, useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [dogScale, setDogScale] = useState(0.3);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const fullMessage = 'さぁ　ワンちゃんと冒険に出かけよう！';

  // タイピングアニメーション
  const typeMessage = useCallback(() => {
    setIsTyping(true);
    let index = 0;
    
    const typeChar = () => {
      if (index < fullMessage.length) {
        setMessageText(fullMessage.slice(0, index + 1));
        index++;
        setTimeout(typeChar, 80); // 80ms間隔でタイピング
      } else {
        setIsTyping(false);
        // タイピング完了後、少し待ってから終了
        setTimeout(() => {
          setIsVisible(false);
          setTimeout(onComplete, 500); // フェードアウト後に完了
        }, 1500);
      }
    };
    
    typeChar();
  }, [fullMessage, onComplete]);

  // ワンちゃんの拡大アニメーション
  useEffect(() => {
    const scaleAnimation = () => {
      let scale = 0.3;
      const scaleStep = () => {
        if (scale < 1.0) {
          scale += 0.02;
          setDogScale(scale);
          requestAnimationFrame(scaleStep);
        } else {
          // 拡大完了後、タイピング開始
          setTimeout(typeMessage, 800);
        }
      };
      scaleStep();
    };

    // 初期表示後すぐにアニメーション開始
    setTimeout(scaleAnimation, 500);

    // プリロード処理（裏で重要なルートを準備）
    const preloadRoutes = async () => {
      try {
        // 重要なコンポーネントを動的インポートでプリロード
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

    void preloadRoutes();
  }, [typeMessage]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* ブランドロゴ（小さく上部に表示） */}
      <div className="absolute top-8 left-8">
        <h1 className="text-2xl font-bold text-blue-600">ドッグパークJP</h1>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex flex-col items-center space-y-8">
        {/* ワンちゃんアニメーション */}
        <div className="relative">
          <img
            src="/images/splash-dog-running.jpg"
            alt="走るワンちゃん"
            className="w-32 h-32 object-contain transition-transform duration-100 ease-out"
            style={{ 
              transform: `scale(${dogScale})`,
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))'
            }}
            onError={(e) => {
              // 画像が見つからない場合は絵文字を表示
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLElement).parentElement;
              if (parent) {
                parent.innerHTML = `<div class="text-8xl animate-bounce">🐕</div>`;
              }
            }}
          />
          
          {/* 走る効果のパーティクル */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* タイピングメッセージ */}
        <div className="text-center min-h-[60px] flex items-center">
          <h2 className="text-3xl font-bold text-gray-800 tracking-wide">
            {messageText}
            {isTyping && (
              <span className="animate-pulse text-blue-500 ml-1">|</span>
            )}
          </h2>
        </div>

        {/* ローディングインジケーター */}
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <span className="ml-2 text-sm">準備中...</span>
        </div>
      </div>

      {/* バージョン情報（右下） */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500">
        v1.0.0
      </div>
    </div>
  );
};

export default SplashScreen; 
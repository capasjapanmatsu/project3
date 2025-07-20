import React, { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { getDogHonorific } from '../dashboard/DogCard';
import type { Dog } from '../../types';
import { useState } from 'react';

interface MarqueeDogsSectionProps {
  recentDogs: Dog[];
  isOffline: boolean;
  isLoading?: boolean;
}

export const MarqueeDogsSection: React.FC<MarqueeDogsSectionProps> = React.memo(({
  recentDogs,
  isOffline,
  isLoading = false,
}) => {
  // デバッグ情報
  console.log('MarqueeDogsSection - recentDogs:', recentDogs);
  console.log('MarqueeDogsSection - isOffline:', isOffline);
  console.log('MarqueeDogsSection - isLoading:', isLoading);
  console.log('MarqueeDogsSection - recentDogs.length:', recentDogs.length);
  
  // データを重複させて継続的なスクロール効果を作成 (メモ化)
  const duplicatedDogs = useMemo(() => [...recentDogs, ...recentDogs], [recentDogs]);
  
  // 犬のデータがあるかチェック (メモ化)
  const hasRecentDogs = useMemo(() => Array.isArray(recentDogs) && recentDogs.length > 0, [recentDogs]);

  return (
    <section className="bg-gray-50 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <PawPrint className="w-6 h-6 text-blue-600 mr-2" />
            最近仲間入りしました！
          </h2>
          <div className="absolute -top-10 -left-16">
            <div className="bg-yellow-100 rounded-full px-4 py-2 text-yellow-800 font-bold transform -rotate-12">
              New
            </div>
          </div>
        </div>
      </div>
      
      <div className="overflow-hidden w-full relative" style={{height: 140}}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">新しい仲間を探しています...</span>
            </div>
          </div>
        ) : hasRecentDogs ? (
          <div
            className="flex items-center whitespace-nowrap"
            style={{
              width: 'max-content',
              animation: 'marquee 45s linear infinite',
              willChange: 'transform',
              transform: 'translateZ(0)', // GPUアクセラレーション
            }}
          >
            {duplicatedDogs.map((dog, index) => (
              <DogCard key={`${dog.id}-${index}`} dog={dog} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-center">
            <div>
              <PawPrint className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="text-lg font-medium">
                {isOffline ? 'オフライン中です' : '新しい仲間を募集中！'}
              </p>
              <p className="text-sm mt-1">
                {isOffline ? '接続を確認してください' : 'ワンちゃんの登録をお待ちしています'}
              </p>
              {!isOffline && (
                <p className="text-xs mt-2 text-gray-400">
                  登録されたワンちゃんがいません
                </p>
              )}
              {/* デバッグ情報 */}
              <div className="text-xs text-gray-400 mt-2">
                Debug: dogs={recentDogs?.length || 0}, offline={isOffline ? 'true' : 'false'}, loading={isLoading ? 'true' : 'false'}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <style>
        {`
          @keyframes marquee {
            0% {
              transform: translateX(0) translateZ(0);
            }
            100% {
              transform: translateX(-50%) translateZ(0);
            }
          }
          
          /* GPUアクセラレーション用の最適化 */
          .marquee-container {
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            -moz-backface-visibility: hidden;
            -ms-backface-visibility: hidden;
            -webkit-transform: translateZ(0);
            -moz-transform: translateZ(0);
            -ms-transform: translateZ(0);
            transform: translateZ(0);
          }
        `}
      </style>
    </section>
  );
});

// 犬のカードコンポーネント (メモ化)
const DogCard = React.memo(({ dog }: { dog: Dog }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const handleImageLoad = () => {
    setImageLoaded(true);
  };
  
  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };
  
  // 画像URLの最適化（サイズを制限）
  const optimizedImageUrl = useMemo(() => {
    if (!dog.image_url) return null;
    
    // Supabaseの画像URLの場合、サイズパラメータを追加
    if (dog.image_url.includes('supabase')) {
      return `${dog.image_url}?width=80&height=80&quality=80`;
    }
    
    return dog.image_url;
  }, [dog.image_url]);
  
  // 画像のpreload
  useEffect(() => {
    if (optimizedImageUrl) {
      const img = new Image();
      img.src = optimizedImageUrl;
    }
  }, [optimizedImageUrl]);
  
  return (
    <div className="inline-block mx-4 text-center" style={{ width: 100, flexShrink: 0 }}>
      <div className="relative w-20 h-20 mx-auto mb-2 bg-gray-200 rounded-full overflow-hidden">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {optimizedImageUrl && !imageError ? (
          <img
            src={optimizedImageUrl}
            alt={dog.name}
            className={`w-full h-full object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="eager"
            decoding="sync"
            width={80}
            height={80}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
            🐕
          </div>
        )}
      </div>
      <div className="text-xs text-gray-600 truncate font-medium">{dog.name}</div>
      <div className="text-xs text-gray-500 truncate">{dog.breed}</div>
    </div>
  );
});

MarqueeDogsSection.displayName = 'MarqueeDogsSection';
DogCard.displayName = 'DogCard';

export default MarqueeDogsSection; 

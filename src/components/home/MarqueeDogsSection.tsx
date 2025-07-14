import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { getDogHonorific } from '../dashboard/DogCard';
import type { Dog } from '../../types';

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
              animation: 'marquee 60s linear infinite',
              willChange: 'transform'
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
      
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        /* レスポンシブ対応 */
        @media (max-width: 768px) {
          .marquee-container {
            animation-duration: 30s;
          }
        }
        
        /* アニメーション削減設定 */
        @media (prefers-reduced-motion: reduce) {
          .marquee-container {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
});

// 犬のカードコンポーネント (メモ化)
const DogCard: React.FC<{ dog: Dog }> = React.memo(({ dog }) => {
  return (
    <Link
      to={`/dog/${dog.id}`}
      className="inline-block text-center mx-4 flex-shrink-0 cursor-pointer hover:transform hover:scale-105 transition-transform duration-200 group"
      style={{width: 80}}
    >
      <div className="flex justify-center mb-2">
        <div className="relative">
          <img
            src={dog.image_url || 'https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&cs=tinysrgb&w=300'}
            alt={dog.name}
            width={56}
            height={56}
            loading="lazy"
            className="rounded-full border-2 border-transparent group-hover:border-blue-400 transition-all duration-200"
            style={{ width: 56, height: 56, objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.src = 'https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&cs=tinysrgb&w=300';
            }}
          />
          <div className="absolute inset-0 rounded-full bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
        </div>
      </div>
      <p className="font-medium text-gray-900 text-sm group-hover:text-blue-600 transition-colors duration-200">
        {dog.name}{getDogHonorific(dog.gender)}
      </p>
    </Link>
  );
});

MarqueeDogsSection.displayName = 'MarqueeDogsSection';
DogCard.displayName = 'DogCard';

export default MarqueeDogsSection; 
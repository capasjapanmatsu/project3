import React from 'react';
import { Link } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { getDogHonorific } from '../dashboard/DogCard';
import type { Dog } from '../../types';

interface MarqueeDogsSectionProps {
  recentDogs: Dog[];
  isOffline: boolean;
}

export const MarqueeDogsSection: React.FC<MarqueeDogsSectionProps> = ({
  recentDogs,
  isOffline,
}) => {
  // データを重複させて継続的なスクロール効果を作成
  const duplicatedDogs = [...recentDogs, ...recentDogs];

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
        <div
          className="flex items-center whitespace-nowrap"
          style={{
            width: 'max-content',
            animation: 'marquee 60s linear infinite',
            willChange: 'transform'
          }}
        >
          {(() => {
            if (!isOffline && recentDogs.length > 0) {
              return (
                <>
                  {duplicatedDogs.map((dog, index) => (
                    <Link
                      key={`${dog.id}-${index}`}
                      to={`/dog/${dog.id}`}
                      className="inline-block text-center mx-4 flex-shrink-0 cursor-pointer hover:transform hover:scale-105 transition-transform duration-200 group"
                      style={{width: 80}}
                    >
                      <div className="flex justify-center mb-2">
                        <div className="relative">
                          <img
                            src={dog.image_url}
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
                  ))}
                </>
              );
            } else {
              return (
                <div className="text-gray-500 text-center w-full py-8">
                  {isOffline ? 'オフライン中です' : 'まだ登録がありません'}
                </div>
              );
            }
          })()}
        </div>
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
          .marquee-container .flex {
            animation-duration: 80s !important;
          }
        }
        
        @media (max-width: 480px) {
          .marquee-container .flex {
            animation-duration: 100s !important;
          }
        }
        
        /* アニメーション最適化 */
        .marquee-container {
          contain: layout style paint;
        }
      `}</style>
    </section>
  );
};

export default MarqueeDogsSection; 
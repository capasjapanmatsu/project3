import React from 'react';
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
      
      <div className="overflow-hidden w-full" style={{height: 140}}>
        <div
          className="flex items-center animate-marquee"
          style={{
            width: 'max-content',
            animation: 'marquee 24s linear infinite',
          }}
        >
          {(() => {
            if (!isOffline && recentDogs.length > 0) {
              return (
                <>
                  {recentDogs.map((dog, index) => (
                    <div key={index} className="text-center mx-6 flex-shrink-0" style={{width: 80}}>
                      <div className="flex justify-center mb-2">
                        <img
                          src={dog.image_url}
                          alt={dog.name}
                          width={56}
                          height={56}
                          loading="lazy"
                          style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '50%' }}
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&cs=tinysrgb&w=300';
                          }}
                        />
                      </div>
                      <p className="font-medium text-gray-900 whitespace-nowrap">
                        {dog.name}{getDogHonorific(dog.gender)}
                      </p>
                    </div>
                  ))}
                </>
              );
            } else {
              return (
                <div className="text-gray-500 text-center w-full py-8">
                  まだ登録がありません
                </div>
              );
            }
          })()}
        </div>
      </div>
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (max-width: 640px) {
          .animate-marquee { animation-duration: 36s !important; }
        }
      `}</style>
    </section>
  );
};

export default MarqueeDogsSection; 
import React from 'react';
import { PawPrint, Users, Heart, Star, ArrowRight, Clock } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import { getDogHonorific } from './DogCard';
import type { Dog } from '../../types';

interface RecentDogsSectionProps {
  recentDogs: Dog[];
  recentDogsError: string | null;
  isLoading?: boolean;
}

export const RecentDogsSection: React.FC<RecentDogsSectionProps> = ({
  recentDogs,
  recentDogsError,
  isLoading = false,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今日';
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}週間前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  if (recentDogsError) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-red-500">
          <PawPrint className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">データの読み込みに失敗しました</p>
          <p className="text-sm">{recentDogsError}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          最近仲間入りしたワンちゃん
        </h2>
        <div className="flex items-center text-sm text-gray-500">
          <Clock className="w-4 h-4 mr-1" />
          最新8頭
        </div>
      </div>

      {recentDogs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🐕</div>
          <p className="text-lg font-medium mb-2">まだ新しい仲間はいません</p>
          <p className="text-sm">
            新しく登録されたワンちゃんがここに表示されます
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recentDogs.map((dog) => (
            <div
              key={dog.id}
              className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:shadow-md transition-all duration-200"
            >
              <div className="flex-shrink-0 relative">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md">
                  {dog.image_url ? (
                    <img
                      src={dog.image_url}
                      alt={dog.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&cs=tinysrgb&w=300';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <PawPrint className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  ✨
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {dog.name}{getDogHonorific(dog.gender)}
                  </h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {dog.breed}
                  </span>
                </div>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-sm text-gray-600">
                    {dog.gender === 'オス' ? '♂' : '♀'} {dog.gender}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDate(dog.created_at)}に登録
                  </span>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  <span className="text-sm text-gray-600">Welcome!</span>
                </div>
              </div>
            </div>
          ))}
          
          {recentDogs.length === 8 && (
            <div className="text-center pt-4">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  // TODO: 全ての犬を表示するページに遷移
                  console.log('Navigate to all dogs page');
                }}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                もっと見る
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default RecentDogsSection; 

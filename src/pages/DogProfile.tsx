import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Heart, PawPrint } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';
import type { Dog, DogPark, Reservation } from '../types';

export function DogProfile() {
  const { id } = useParams<{ id: string }>();
  const [dog, setDog] = useState<Dog | null>(null);
  const [favoriteParks, setFavoriteParks] = useState<Array<{ park: DogPark; visits: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchDogProfile();
    }
  }, [id]);

  const fetchDogProfile = async () => {
    try {
      setIsLoading(true);
      setError('');

      // ワンちゃんの情報を取得
      const { data: dogData, error: dogError } = await supabase
        .from('dogs')
        .select('*')
        .eq('id', id)
        .single();

      if (dogError) throw dogError;
      setDog(dogData);

      // 予約履歴を取得してよく遊ぶドッグランを計算
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          *,
          dog_park:dog_parks(*)
        `)
        .eq('dog_id', id)
        .eq('status', 'confirmed');

      if (reservationsError) throw reservationsError;

      // ドッグランごとの訪問回数を計算
      const parkCounts: Record<string, { park: DogPark; visits: number }> = {};
      
      (reservationsData || []).forEach(reservation => {
        const parkId = reservation.park_id;
        if (reservation.dog_park) {
          if (!parkCounts[parkId]) {
            parkCounts[parkId] = { park: reservation.dog_park, visits: 0 };
          }
          parkCounts[parkId].visits++;
        }
      });

      // 訪問回数順にソート
      const sortedParks = Object.values(parkCounts)
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 3); // 上位3つのドッグランを表示

      setFavoriteParks(sortedParks);

    } catch (error) {
      console.error('Error fetching dog profile:', error);
      setError('ワンちゃんの情報を取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  };

  const getDogHonorific = (gender: string) => {
    return gender === 'オス' ? 'くん' : 'ちゃん';
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !dog) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <PawPrint className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ワンちゃんが見つかりません</h1>
          <p className="text-gray-600 mb-6">{error || 'ワンちゃんの情報が見つかりませんでした。'}</p>
          <Link to="/">
            <Button variant="primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              ホームに戻る
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 戻るボタン */}
      <div className="mb-6">
        <Link
          to="/"
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ホームに戻る
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メイン情報 */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* ワンちゃん画像 */}
              <div className="flex-shrink-0">
                <div className="w-48 h-48 bg-gray-200 rounded-lg overflow-hidden">
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
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <PawPrint className="w-12 h-12" />
                    </div>
                  )}
                </div>
              </div>

              {/* 基本情報 */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {dog.name}{getDogHonorific(dog.gender)}
                </h1>
                
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-500 mr-3" />
                    <span className="text-lg text-gray-700">
                      {calculateAge(dog.birth_date)}歳
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <PawPrint className="w-5 h-5 text-gray-500 mr-3" />
                    <span className="text-lg text-gray-700">
                      {dog.breed}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Heart className="w-5 h-5 text-gray-500 mr-3" />
                    <span className="text-lg text-gray-700">
                      {dog.gender}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* よく遊ぶドッグラン */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 text-green-600 mr-2" />
              よく遊ぶドッグラン
            </h2>
            
            {favoriteParks.length > 0 ? (
              <div className="space-y-3">
                {favoriteParks.map((item, index) => (
                  <div key={item.park.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{item.park.name}</h3>
                      <p className="text-sm text-gray-600">{item.visits}回利用</p>
                    </div>
                    <div className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">未記入</p>
            )}
          </Card>

          {/* 登録日 */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              登録日
            </h2>
            <p className="text-gray-700">
              {new Date(dog.created_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
} 
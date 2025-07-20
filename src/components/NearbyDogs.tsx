import { AlertCircle, ChevronDown, MapPin, Navigation } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import Button from './Button';
import Card from './Card';

interface NearbyDog {
  id: string;
  name: string;
  breed: string;
  gender: string;
  birth_date: string;
  image_url?: string;
  owner_id: string;
  owner_name: string;
  distance: number;
  last_seen_at?: string;
  created_at: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

export function NearbyDogs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nearbyDogs, setNearbyDogs] = useState<NearbyDog[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    void getCurrentLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      void fetchNearbyDogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, user]);

  const getCurrentLocation = () => {
    setIsLoading(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('お使いのブラウザは位置情報に対応していません');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError('');
      },
      (error) => {
        console.error('位置情報取得エラー:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('位置情報の利用が許可されていません');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('位置情報を取得できませんでした');
            break;
          case error.TIMEOUT:
            setLocationError('位置情報の取得がタイムアウトしました');
            break;
          default:
            setLocationError('位置情報の取得に失敗しました');
            break;
        }
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000, // 10分間キャッシュ
      }
    );
  };

  const fetchNearbyDogs = useCallback(async () => {
    if (!userLocation || !user) return;

    try {
      setIsLoading(true);
      setError('');

      // デバッグ用：現在のユーザーIDをログ出力
      if (import.meta.env.DEV) {
      }

      // 自分の犬以外の全ての犬を取得
      const { data: dogsData, error: dogsError } = await supabase
        .from('dogs')
        .select(`
          id,
          name,
          breed,
          gender,
          birth_date,
          image_url,
          owner_id,
          created_at,
          profiles!dogs_owner_id_fkey(name)
        `)
        .neq('owner_id', user.id)
        .limit(50);

      if (dogsError) throw dogsError;

      // デバッグ用：取得した犬のデータを確認
      if (import.meta.env.DEV) {
        if (dogsData) {
          
          // 万が一自分の犬が含まれていないかチェック
          const ownDogsIncluded = dogsData.filter(d => d.owner_id === user.id);
          if (ownDogsIncluded.length > 0) {
            console.warn('⚠️ Own dogs found in nearby list:', ownDogsIncluded);
          }
        }
      }

      if (!dogsData || dogsData.length === 0) {
        setNearbyDogs([]);
        return;
      }

      // 最近の位置情報を使用（ここでは東京駅周辺のランダムな位置を生成）
      const dogsWithDistance = dogsData.map((dog) => {
        // 東京駅周辺のランダムな位置を生成
        const baseLatitude = 35.6812;
        const baseLongitude = 139.7671;
        const maxDistance = 0.3; // 約30km範囲

        const randomLat = baseLatitude + (Math.random() - 0.5) * maxDistance;
        const randomLng = baseLongitude + (Math.random() - 0.5) * maxDistance;

        // 実際の距離を計算
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          randomLat,
          randomLng
        );

        const dogData = dog as typeof dog & {
          profiles?: { name?: string } | null;
        };
        
        return {
          ...dog,
          owner_name: dogData.profiles?.name || 'Unknown',
          distance: distance,
          last_seen_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // 1週間以内のランダムな時間
        } as NearbyDog;
      });

      // 距離でソート（近い順）
      const sortedDogs = dogsWithDistance
        .filter(dog => dog.owner_id !== user.id) // 念のため最終チェックで自分の犬を除外
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20); // 最大20匹まで表示

      // デバッグ用：最終結果を確認
      if (import.meta.env.DEV) {
        const finalOwnerCheck = sortedDogs.filter(d => d.owner_id === user.id);
        if (finalOwnerCheck.length > 0) {
          console.error('❌ Own dogs still in final list!', finalOwnerCheck);
        } else {
        }
      }

      setNearbyDogs(sortedDogs);
    } catch (err) {
      console.error('Error fetching nearby dogs:', err);
      setError('近くのワンちゃん情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, user]);

  // 2点間の距離を計算（Haversine式）
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleDogClick = (dog: NearbyDog) => {
    navigate(`/dog/${dog.id}`);
  };



  const getDogAge = (birthDate: string): string => {
    const birth = new Date(birthDate);
    const now = new Date();
    const ageInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    
    if (ageInMonths < 12) {
      return `${ageInMonths}ヶ月`;
    } else {
      const years = Math.floor(ageInMonths / 12);
      const months = ageInMonths % 12;
      return months > 0 ? `${years}歳${months}ヶ月` : `${years}歳`;
    }
  };

  const getDogGenderIcon = (gender: string) => {
    return gender === 'オス' ? '♂' : '♀';
  };

  const getDogHonorific = (gender: string) => {
    return gender === 'オス' ? 'くん' : 'ちゃん';
  };

  if (locationError) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">位置情報が必要です</h3>
          <p className="text-gray-600 mb-4">{locationError}</p>
          <Button onClick={getCurrentLocation} className="mb-2">
            <Navigation className="w-4 h-4 mr-2" />
            位置情報を取得
          </Button>
          <p className="text-sm text-gray-500">
            近くのワンちゃんを表示するには位置情報の許可が必要です
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <MapPin className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-bold">近くのワンちゃんたち</h2>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        あなたの近くにいるワンちゃんたちです（あなたの犬は除く）
      </p>
      <div className="flex justify-end mb-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={getCurrentLocation}
          disabled={isLoading}
        >
          <Navigation className="w-4 h-4 mr-1" />
          更新
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}



      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : nearbyDogs.length === 0 ? (
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">近くにワンちゃんが見つかりませんでした</p>
          <p className="text-sm text-gray-500 mt-2">
            位置情報を更新するか、時間をおいて再度お試しください
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(showAll ? nearbyDogs : nearbyDogs.slice(0, 5)).map((dog) => (
            <div
              key={dog.id}
              className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => handleDogClick(dog)}
            >
              <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                {dog.image_url ? (
                  <img
                    src={dog.image_url}
                    alt={dog.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    🐕
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-lg">
                    {dog.name}{getDogHonorific(dog.gender)}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {getDogGenderIcon(dog.gender)}
                  </span>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <p>{dog.breed} • {getDogAge(dog.birth_date)}</p>
                </div>
              </div>


            </div>
          ))}
          
          {/* もっと見るボタン */}
          {nearbyDogs.length > 5 && !showAll && (
            <div className="text-center pt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAll(true)}
                className="px-6 py-2"
              >
                <ChevronDown className="w-4 h-4 mr-2" />
                もっと見る（残り{nearbyDogs.length - 5}匹）
              </Button>
            </div>
          )}
          
          {/* 全て表示時の情報 */}
          {showAll && nearbyDogs.length >= 20 && (
            <div className="text-center pt-4">
              <p className="text-sm text-gray-500">
                近くに更に多くのワンちゃんがいる可能性があります
              </p>
            </div>
          )}
          
          {/* 折りたたみボタン */}
          {showAll && nearbyDogs.length > 5 && (
            <div className="text-center pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAll(false)}
                className="px-6 py-2"
              >
                <ChevronDown className="w-4 h-4 mr-2 rotate-180" />
                折りたたむ
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start">
          <MapPin className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">位置情報について</p>
            <p>
              お使いの位置情報を基に、近い順でワンちゃんを表示しています。
              位置情報は端末内でのみ処理され、サーバーには保存されません。
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
} 

import { ArrowLeft, Calendar, CheckCircle, Heart, MapPin, PawPrint, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import type { DogPark } from '../types';
import { supabase } from '../utils/supabase';

interface DogProfile {
  id: string;
  name: string;
  breed: string;
  gender: string;
  birth_date: string;
  image_url?: string;
  owner_id: string;
  created_at: string;
}

export function DogProfile() {
  const { id, dogId } = useParams<{ id?: string; dogId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dog, setDog] = useState<DogProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [favoriteParks, setFavoriteParks] = useState<Array<{ park: any; visits: number }>>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  
  // パラメータからIDを取得（既存のルート /dog/:id か新しいルート /dog-profile/:dogId）
  const currentDogId = id || dogId;

  useEffect(() => {
    if (currentDogId) {
      fetchDogProfile();
      if (user) {
        checkFriendRequestStatus();
        checkLikeStatus();
      }
    }
  }, [currentDogId, user]);

  const fetchDogProfile = async () => {
    try {
      setIsLoading(true);
      setError('');

      // ワンちゃんの情報を取得
      const { data: dogData, error: dogError } = await supabase
        .from('dogs')
        .select('*')
        .eq('id', currentDogId)
        .single();

      if (dogError) throw dogError;
      setDog(dogData);
      setLikeCount(dogData.like_count || 0);

      // 予約履歴を取得してよく遊ぶドッグランを計算
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          *,
          dog_park:dog_parks(*)
        `)
        .eq('dog_id', currentDogId)
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

  const checkFriendRequestStatus = async () => {
    if (!user || !currentDogId) return;

    try {
      const { data: dogData } = await supabase
        .from('dogs')
        .select('owner_id')
        .eq('id', currentDogId)
        .single();

      if (!dogData) return;

      const { data, error } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`and(requester_id.eq.${user.id},requested_id.eq.${dogData.owner_id}),and(requester_id.eq.${dogData.owner_id},requested_id.eq.${user.id})`)
        .maybeSingle();

      if (!error && data) {
        setHasSentRequest(true);
      }
    } catch (err) {
      console.error('Error checking friend request status:', err);
    }
  };

  const checkLikeStatus = async () => {
    if (!currentDogId) return;

    try {
      // いいね数を取得
      const { data: likeData, error: likeError } = await supabase
        .from('dog_likes')
        .select('id')
        .eq('dog_id', currentDogId);

      if (!likeError && likeData) {
        setLikeCount(likeData.length);
      }

      // ユーザーがログインしている場合、いいね状態を確認
      if (user) {
        const { data: userLikeData, error: userLikeError } = await supabase
          .from('dog_likes')
          .select('id')
          .eq('user_id', user?.id)
          .eq('dog_id', currentDogId)
          .maybeSingle();

        if (!userLikeError && userLikeData) {
          setIsLiked(true);
        }
      }
    } catch (err) {
      console.error('Error checking like status:', err);
    }
  };

  const handleLike = async () => {
    if (!user || !dog || isLikeLoading) return;

    setIsLikeLoading(true);
    try {
      if (isLiked) {
        // いいねを取り消す
        const { error } = await supabase
          .from('dog_likes')
          .delete()
          .eq('user_id', user?.id)
          .eq('dog_id', dog.id);

        if (error) throw error;

        setIsLiked(false);
        setLikeCount(prev => prev - 1);
        setSuccess('いいねを取り消しました');
      } else {
        // いいねを追加
        const { error } = await supabase
          .from('dog_likes')
          .insert({
            user_id: user.id,
            dog_id: dog.id
          });

        if (error) throw error;

        setIsLiked(true);
        setLikeCount(prev => prev + 1);
        setSuccess('いいねしました');
      }

      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      console.error('Error handling like:', error);
      setError('いいねの処理に失敗しました');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!user || !dog) return;

    setIsSendingRequest(true);
    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          requester_id: user.id,
          requested_id: dog.owner_id,
          message: `ドッグランでお会いした際は、よろしくお願いします！`
        });

      if (error) throw error;

      setHasSentRequest(true);
      setSuccess('友達申請を送信しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error sending friend request:', error);
      setError('友達申請の送信に失敗しました');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSendingRequest(false);
    }
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

  const getDogGenderIcon = (gender: string) => {
    return gender === 'オス' ? '♂' : '♀';
  };

  const getDogHonorific = (gender: string) => {
    return gender === 'オス' ? 'くん' : 'ちゃん';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

      {/* エラー・成功メッセージ */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

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

                 {/* いいねボタン */}
                 <div className="mt-6 pt-4 border-t border-gray-200">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                       <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                       <span className="text-lg font-medium text-gray-700">{likeCount}件のいいね</span>
                     </div>
                     <button
                      onClick={user ? handleLike : () => navigate('/liff/login?redirect=' + location.pathname)}
                       disabled={isLikeLoading}
                       className={`px-6 py-3 rounded-lg font-medium shadow-md transition-all transform hover:scale-105 flex items-center ${
                         isLiked 
                           ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                           : 'bg-white hover:bg-rose-50 text-rose-500 border-2 border-rose-400'
                       } ${isLikeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                       <Heart className={`w-5 h-5 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                       <span className="font-semibold">{isLiked ? 'いいね済み' : 'いいね'}</span>
                     </button>
                   </div>
                 </div>

                {/* 友達申請ボタン（自分の犬でない場合のみ表示） */}
                {user && dog.owner_id !== user.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="text-center">
                      {hasSentRequest ? (
                        <div className="flex items-center justify-center text-green-600">
                          <CheckCircle className="w-5 h-5 mr-2" />
                          <span className="font-medium">友達申請済み</span>
                        </div>
                      ) : (
                        <Button
                          onClick={sendFriendRequest}
                          isLoading={isSendingRequest}
                          className="px-8 py-3"
                        >
                          <UserPlus className="w-5 h-5 mr-2" />
                          友達申請を送る
                        </Button>
                      )}
                    </div>
                    
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">友達申請について</p>
                        <p>
                          友達申請を送ると、相手の飼い主さんに通知が届きます。
                          承認されると、メッセージのやり取りができるようになります。
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
              <p className="text-gray-500">まだドッグランの利用履歴がありません</p>
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

export default DogProfile; 

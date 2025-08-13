import {
    AlertTriangle,
    Bell,
    Calendar,
    CheckCircle,
    ChevronRight,
    Filter,
    Heart,
    Key,
    MapPin,
    MessageSquare,
    PawPrint,
    Send,
    Share,
    UserCheck,
    UserPlus,
    Users,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { NearbyDogs } from '../components/NearbyDogs';
import useAuth from '../context/AuthContext';
import type { Dog, DogEncounter, FriendRequest, Friendship, Message, Notification } from '../types';
import { supabase } from '../utils/supabase';

export function Community() {
  const { user, effectiveUserId } = useAuth();
  const uid = user?.id || effectiveUserId;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'notifications' | 'messages' | 'blacklist' | 'nearby'>('friends');
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [dogEncounters, setDogEncounters] = useState<DogEncounter[]>([]);
  const [userDogs, setUserDogs] = useState<Dog[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [blacklistedDogs, setBlacklistedDogs] = useState<any[]>([]);

  // 未ログイン時はログイン画面にリダイレクト（メールログイン優先）
  useEffect(() => {
    if (!user && !effectiveUserId) {
      navigate('/login?redirect=/community&message=' + encodeURIComponent('コミュニティ機能を利用するにはログインが必要です'));
      return;
    }
  }, [user, effectiveUserId, navigate]);

  useEffect(() => {
    const id = user?.id || effectiveUserId;
    if (id) {
      // 🚀 最適化されたデータ取得とリアルタイム設定
      initializeCommunityPage(id);
    }
  }, [user, effectiveUserId]);

  const initializeCommunityPage = async (id: string) => {
    try {
      // フェーズ1: 即座にUIを表示（基本的なタブ構造）
      // 初期状態のisLoading=trueで表示開始
      
      // フェーズ2: クリティカルデータの優先取得
      setIsLoading(true);
      await Promise.allSettled([
        fetchFriendRequests(id),
        fetchFriends(id),
        fetchNotifications(id)
      ]);
      
      // 基本的なコミュニケーション機能で画面表示を開始
      setIsLoading(false);
      
      // フェーズ3: 追加データの並列取得（バックグラウンド）
      void Promise.allSettled([
        fetchMessages(id),
        fetchDogEncounters(id),
        fetchUserDogs(id),
        fetchBlacklistedDogs(id)
      ]);
      
      // フェーズ4: リアルタイムサブスクリプション設定（最後）
      setupRealtimeSubscriptions();
      
    } catch (error) {
      console.error('Error initializing community page:', error);
      setIsLoading(false);
    }
  };

  // 🔄 リアルタイムサブスクリプション設定を分離
  const setupRealtimeSubscriptions = () => {
    if (!uid) return;

    const friendRequestsSubscription = supabase
      .channel('friend_requests_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friend_requests',
        filter: `requested_id=eq.${uid}`,
      }, () => {
        void fetchFriendRequests();
      })
      .subscribe();
    
    const notificationsSubscription = supabase
      .channel('notifications_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${uid}`,
      }, () => {
        void fetchNotifications();
      })
      .subscribe();
    
    const messagesSubscription = supabase
      .channel('messages_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${uid}`,
      }, () => {
        void fetchMessages();
      })
      .subscribe();
    
    // クリーンアップ関数を返す
    return () => {
      friendRequestsSubscription.unsubscribe();
      notificationsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchFriendRequests(),
        fetchFriends(),
        fetchNotifications(),
        fetchMessages(),
        fetchDogEncounters(),
        fetchUserDogs(),
        fetchBlacklistedDogs()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFriendRequests = async (uid: string) => {
    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        requester:profiles!friend_requests_requester_id_fkey(*)
      `)
      .eq('requested_id', uid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setFriendRequests(data || []);
  };

  const fetchFriends = async (uid: string) => {
    const { data, error } = await supabase
      .rpc('get_friends_with_dogs', {
        p_user_id: uid
      });
    
    if (error) throw error;
    setFriends(data || []);
  };

  const fetchNotifications = async (uid: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    setNotifications(data || []);
    
    // 未読の通知を読み込み済みにする
    const unreadNotifications = data?.filter(notification => !notification.read) || [];
    if (unreadNotifications.length > 0) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadNotifications.map(n => n.id));
    }
  };

  const fetchMessages = async (uid: string) => {
    const { data, error } = await supabase
      .from('latest_messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `)
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setMessages(data || []);
  };

  const fetchDogEncounters = async (uid: string) => {
    const { data, error } = await supabase
      .from('dog_encounters')
      .select(`
        *,
        dog1:dogs!dog_encounters_dog1_id_fkey(*),
        dog2:dogs!dog_encounters_dog2_id_fkey(*),
        park:dog_parks(*)
      `)
      .order('encounter_date', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    setDogEncounters(data || []);
  };

  const fetchUserDogs = async (uid: string) => {
    const { data, error } = await supabase
      .from('dogs')
      .select('*')
      .eq('owner_id', uid);
    
    if (error) throw error;
    setUserDogs(data || []);
  };

  const fetchBlacklistedDogs = async (uid: string) => {
    const { data, error } = await supabase
      .from('dog_blacklist')
      .select(`
        *,
        blacklisted_dog:dogs!dog_blacklist_dog_id_fkey(
          *,
          owner:profiles!dogs_owner_id_fkey(*)
        )
      `)
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setBlacklistedDogs(data || []);
  };

  const handleFriendRequest = async (requestId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({
          status: accept ? 'accepted' : 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (error) throw error;
      
      // 友達リクエスト一覧を更新
      await fetchFriendRequests();
      
      // 友達一覧を更新（承認した場合）
      if (accept) {
        await fetchFriends();
      }
      
      setSuccess(accept ? '友達リクエストを承認しました' : '友達リクエストを拒否しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error handling friend request:', error);
      setError('リクエストの処理に失敗しました');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriend || !messageText.trim()) return;
    
    setIsSendingMessage(true);
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          receiver_id: selectedFriend.friend_id,
          content: messageText.trim(),
          read: false
        });
      
      if (error) throw error;
      
      // メッセージ一覧を更新
      await fetchMessages();
      
      // 入力フィールドをクリア
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('メッセージの送信に失敗しました');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      
      // 通知一覧を更新
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-blue-600" />;
      case 'friend_accepted':
        return <UserCheck className="w-5 h-5 text-green-600" />;
      case 'friend_at_park':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'reservation_reminder':
        return <Calendar className="w-5 h-5 text-orange-600" />;
      case 'blacklisted_dog_nearby':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'friend_request':
        return 'bg-blue-50';
      case 'friend_accepted':
        return 'bg-green-50';
      case 'friend_at_park':
        return 'bg-purple-50';
      case 'reservation_reminder':
        return 'bg-orange-50';
      case 'blacklisted_dog_nearby':
        return 'bg-red-50';
      default:
        return 'bg-gray-50';
    }
  };

    const sendFriendRequest = async (targetUserId: string, dogName: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          requester_id: user?.id,
          requested_id: targetUserId,
          message: `ドッグランでお会いした際は、よろしくお願いします！`
        });

      if (error) throw error;

      setSuccess('友達申請を送信しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error sending friend request:', error);
      setError('友達申請の送信に失敗しました');
      setTimeout(() => setError(''), 3000);
    }
  };

  const addToBlacklist = async (dogId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('dog_blacklist')
        .insert({
          user_id: user?.id,
          dog_id: dogId,
          reason: reason,
          notify_when_nearby: true
        });
      
      if (error) throw error;
      
      await fetchBlacklistedDogs();
      setSuccess('ブラックリストに追加しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error adding to blacklist:', error);
      setError('ブラックリストへの追加に失敗しました');
      setTimeout(() => setError(''), 3000);
    }
  };

  const removeFromBlacklist = async (blacklistId: string) => {
    try {
      const { error } = await supabase
        .from('dog_blacklist')
        .delete()
        .eq('id', blacklistId);
      
      if (error) throw error;
      
      await fetchBlacklistedDogs();
      setSuccess('ブラックリストから削除しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error removing from blacklist:', error);
      setError('ブラックリストからの削除に失敗しました');
      setTimeout(() => setError(''), 3000);
    }
  };

  // 犬の性別に応じた敬称を取得する関数
  const getDogHonorific = (gender: string) => {
    return gender === 'オス' ? 'くん' : 'ちゃん';
  };

  // ユーザー名を匿名化して表示（プライバシー保護）
  const formatUserDisplayName = (user: any, dogs?: any[]) => {
    if (dogs && dogs.length > 0) {
      const firstDog = dogs[0];
      return `${firstDog.name}${getDogHonorific(firstDog.gender)}の飼い主さん`;
    }
    return 'ワンちゃんの飼い主さん';
  };

  // 未ログイン時は何も表示しない（リダイレクト処理は上のuseEffectで実行済み）
  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-8 flex items-center">
        <Users className="w-8 h-8 text-blue-600 mr-3" />
        コミュニティ
      </h1>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-green-800">{success}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2">
          {/* タブナビゲーション */}
          <div className="bg-white border-b mb-6 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <button
              className={`px-2 py-3 font-medium relative flex flex-col items-center space-y-1 rounded-lg transition-colors ${
                activeTab === 'friends'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('friends')}
            >
              <Users className="w-6 h-6" />
              <span className="text-xs">友達</span>
            </button>
            <button
              className={`px-2 py-3 font-medium relative flex flex-col items-center space-y-1 rounded-lg transition-colors ${
                activeTab === 'requests'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('requests')}
            >
              <UserPlus className="w-6 h-6" />
              <span className="text-xs">リクエスト</span>
              {friendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {friendRequests.length}
                </span>
              )}
            </button>
            <button
              className={`px-2 py-3 font-medium relative flex flex-col items-center space-y-1 rounded-lg transition-colors ${
                activeTab === 'notifications'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell className="w-6 h-6" />
              <span className="text-xs">通知</span>
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            <button
              className={`px-2 py-3 font-medium relative flex flex-col items-center space-y-1 rounded-lg transition-colors ${
                activeTab === 'messages'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('messages')}
            >
              <MessageSquare className="w-6 h-6" />
              <span className="text-xs">メッセージ</span>
              {messages.filter(m => !m.read && m.receiver_id === user?.id).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {messages.filter(m => !m.read && m.receiver_id === user?.id).length}
                </span>
              )}
            </button>
            <button
              className={`px-2 py-3 font-medium relative flex flex-col items-center space-y-1 rounded-lg transition-colors ${
                activeTab === 'nearby'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('nearby')}
            >
              <MapPin className="w-6 h-6" />
              <span className="text-xs">近くの子</span>
            </button>
            <button
              className={`px-2 py-3 font-medium relative flex flex-col items-center space-y-1 rounded-lg transition-colors ${
                activeTab === 'blacklist'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('blacklist')}
            >
              <AlertTriangle className="w-6 h-6" />
              <span className="text-xs">ブラックリスト</span>
              {blacklistedDogs.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {blacklistedDogs.length}
                </span>
              )}
            </button>
            </div>
          </div>
          
          {/* 友達タブ */}
          {activeTab === 'friends' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">友達一覧</h2>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="secondary"
                    size="sm"
                    onClick={() => fetchFriends()}
                  >
                    <Filter className="w-4 h-4 mr-1" />
                    並び替え
                  </Button>
                </div>
              </div>
              
              {friends.length === 0 ? (
                <Card className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">まだ友達がいません</h3>
                  <p className="text-gray-500 mb-4">
                    同じドッグランで出会ったワンちゃんの飼い主さんと友達になれます
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {friends.map((friend) => (
                    <Card key={friend.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-gray-500" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{formatUserDisplayName(friend.friend, friend.friend_dogs)}</h3>
                            <p className="text-sm text-gray-600">
                              {friend.dog_count}頭のワンちゃんと一緒
                            </p>
                            {friend.friend_dogs && friend.friend_dogs.length > 0 && (
                              <div className="flex items-center mt-1">
                                <PawPrint className="w-4 h-4 text-blue-600 mr-1" />
                                <p className="text-xs text-gray-500">
                                  {friend.friend_dogs.map(dog => 
                                    `${dog.name}${dog.gender ? getDogHonorific(dog.gender) : 'ちゃん'}`
                                  ).join('、')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => setSelectedFriend(friend)}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          メッセージ
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* リクエストタブ */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">友達リクエスト</h2>
              
              {friendRequests.length === 0 ? (
                <Card className="text-center py-8">
                  <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">リクエストはありません</h3>
                  <p className="text-gray-500">
                    同じドッグランで出会った人からのリクエストがここに表示されます
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {friendRequests.map((request) => (
                    <Card key={request.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-gray-500" />
                          </div>
                          <div>
                            <h3 className="font-semibold">ワンちゃんの飼い主さんからのリクエスト</h3>
                            <p className="text-sm text-gray-600">
                              {new Date(request.created_at).toLocaleDateString('ja-JP')}
                            </p>
                            {request.message && (
                              <p className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                                {request.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm"
                            onClick={() => handleFriendRequest(request.id, true)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            承認
                          </Button>
                          <Button 
                            size="sm"
                            variant="secondary"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleFriendRequest(request.id, false)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            拒否
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 近くのワンちゃんタブ */}
          {activeTab === 'nearby' && (
            <div className="space-y-6">
              <Card className="p-6 text-center">
                <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">近くのワンちゃんたち</h3>
                <p className="text-gray-600 mb-4">
                  GPS位置情報を使用して、近くのワンちゃんたちを表示します。
                </p>
                <p className="text-sm text-gray-500">
                  ※ 詳細は右側のサイドバーをご確認ください
                </p>
              </Card>
            </div>
          )}

          {/* ブラックリストタブ */}
          {activeTab === 'blacklist' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">ブラックリスト</h2>
              
              {blacklistedDogs.length === 0 ? (
                <Card className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">ブラックリストは空です</h3>
                  <p className="text-gray-500">
                    相性が悪いワンちゃんをブラックリストに登録すると、そのワンちゃんがドッグランに入った時に通知されます
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {blacklistedDogs.map((blacklisted) => (
                    <Card key={blacklisted.id} className="p-4 bg-red-50 border-red-200">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                            {blacklisted.blacklisted_dog?.image_url ? (
                              <img 
                                src={blacklisted.blacklisted_dog.image_url} 
                                alt={blacklisted.blacklisted_dog.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <PawPrint className="w-6 h-6 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-red-900">
                              {blacklisted.blacklisted_dog?.name}
                              {blacklisted.blacklisted_dog?.gender && getDogHonorific(blacklisted.blacklisted_dog.gender)}
                            </h3>
                            <p className="text-sm text-red-700">
                              飼い主: ワンちゃんの飼い主さん
                            </p>
                            <p className="text-sm text-red-600 mt-1">
                              理由: {blacklisted.reason}
                            </p>
                            <p className="text-xs text-red-500 mt-1">
                              登録日: {new Date(blacklisted.created_at).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          variant="secondary"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => removeFromBlacklist(blacklisted.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          削除
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* 通知タブ */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">通知</h2>
              
              {notifications.length === 0 ? (
                <Card className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">通知はありません</h3>
                  <p className="text-gray-500">
                    友達リクエストや予約の通知がここに表示されます
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <Card 
                      key={notification.id} 
                      className={`p-4 ${notification.read ? '' : 'border-l-4 border-blue-500'} ${getNotificationColor(notification.type)}`}
                      onClick={() => !notification.read && markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <h3 className="font-semibold">{notification.title}</h3>
                          <p className="text-sm text-gray-700">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.created_at).toLocaleDateString('ja-JP')} {new Date(notification.created_at).toLocaleTimeString('ja-JP')}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            新着
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* メッセージタブ */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">メッセージ</h2>
              
              {messages.length === 0 ? (
                <Card className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">メッセージはありません</h3>
                  <p className="text-gray-500">
                    友達とのメッセージがここに表示されます
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isReceived = message.receiver_id === user?.id;
                    const otherUser = isReceived ? message.sender : null;
                    
                    return (
                      <Card 
                        key={message.id} 
                        className={`p-4 ${!message.read && isReceived ? 'border-l-4 border-blue-500' : ''}`}
                        onClick={() => setSelectedFriend({
                          id: message.id,
                          friend_id: isReceived ? message.sender_id : message.receiver_id,
                          friend: otherUser || { id: '', name: '', user_type: 'user', created_at: new Date().toISOString() },
                          dog_count: 0,
                          created_at: new Date().toISOString()
                        })}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h3 className="font-semibold">
                                {isReceived ? 'ワンちゃんの飼い主さん' : '自分'} {isReceived ? 'から' : 'から'}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {new Date(message.created_at).toLocaleDateString('ja-JP')}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{message.content}</p>
                          </div>
                          {!message.read && isReceived && (
                            <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              未読
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* メッセージ送信モーダル */}
          {selectedFriend && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-lg w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">ワンちゃんの飼い主さんとのメッセージ</h2>
                    <button
                      onClick={() => setSelectedFriend(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="h-64 overflow-y-auto mb-4 p-3 bg-gray-50 rounded-lg">
                    {/* ここにメッセージ履歴を表示 */}
                    <div className="text-center text-gray-500 text-sm py-4">
                      メッセージ履歴はまだありません
                    </div>
                  </div>

                  {/* PIN共有機能 */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                      <Key className="w-4 h-4 mr-1" />
                      施設貸し切り予約の共有
                    </h4>
                    <p className="text-sm text-blue-800 mb-2">
                      施設貸し切り予約がある場合、友達にPINコードを共有できます
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => {
                        // TODO: 予約一覧から選択してPIN共有する機能
                        alert('この機能は準備中です。施設貸し切り予約がある場合に利用できます。');
                      }}
                    >
                      <Share className="w-3 h-3 mr-1" />
                      予約を共有
                    </Button>
                  </div>
                  
                  <form onSubmit={handleSendMessage}>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="メッセージを入力..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <Button
                        type="submit"
                        isLoading={isSendingMessage}
                        disabled={!messageText.trim()}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        送信
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* サイドバー */}
        <div className="space-y-6">
          {/* 近くのワンちゃんたち */}
          <NearbyDogs />
          
          {/* 最近の出会い */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <PawPrint className="w-5 h-5 text-blue-600 mr-2" />
              最近の出会い
            </h2>
            
            {dogEncounters.length === 0 ? (
              <p className="text-gray-600 text-sm">
                まだ出会いの記録がありません
              </p>
            ) : (
              <div className="space-y-4">
                {dogEncounters.slice(0, 5).map((encounter) => {
                  // 自分の犬とそうでない犬を判別
                  const myDog = encounter.dog1.owner_id === user?.id ? encounter.dog1 : encounter.dog2;
                  const otherDog = encounter.dog1.owner_id === user?.id ? encounter.dog2 : encounter.dog1;
                  const otherOwnerId = otherDog.owner_id;
                  
                  return (
                    <div key={encounter.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {otherDog.image_url ? (
                          <img 
                            src={otherDog.image_url} 
                            alt={otherDog.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <PawPrint className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-sm">
                            {myDog.name}{getDogHonorific(myDog.gender)}と{otherDog.name}{getDogHonorific(otherDog.gender)}
                          </h3>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs px-2 py-1"
                              onClick={() => sendFriendRequest(otherOwnerId, otherDog.name)}
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              友達申請
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs px-2 py-1 text-red-600 hover:text-red-700"
                              onClick={() => {
                                const reason = prompt('ブラックリストに登録する理由を入力してください:');
                                if (reason) {
                                  addToBlacklist(otherDog.id, reason);
                                }
                              }}
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              ブラックリスト
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1 mt-1">
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>{new Date(encounter.encounter_date).toLocaleDateString('ja-JP')}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span>{encounter.park.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <Button variant="secondary" size="sm" className="w-full">
                  すべての出会いを見る
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </Card>
          
          {/* あなたのワンちゃん */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Heart className="w-5 h-5 text-pink-600 mr-2" />
              あなたのワンちゃん
            </h2>
            
            {userDogs.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm mb-3">
                  まだワンちゃんが登録されていません
                </p>
                <Link to="/dog-registration">
                  <Button size="sm">
                    ワンちゃんを登録
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {userDogs.map((dog) => (
                  <div key={dog.id} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {dog.image_url ? (
                        <img 
                          src={dog.image_url} 
                          alt={dog.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PawPrint className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{dog.name}{getDogHonorific(dog.gender)}</h3>
                      <p className="text-xs text-gray-500">{dog.breed}</p>
                    </div>
                  </div>
                ))}
                
                <Link to="/dog-registration">
                  <Button variant="secondary" size="sm" className="w-full">
                    <PawPrint className="w-4 h-4 mr-1" />
                    ワンちゃんを追加
                  </Button>
                </Link>
              </div>
            )}
          </Card>
          
          {/* コミュニティガイド */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h2 className="text-lg font-semibold mb-3 text-blue-900">コミュニティガイド</h2>
            <div className="space-y-3 text-sm text-blue-800">
              <p>
                <span className="font-medium">友達申請について:</span><br />
                同じドッグランで出会ったワンちゃんの飼い主さんとのみ友達になれます。
              </p>
              <p>
                <span className="font-medium">メッセージ機能:</span><br />
                友達になった方とメッセージのやり取りができます。次回の予約を調整したり、ワンちゃんの情報を共有したりしましょう。
              </p>
              <p>
                <span className="font-medium">通知機能:</span><br />
                友達リクエストや予約の通知が届きます。友達のワンちゃんが近くのドッグランにいる場合も通知されます。
              </p>
              <p>
                <span className="font-medium">ブラックリスト機能:</span><br />
                相性が悪いワンちゃんをブラックリストに登録すると、そのワンちゃんがドッグランに入った時に通知されます。
              </p>
              <p>
                <span className="font-medium">施設共有機能:</span><br />
                施設貸し切り予約をした場合、友達を誘ってPINコードを共有することができます。
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

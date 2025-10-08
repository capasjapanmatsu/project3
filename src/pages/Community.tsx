import {
    AlertTriangle,
    Bell,
    Calendar,
    CheckCircle,
    ChevronRight,
    Filter,
    Heart,
    MapPin,
    MessageSquare,
    Paperclip,
    PawPrint,
    Send,
    Share,
    UserCheck,
    UserPlus,
    Users,
    X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { NearbyDogs } from '../components/NearbyDogs';
import useAuth from '../context/AuthContext';
import type { Dog, DogEncounter, FriendRequest, Friendship, Message, Notification } from '../types';
import { supabase } from '../utils/supabase';

export function Community() {
  const { user, effectiveUserId, lineUser, isLineAuthenticated } = useAuth();
  const uid = user?.id || lineUser?.id || effectiveUserId;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'notifications' | 'messages' | 'blacklist' | 'nearby'>(() => {
    const preset = sessionStorage.getItem('communityActiveTab') as any;
    sessionStorage.removeItem('communityActiveTab');
    return preset === 'messages' ? 'messages' : 'friends';
  });
  const openPartnerPreset = sessionStorage.getItem('communityOpenPartnerId');
  if (openPartnerPreset) {
    // 後段のレンダリングで初期選択に使う。読み終わったら消しておく
    sessionStorage.removeItem('communityOpenPartnerId');
  }
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadFrom, setUnreadFrom] = useState<Record<string, number>>({});
  const [profileMap, setProfileMap] = useState<Record<string, { name: string | null; nickname: string | null; user_type: string | null }>>({});
  const [dogNameMap, setDogNameMap] = useState<Record<string, { name: string; gender?: string | null }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageRefreshKey, setMessageRefreshKey] = useState(0);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dogEncounters, setDogEncounters] = useState<DogEncounter[]>([]);
  const [userDogs, setUserDogs] = useState<Dog[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [blacklistedDogs, setBlacklistedDogs] = useState<any[]>([]);
  // 地域掲示板: 都道府県選択（ローカル保存）
  const PREF_KEY = 'communityPreferredPrefecture';
  const PREFS = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  const [selectedPref, setSelectedPref] = useState<string>(() => localStorage.getItem(PREF_KEY) || '東京都');
  // 予約共有用UI状態
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [reservationsForShare, setReservationsForShare] = useState<Array<{ id:string; park_id:string; park_name:string; date:string; start_time:any; duration:number }>>([]);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [shareComment, setShareComment] = useState('');

  // 横パン禁止用（指を置いたまま左右に動かすときのページはみ出しを防止）
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches && e.touches[0];
    if (t) touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const dx = Math.abs(t.clientX - touchStart.current.x);
    const dy = Math.abs(t.clientY - touchStart.current.y);
    if (dx > dy) {
      // 横方向のパン操作はキャンセル（上下スクロールは許可）
      e.preventDefault();
    }
  };

  // 管理画面から遷移したときに即座にスレッドを開く（データ取得前でも仮スレッドを作ってモーダルを開く）
  useEffect(() => {
    const partnerId = openPartnerPreset;
    if (uid && partnerId && !selectedFriend) {
      setSelectedFriend({
        id: 'new',
        friend_id: partnerId,
        friend: { id: partnerId, name: '', user_type: 'user', created_at: new Date().toISOString() },
        dog_count: 0,
        created_at: new Date().toISOString()
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // 未ログイン時はログイン画面にリダイレクト（メールログイン優先）
  useEffect(() => {
    if (!user && !lineUser && !effectiveUserId) {
      navigate('/login?redirect=/community&message=' + encodeURIComponent('コミュニティ機能を利用するにはログインが必要です'));
      return;
    }
  }, [user, lineUser, effectiveUserId, navigate]);

  useEffect(() => {
    const id = user?.id || lineUser?.id || effectiveUserId;
    if (!id) return;
    // キャッシュから即時表示
    try {
      const cached = sessionStorage.getItem('community_cached');
      if (cached) {
        const { msgs, notifs, frs, friendsCache, ts } = JSON.parse(cached);
        if (Array.isArray(msgs)) setMessages(msgs);
        if (Array.isArray(notifs)) setNotifications(notifs);
        if (Array.isArray(frs)) setFriendRequests(frs);
        if (Array.isArray(friendsCache)) setFriends(friendsCache);
        setIsLoading(false);
      }
    } catch {}
    // バックグラウンド更新
    initializeCommunityPage(id);
  }, [user, lineUser, effectiveUserId]);

  // 都道府県の選択を保存
  useEffect(() => {
    try { localStorage.setItem(PREF_KEY, selectedPref); } catch {}
  }, [selectedPref]);

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
      // キャッシュ保存（60秒）
      try {
        sessionStorage.setItem('community_cached', JSON.stringify({
          msgs: messages,
          notifs: notifications,
          frs: friendRequests,
          friendsCache: friends,
          ts: Date.now(),
        }));
      } catch {}
      
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
    // 最新メッセージ（相手ごとに1件）
    const { data, error } = await supabase
      .from('latest_messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `)
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const rows = data || [];
    // 相手ごとに1件に確実に絞る（念のためクライアント側でも重複排除）
    const dedup: Message[] = [] as any;
    const seen: Record<string, boolean> = {};
    for (const m of rows as any[]) {
      const otherId = m.sender_id === uid ? m.receiver_id : m.sender_id;
      if (!seen[otherId]) {
        seen[otherId] = true;
        dedup.push(m);
      }
    }
    setMessages(dedup);

    // 未読件数（自分宛てで未読のものを送信者ごとに集計）
    const { data: unread } = await supabase
      .from('messages')
      .select('sender_id, read')
      .eq('receiver_id', uid)
      .eq('read', false);
    const counts: Record<string, number> = {};
    (unread || []).forEach((r: any) => {
      counts[r.sender_id] = (counts[r.sender_id] || 0) + 1;
    });
    setUnreadFrom(counts);

    // 相手プロフィール（名前・ニックネーム・ユーザー種別）を取得
    const partnerIds = dedup.map((m: any) => (m.sender_id === uid ? m.receiver_id : m.sender_id));
    if (partnerIds.length > 0) {
      const { data: partners } = await supabase
        .from('profiles')
        .select('id, name, nickname, user_type')
        .in('id', partnerIds);
      const map: Record<string, { name: string | null; nickname: string | null; user_type: string | null }> = {};
      (partners || []).forEach((p: any) => {
        map[p.id] = { name: p.name || null, nickname: p.nickname || null, user_type: p.user_type || null };
      });
      setProfileMap(map);

      // 相手ユーザーのワンちゃん（最初の1匹）を取得
      const { data: dogs } = await supabase
        .from('dogs')
        .select('owner_id, name, gender, created_at, image_url')
        .in('owner_id', partnerIds)
        .order('created_at', { ascending: true });
      const dogMap: Record<string, { name: string; gender?: string | null; image_url?: string | null }> = {};
      (dogs || []).forEach((d: any) => {
        if (!dogMap[d.owner_id]) {
          dogMap[d.owner_id] = { name: d.name, gender: d.gender, image_url: d.image_url };
        }
      });
      setDogNameMap(dogMap);
    } else {
      setProfileMap({});
      setDogNameMap({});
    }
    // もし事前指定の相手があれば、そのスレッドを開く or 新規開始
    if (openPartnerPreset) {
      const target = dedup.find((m: any) => (m.sender_id === uid ? m.receiver_id : m.sender_id) === openPartnerPreset);
      const otherId = openPartnerPreset;
      // プロフィールを探す（ない場合もある）
      const partnerProfile = (map && (map as any)[otherId]) || { name: '', nickname: '', user_type: 'user' } as any;
      if (target) {
        setSelectedFriend({
          id: target.id,
          friend_id: otherId,
          friend: { id: otherId, name: partnerProfile.name || '', user_type: partnerProfile.user_type || 'user', created_at: new Date().toISOString() },
          dog_count: 0,
          created_at: new Date().toISOString()
        });
      } else {
        // スレッドが無ければ新規スレッド開始用に仮のオブジェクトを設定（送信で自動作成）
        setSelectedFriend({
          id: 'new',
          friend_id: otherId,
          friend: { id: otherId, name: partnerProfile.name || '', user_type: partnerProfile.user_type || 'user', created_at: new Date().toISOString() },
          dog_count: 0,
          created_at: new Date().toISOString()
        });
      }
    }
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
      
      // 相手に通知（承認のみ）
      if (accept) {
        try {
          // 承認対象のリクエストから申請者IDを取得
          const { data: req } = await supabase
            .from('friend_requests')
            .select('from_user_id')
            .eq('id', requestId)
            .maybeSingle();
          if (req?.from_user_id) {
            await notifyFriendApproved(req.from_user_id);
          }
        } catch {}
      }

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
      const content = messageText.trim();
      const receiverId = selectedFriend.friend_id;
      const { data: inserted, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          receiver_id: receiverId,
          content,
          read: false
        })
        .select('id')
        .single();
      
      if (error) throw error;
      const messageId = inserted?.id as string | undefined;

      // 画像添付がある場合はアップロード
      if (messageId && queuedFiles.length > 0) {
        setUploading(true);
        for (const file of queuedFiles) {
          try {
            const key = `public/${user?.id}/${Date.now()}_${file.name}`;
            const up = await supabase.storage.from('message-attachments').upload(key, file, { contentType: file.type });
            if (up.error) continue;
            const { data: pub } = supabase.storage.from('message-attachments').getPublicUrl(up.data.path);
            await supabase.from('message_attachments').insert({
              message_id: messageId,
              file_url: pub.publicUrl,
              file_type: 'image',
              file_name: file.name,
            });
          } catch {}
        }
        setQueuedFiles([]);
        setUploading(false);
      }
      
      // メッセージ一覧を更新
      await fetchMessages(uid!);
      
      // 入力フィールドをクリア
      setMessageText('');

      // スレッドの再読み込み（モーダル内の履歴を即時反映）
      setMessageRefreshKey((k) => k + 1);

      // 受信者へ通知（アプリ内＋LINE）※本文は送らない
      try {
        const { notifyAppAndLine } = await import('../utils/notify');
        const senderName = userDogs.length > 0 ? (userDogs[0]?.name ?? '友達') : '友達';
        const linkUrl = `${window.location.origin}/community/messages`;
        await notifyAppAndLine({
          userId: receiverId,
          title: 'メッセージ',
          message: `${senderName}さんからメッセージが届きました`,
          linkUrl,
          kind: 'alert'
        });
      } catch {}
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

  // 通知タブ: 通知を作成する箇所（例：友達申請承認時の相手側へ通知）にLINE連携も併送
  const notifyFriendApproved = async (targetUserId: string) => {
    try {
      const { notifyAppAndLine } = await import('../utils/notify');
      await notifyAppAndLine({
        userId: targetUserId,
        title: '友達申請が承認されました',
        message: 'コミュニティでメッセージを送ってみましょう',
        linkUrl: `${window.location.origin}/community`,
        kind: 'alert'
      });
    } catch {}
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
  if (!user && !lineUser && !effectiveUserId) {
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
    <div
      className="max-w-6xl mx-auto w-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={{
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        overscrollBehavior: 'none' as any,
        touchAction: 'pan-y',
        overflowX: 'clip',
        position: 'relative'
      }}
    >
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
          <div className="bg-white border-b mb-6 px-4 md:px-0">
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
                    const otherId = message.sender_id === uid ? message.receiver_id : message.sender_id;
                    const partnerProfile = profileMap[otherId];
                    let partnerName = 'ワンちゃんの飼い主さん';
                    // 管理者メール固定表示
                    const ADMIN_EMAIL = 'capasjapan@gmail.com';
                    const isAdminFixed = partnerProfile?.user_type === 'admin' || partnerProfile?.name === ADMIN_EMAIL || partnerProfile?.nickname === ADMIN_EMAIL;
                    if (isAdminFixed) {
                      partnerName = 'ドッグパークJP管理者';
                    } else {
                      const dog = dogNameMap[otherId];
                      if (dog && dog.name) {
                        const suffix = dog.gender === 'male' || dog.gender === 'オス' ? 'くん' : dog.gender === 'female' || dog.gender === 'メス' ? 'ちゃん' : '';
                        partnerName = `${dog.name}${suffix}の飼い主さん`;
                      } else if (partnerProfile?.user_type === 'owner') {
                        // オーナーでワンちゃん未登録の場合はニックネームを表示
                        partnerName = partnerProfile.nickname || partnerProfile.name || 'オーナー';
                      }
                    }
                    
                    return (
                      <Card 
                        key={message.id} 
                        className={`p-4 ${!message.read && isReceived ? 'border-l-4 border-blue-500' : ''}`}
                        onClick={() => setSelectedFriend({
                          id: message.id,
                          friend_id: otherId,
                          friend: { id: otherId, name: partnerName, user_type: partnerProfile?.user_type || 'user', created_at: new Date().toISOString() },
                          dog_count: 0,
                          created_at: new Date().toISOString()
                        })}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                            {partnerProfile?.user_type === 'admin' ? (
                              <img src="/icons/icon_android_96x96.png" alt="管理者" loading="lazy" className="w-full h-full object-contain p-1" />
                            ) : dogNameMap[otherId]?.image_url ? (
                              <img src={dogNameMap[otherId]?.image_url!} alt="犬" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h3 className="font-semibold">{partnerName}</h3>
                              <p className="text-xs text-gray-500">
                                {new Date(message.created_at).toLocaleDateString('ja-JP')}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{message.content}</p>
                          </div>
                          {(() => {
                            const c = unreadFrom[otherId] || 0;
                            return c > 0 ? (
                              <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                未読 {c}
                              </div>
                            ) : null;
                          })()}
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
                    <h2 className="text-xl font-semibold">{(() => {
                      const partner = profileMap[selectedFriend.friend_id];
                      const dog = dogNameMap[selectedFriend.friend_id];
                      if (partner?.user_type === 'admin') return 'ドッグパークJP管理者とのメッセージ';
                      if (dog?.name) {
                        const suffix = dog.gender === 'male' || dog.gender === 'オス' ? 'くん' : dog.gender === 'female' || dog.gender === 'メス' ? 'ちゃん' : '';
                        return `${dog.name}${suffix}の飼い主さんとのメッセージ`;
                      }
                      if (partner?.user_type === 'owner') return `${partner.nickname || partner.name || 'オーナー'}さんとのメッセージ`;
                      return 'ワンちゃんの飼い主さんとのメッセージ';
                    })()}</h2>
                    <button
                      onClick={() => setSelectedFriend(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <MessageThread viewerId={uid!} partnerId={selectedFriend.friend_id} refreshKey={messageRefreshKey} onMarkedRead={() => fetchMessages(uid!)} />

                  {/* アクションバー（メッセージ入力の直下に簡潔表示） */}
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
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        onClick={async () => {
                          try {
                            if (!user?.id) return;
                            setShareOpen(true);
                            setShareLoading(true);
                            // 当日以降の貸し切り確定予約を取得（終了時刻が現在より後のもののみ表示）
                            const { data: rows } = await supabase
                              .from('reservations')
                              .select('id, park_id, date, start_time, duration, reservation_type')
                              .eq('user_id', user.id)
                              .eq('reservation_type', 'whole_facility')
                              .eq('status', 'confirmed')
                              .order('date', { ascending: false })
                              .limit(10);
                            const list = rows || [];
                            const parkIds = Array.from(new Set(list.map(r => r.park_id as any)));
                            let names: Record<string,string> = {};
                            if (parkIds.length > 0) {
                              const { data: parks } = await supabase.from('dog_parks').select('id,name').in('id', parkIds);
                              (parks||[]).forEach(p => { names[p.id as any] = (p.name as any) || 'ドッグラン'; });
                            }
                            const now = new Date();
                            const normalized = list.map(r => ({ id: r.id as any, park_id: r.park_id as any, park_name: names[r.park_id as any] || 'ドッグラン', date: String(r.date), start_time: r.start_time as any, duration: Number(r.duration || 1) }));
                            // 終了時刻が過去の予約は除外
                            const upcoming = normalized.filter(r => {
                              const parts = String(r.start_time).split(':');
                              const hh = parseInt(parts[0] || '0', 10) || 0;
                              const mm = parseInt(parts[1] || '0', 10) || 0;
                              const ymd = String(r.date).split('-').map(n => parseInt(n, 10));
                              const start = new Date(ymd[0], (ymd[1]||1)-1, ymd[2]||1, hh, mm, 0);
                              const end = new Date(start.getTime() + (Math.max(1, r.duration) * 60 * 60 * 1000));
                              return end.getTime() > now.getTime();
                            });
                            setReservationsForShare(upcoming);
                            if (upcoming[0]) setSelectedReservationId(upcoming[0].id);
                            setShareComment('');
                          } finally {
                            setShareLoading(false);
                          }
                        }}
                      >
                        <Share className="w-4 h-4" /> 予約を共有
                      </button>
                      <label className="flex items-center gap-1 text-gray-600 hover:text-gray-800 cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = (e.target.files?.[0]); if (f) setQueuedFiles(prev => [...prev, f]); }} />
                        <Paperclip className="w-4 h-4" /> 画像添付
                      </label>
                      {queuedFiles.length > 0 && <span className="text-xs text-gray-500">{queuedFiles.length}件の画像を添付予定</span>}
                      {uploading && <span className="text-xs text-gray-500">アップロード中...</span>}
                    </div>
                  </form>
                  
                  {/* 上に移動したので削除 */}
                </div>
              </div>
            </div>
            )}
            {shareOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-[60]">
                <div className="bg-white rounded-lg max-w-xl w-full p-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">共有する貸し切り予約を選択</h3>
                    <button className="text-gray-500 hover:text-gray-700" onClick={() => setShareOpen(false)}><X className="w-5 h-5"/></button>
                  </div>
                  {shareLoading ? (
                    <div className="text-center py-6">読み込み中...</div>
                  ) : reservationsForShare.length === 0 ? (
                    <div className="text-sm text-gray-600">貸し切り確定済みの予約が見つかりません。</div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {reservationsForShare.map(r => {
                        const parts = String(r.start_time).split(':');
                        const hh = parseInt(parts[0] || '0', 10) || 0;
                        const mm = parseInt(parts[1] || '0', 10) || 0;
                        const ymd = String(r.date).split('-').map(n => parseInt(n, 10));
                        const start = new Date(ymd[0], (ymd[1]||1)-1, ymd[2]||1, hh, mm, 0);
                        const end = new Date(start.getTime() + (Math.max(1, r.duration) * 60 * 60 * 1000));
                        return (
                          <label key={r.id} className={`flex items-start gap-3 p-3 rounded border ${selectedReservationId===r.id?'border-blue-500 bg-blue-50':'border-gray-200'}`}>
                            <input type="radio" name="share-reservation" checked={selectedReservationId===r.id} onChange={() => setSelectedReservationId(r.id)} className="mt-1"/>
                            <div>
                              <div className="font-medium">{r.park_name}</div>
                              <div className="text-sm text-gray-600">{start.toLocaleString('ja-JP')} 〜 {end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-4">
                    <label className="block text-sm text-gray-600 mb-1">メッセージ（編集可）</label>
                    <textarea value={shareComment} onChange={e=>setShareComment(e.target.value)} className="w-full border rounded p-2 text-sm" rows={3} placeholder="予約を共有します。\n（ここに追記があれば編集してください）"/>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="secondary" onClick={()=>setShareOpen(false)}>キャンセル</Button>
                    <Button onClick={async ()=>{
                      try{
                        if(!user?.id || !selectedReservationId) return;
                        const r = reservationsForShare.find(x=>x.id===selectedReservationId)!;
                        const parts = String(r.start_time).split(':');
                        const hh = parseInt(parts[0]||'0',10)||0; const mm=parseInt(parts[1]||'0',10)||0;
                        const ymd = String(r.date).split('-').map(n=>parseInt(n,10));
                        const startDate = new Date(ymd[0], (ymd[1]||1)-1, ymd[2]||1, hh, mm, 0);
                        const durationHours = Math.max(1, Number(r.duration)||1);
                        const endDate = new Date(startDate.getTime() + (durationHours*60*60*1000));
                        const token = Math.random().toString(36).slice(2)+Date.now().toString(36);
                        const { error:insErr } = await supabase.from('reservation_invites').insert({ token, host_user_id:user.id, park_id:r.park_id, title:'ドッグラン貸し切りのご招待', start_time:startDate.toISOString(), end_time:endDate.toISOString(), max_uses:null });
                        if(insErr) throw insErr;
                        const appBaseUrl = (import.meta.env.VITE_PUBLIC_BASE_URL as string) || (window.location.hostname === 'localhost' ? 'https://dogparkjp.com' : window.location.origin);
                        const inviteUrl = `${appBaseUrl}/invite/${token}`;
                        const bodyText = shareComment && shareComment.trim().length>0 ? `${shareComment.trim()}\n` : '';
                        const msg = `${bodyText}予約を共有します。${r.park_name} / ${startDate.toLocaleString('ja-JP')} 〜 ${endDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}。[こちら](${inviteUrl})`;
                        await supabase.from('messages').insert({ sender_id:user.id, receiver_id:selectedFriend.friend_id, content: msg, read:false });
                        setMessageRefreshKey(k=>k+1);
                        setShareOpen(false);
                        alert('招待リンクを送信しました');
                      }catch(e){ console.error(e); alert('招待リンクの作成に失敗しました'); }
                    }}>送信</Button>
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

          {/* 地域掲示板コーナー（最近の出会いの下） */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <MapPin className="w-5 h-5 text-blue-600 mr-2" />
              地域掲示板
            </h2>
            <p className="text-sm text-gray-600 mb-3">地域別の情報発信、意見交換をしましょう。</p>
            <div className="flex gap-2 items-center">
              <select
                value={selectedPref}
                onChange={(e)=>setSelectedPref(e.target.value)}
                className="flex-1 border rounded px-2 py-2 text-sm"
                aria-label="都道府県を選択"
              >
                {PREFS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <Link to={`/community/boards?pref=${encodeURIComponent(selectedPref)}`}>
                <Button className="whitespace-nowrap">掲示板を開く</Button>
              </Link>
            </div>
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
                施設貸し切り予約をした場合、友達を誘ってリモート解錠リンクを共有することができます。
              </p>
            </div>
          </Card>
        </div>
      </div>
      {/* 余白は不要になったため削除 */}
    </div>
  );
}

function MessageThread({ viewerId, partnerId, refreshKey, onMarkedRead }: { viewerId: string; partnerId: string; refreshKey?: number; onMarkedRead: () => void }) {
  const [items, setItems] = useState<Array<{id:string; sender_id:string; receiver_id:string; content:string; read:boolean; created_at:string}>>([]);
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, Array<{file_url:string; file_type:string; file_name:string}>>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  // Markdown風の [テキスト](URL) をアンカーに変換し、\n を改行として表示
  const renderMessageContent = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const elements: any[] = [];
    let lastIndex = 0;

    const pushTextWithBreaks = (s: string) => {
      const lines = s.split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (line) elements.push(line);
        if (idx < lines.length - 1) elements.push(<br key={`br-${elements.length}`} />);
      });
    };

    let match: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((match = linkRegex.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      if (before) pushTextWithBreaks(before);
      elements.push(
        <a key={`a-${elements.length}`} href={match[2]} target="_blank" rel="noreferrer" className="text-black font-semibold underline">
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }
    const rest = text.slice(lastIndex);
    if (rest) pushTextWithBreaks(rest);
    return <>{elements}</>;
  };
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, read, created_at')
        .in('sender_id', [viewerId, partnerId])
        .in('receiver_id', [viewerId, partnerId])
        .order('created_at', { ascending: true });
      setItems(data || []);
      // 未読の自分宛てを既読化
      const unreadIds = (data || []).filter(m => m.receiver_id === viewerId && m.read === false).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ read: true }).in('id', unreadIds);
        onMarkedRead();
      }
      // 添付の一括取得
      const ids = (data || []).map(m => m.id);
      if (ids.length > 0) {
        const { data: atts } = await supabase
          .from('message_attachments')
          .select('message_id, file_url, file_type, file_name')
          .in('message_id', ids);
        const map: Record<string, Array<{file_url:string; file_type:string; file_name:string}>> = {};
        (atts || []).forEach(a => {
          if (!map[a.message_id as any]) map[a.message_id as any] = [];
          map[a.message_id as any].push({ file_url: a.file_url as any, file_type: a.file_type as any, file_name: a.file_name as any });
        });
        setAttachmentsMap(map);
      } else {
        setAttachmentsMap({});
      }
      // スクロールを最下部へ
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 0);
    })();
  }, [viewerId, partnerId, refreshKey]);

  return (
    <div ref={listRef} className="h-96 overflow-y-auto mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
      {items.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-4">メッセージ履歴はまだありません</div>
      ) : (
        items.map(m => (
          <div key={m.id} className={`flex ${m.sender_id===viewerId?'justify-end':'justify-start'}`}>
            <div className={`max-w-[80%] space-y-2`}>
              <div className={`px-3 py-2 rounded-lg text-sm ${m.sender_id===viewerId?'bg-blue-500 text-white':'bg-white border'}`}>{renderMessageContent(m.content)}</div>
              {attachmentsMap[m.id]?.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {attachmentsMap[m.id].map((a, i) => (
                    a.file_type === 'image' ? (
                      <a key={i} href={a.file_url} target="_blank" rel="noreferrer" className="block">
                        <img src={a.file_url} alt={a.file_name} loading="lazy" className="rounded border object-cover h-24 w-full" />
                      </a>
                    ) : (
                      <a key={i} href={a.file_url} target="_blank" rel="noreferrer" className="block text-xs text-blue-700 underline">
                        {a.file_name || '添付ファイル'}
                      </a>
                    )
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { NewsAnnouncement } from '../types';
import { supabase } from '../utils/supabase';

interface UseRealtimeNewsOptions {
  initialNews?: NewsAnnouncement[];
  limit?: number;
}

export const useRealtimeNews = ({ initialNews = [], limit = 5 }: UseRealtimeNewsOptions = {}) => {
  const [news, setNews] = useState<NewsAnnouncement[]>(initialNews);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN = 1000; // 1秒のクールダウン
  
  // AuthContextからセッション情報を取得
  const { loading: authLoading, session } = useAuth();

  const fetchNews = useCallback(async () => {
    // AuthContextのローディングが完了するまで待つ
    if (authLoading) {
      console.log('📢 Waiting for auth initialization...');
      return;
    }

    const now = Date.now();
    if (now - lastFetchTime.current < FETCH_COOLDOWN) {
      console.log('📢 News fetch skipped due to cooldown');
      return;
    }
    lastFetchTime.current = now;

    try {
      setIsLoading(true);
      setError(null);

      // 認証状態をデバッグ
      console.log('🔐 News auth session:', {
        user: session?.user?.id,
        isAuthenticated: !!session,
        email: session?.user?.email,
        authLoading
      });

      const { data, error: fetchError } = await supabase
        .from('news_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      console.log('📢 News query response:', { data: data?.length, error: fetchError });

      if (fetchError) {
        throw fetchError;
      }

      setNews(data || []);
      console.log('📢 News data fetched:', data?.length || 0, 'items');
    } catch (err) {
      console.error('❌ Failed to fetch news - DETAILED:', {
        error: err,
        message: (err as any)?.message,
        code: (err as any)?.code,
        details: (err as any)?.details
      });
      setError(String(err));
      // エラーが発生した場合は初期データを使用
      setNews(initialNews);
    } finally {
      setIsLoading(false);
    }
  }, [limit, authLoading, session, initialNews]);

  // リアルタイム購読の設定
  useEffect(() => {
    let isMounted = true;

    // 認証初期化完了を待つ
    if (authLoading) {
      console.log('📢 Auth still loading, waiting...');
      return;
    }

    // 初回データ取得
    void fetchNews();

    // リアルタイム購読を設定
    const subscription = supabase
      .channel('news_realtime_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'news_announcements'
        },
        (payload) => {
          console.log('📢 新しいお知らせが追加されました:', payload.new);
          
          if (!isMounted) return;

          const newNews = payload.new as NewsAnnouncement;
          
          // 新しいニュースを先頭に追加し、制限数を超えた場合は末尾を削除
          setNews(prevNews => {
            const updatedNews = [newNews, ...prevNews];
            return updatedNews.slice(0, limit);
          });

          // 重要なお知らせの場合は通知を表示
          if (newNews.is_important && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('重要なお知らせ', {
              body: newNews.title,
              icon: '/icons/icon.svg'
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'news_announcements'
        },
        (payload) => {
          console.log('📢 お知らせが更新されました:', payload.new);
          
          if (!isMounted) return;

          const updatedNews = payload.new as NewsAnnouncement;
          
          setNews(prevNews => 
            prevNews.map(newsItem => 
              newsItem.id === updatedNews.id ? updatedNews : newsItem
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'news_announcements'
        },
        (payload) => {
          console.log('📢 お知らせが削除されました:', payload.old);
          
          if (!isMounted) return;

          const deletedNewsId = payload.old.id;
          
          setNews(prevNews => 
            prevNews.filter(newsItem => newsItem.id !== deletedNewsId)
          );
        }
      )
      .subscribe((status) => {
        console.log('🔄 News realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ ニュースリアルタイム機能が有効になりました！');
        }
      });

    // 通知許可をリクエスト（初回のみ）
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission().then(permission => {
        console.log('ニュース通知許可:', permission);
      });
    }

    // クリーンアップ
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchNews, authLoading]);

  // 手動更新
  const refreshNews = useCallback(() => {
    void fetchNews();
  }, [fetchNews]);

  return {
    news,
    isLoading,
    error,
    refreshNews
  };
};

export default useRealtimeNews; 
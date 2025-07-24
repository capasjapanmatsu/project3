import { useCallback, useEffect, useRef, useState } from 'react';
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

  // リアルタイム購読の設定
  useEffect(() => {
    let isMounted = true;

    // 初期データ取得をインライン定義
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('📢 初期ニュースデータ取得を開始...');

        const { data, error: fetchError } = await supabase
          .from('news_announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fetchError) {
          console.error('📢 ニュースデータ取得エラー:', fetchError);
          throw fetchError;
        }

        if (isMounted) {
          setNews(data || []);
          console.log('📢 初期ニュースデータ取得完了:', data?.length || 0, 'items');
          // 初回取得時にクールダウンタイマーを設定
          lastFetchTime.current = Date.now();
        }
      } catch (err) {
        console.warn('📢 初期ニュースデータ取得失敗:', err);
        if (isMounted) {
          setError(String(err));
          // エラーが発生した場合は初期データを使用
          setNews(initialNews);
          console.log('📢 フォールバックニュースデータを使用:', initialNews.length, 'items');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // 初回データ取得
    void fetchInitialData();

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
          console.log('📢 新しいお知らせが投稿されました:', payload.new);
          
          if (!isMounted) return;

          const newNews = payload.new as NewsAnnouncement;
          
          // 新しいお知らせを先頭に追加し、制限数を超えた場合は末尾を削除
          setNews(prevNews => {
            const updatedNews = [newNews, ...prevNews];
            return updatedNews.slice(0, limit);
          });

          // 新着通知（オプション）
          if ('Notification' in window && Notification.permission === 'granted') {
            void new Notification('新しいお知らせ', {
              body: newNews.title,
              icon: '/favicon.svg',
              tag: 'new-news'
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
            prevNews.map(news => 
              news.id === updatedNews.id ? updatedNews : news
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

          const deletedNewsId = (payload.old as NewsAnnouncement).id;
          
          setNews(prevNews => 
            prevNews.filter(news => news.id !== deletedNewsId)
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
        console.log('通知許可:', permission);
      });
    }

    // クリーンアップ
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [limit, initialNews]); // 必要な依存関係のみ

  // 手動更新
  const refreshNews = useCallback(async () => {
    // クールダウン期間中は実行しない
    const now = Date.now();
    if (now - lastFetchTime.current < FETCH_COOLDOWN) {
      console.log('📢 News refresh skipped due to cooldown');
      return;
    }
    lastFetchTime.current = now;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('news_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        throw fetchError;
      }

      setNews(data || []);
      console.log('📢 News data refreshed:', data?.length || 0, 'items');
    } catch (err) {
      console.warn('Failed to refresh news:', err);
      setError(String(err));
      // エラーが発生した場合は初期データを使用
      setNews(initialNews);
    } finally {
      setIsLoading(false);
    }
  }, [limit, initialNews]);

  return {
    news,
    isLoading,
    error,
    refreshNews
  };
};

export default useRealtimeNews; 
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Dog } from '../types';
import { supabase } from '../utils/supabase';

interface UseRealtimeDogsOptions {
  initialDogs?: Dog[];
  limit?: number;
}

export const useRealtimeDogs = ({ initialDogs = [], limit = 8 }: UseRealtimeDogsOptions = {}) => {
  const [dogs, setDogs] = useState<Dog[]>(initialDogs);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN = 1000; // 1秒のクールダウン
  
  // AuthContextからセッション情報を取得
  const { loading: authLoading, session } = useAuth();
  // リアルタイム購読の設定
  useEffect(() => {
    let isMounted = true;

    // 認証初期化完了を待つ
    if (authLoading) {
      console.log('🐕 Auth still loading, waiting...');
      return;
    }

    // 初期データ取得をインライン定義
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('🐕 初期データ取得を開始...');

        const { data, error: fetchError } = await supabase
          .from('dogs')
          .select('id, owner_id, name, breed, birth_date, gender, image_url, created_at')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fetchError) {
          console.error('🐕 データ取得エラー:', fetchError);
          throw fetchError;
        }

        if (isMounted) {
          setDogs(data || []);
          console.log('🐕 初期データ取得完了:', data?.length || 0, 'dogs');
          // 初回取得時にクールダウンタイマーを設定
          lastFetchTime.current = Date.now();
        }
      } catch (err) {
        console.warn('🐕 初期データ取得失敗:', err);
        if (isMounted) {
          setError(String(err));
          // エラーが発生した場合は初期データを使用
          setDogs(initialDogs);
          console.log('🐕 フォールバックデータを使用:', initialDogs.length, 'dogs');
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
      .channel('dogs_realtime_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dogs'
        },
        (payload) => {
          console.log('🐕 新しいワンちゃんが登録されました:', payload.new);
          
          if (!isMounted) return;

          const newDog = payload.new as Dog;
          
          // 新しい犬を先頭に追加し、制限数を超えた場合は末尾を削除
          setDogs(prevDogs => {
            const updatedDogs = [newDog, ...prevDogs];
            return updatedDogs.slice(0, limit);
          });

          // 通知を表示（ブラウザがサポートしている場合）
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('新しいワンちゃんが仲間入り！', {
              body: `${newDog.name}ちゃんが登録されました`,
              icon: newDog.image_url || '/icons/icon.svg'
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dogs'
        },
        (payload) => {
          console.log('🐕 ワンちゃん情報が更新されました:', payload.new);
          
          if (!isMounted) return;

          const updatedDog = payload.new as Dog;
          
          setDogs(prevDogs => 
            prevDogs.map(dog => 
              dog.id === updatedDog.id ? updatedDog : dog
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'dogs'
        },
        (payload) => {
          console.log('🐕 ワンちゃんが削除されました:', payload.old);
          
          if (!isMounted) return;

          const deletedDogId = payload.old.id;
          
          setDogs(prevDogs => 
            prevDogs.filter(dog => dog.id !== deletedDogId)
          );
        }
      )
      .subscribe((status) => {
        console.log('🔄 Dogs realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ リアルタイム機能が有効になりました！');
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
  }, [limit, initialDogs, authLoading]); // 必要な依存関係を統合

  // 手動更新
  const refreshDogs = useCallback(async () => {
    // クールダウン期間中は実行しない
    const now = Date.now();
    if (now - lastFetchTime.current < FETCH_COOLDOWN) {
      console.log('🐕 Dogs refresh skipped due to cooldown');
      return;
    }
    lastFetchTime.current = now;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('dogs')
        .select('id, owner_id, name, breed, birth_date, gender, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        throw fetchError;
      }

      setDogs(data || []);
      console.log('🐕 Dogs data refreshed:', data?.length || 0, 'dogs');
    } catch (err) {
      console.warn('Failed to refresh dogs:', err);
      setError(String(err));
      // エラーが発生した場合は初期データを使用
      setDogs(initialDogs);
    } finally {
      setIsLoading(false);
    }
  }, [limit, initialDogs]);

  return {
    dogs,
    isLoading,
    error,
    refreshDogs
  };
};

export default useRealtimeDogs; 
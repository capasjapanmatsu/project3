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

  const fetchDogs = useCallback(async () => {
    // AuthContextのローディングが完了するまで待つ
    if (authLoading) {
      console.log('🐕 Waiting for auth initialization...');
      return;
    }

    const now = Date.now();
    if (now - lastFetchTime.current < FETCH_COOLDOWN) {
      console.log('🐕 Dogs fetch skipped due to cooldown');
      return;
    }
    lastFetchTime.current = now;

    try {
      setIsLoading(true);
      setError(null);

      // 認証状態をデバッグ
      console.log('🔐 Current auth session:', {
        user: session?.user?.id,
        isAuthenticated: !!session,
        email: session?.user?.email,
        authLoading
      });

      const { data, error: fetchError } = await supabase
        .from('dogs')
        .select('id, owner_id, name, breed, birth_date, gender, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      console.log('🐕 Supabase query response:', { data: data?.length, error: fetchError });

      if (fetchError) {
        throw fetchError;
      }

      setDogs(data || []);
      console.log('🐕 Dogs data fetched:', data?.length || 0, 'dogs');
    } catch (err) {
      console.error('❌ Failed to fetch dogs - DETAILED:', {
        error: err,
        message: (err as any)?.message,
        code: (err as any)?.code,
        details: (err as any)?.details
      });
      setError(String(err));
      // エラーが発生した場合は初期データを使用
      setDogs(initialDogs);
    } finally {
      setIsLoading(false);
    }
  }, [limit, authLoading, session, initialDogs]);

  // リアルタイム購読の設定
  useEffect(() => {
    let isMounted = true;

    // 認証初期化完了を待つ
    if (authLoading) {
      console.log('🐕 Auth still loading, waiting...');
      return;
    }

    // 初回データ取得
    void fetchDogs();

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
  }, [fetchDogs, authLoading]);

  // 手動更新
  const refreshDogs = useCallback(() => {
    void fetchDogs();
  }, [fetchDogs]);

  return {
    dogs,
    isLoading,
    error,
    refreshDogs
  };
};

export default useRealtimeDogs; 
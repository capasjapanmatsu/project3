import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // キャッシュ時間設定
      staleTime: 1000 * 60 * 5, // 5分
      gcTime: 1000 * 60 * 30, // 30分（ガベージコレクション時間）
      
      // リトライ設定
      retry: (failureCount, error: any) => {
        // 認証エラーはリトライしない
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // 最大3回リトライ
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // ネットワーク設定
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      // ミューテーション設定
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// QueryClient用のエラーハンドラー
export const handleQueryError = (error: unknown) => {
  console.error('Query error:', error);
  
  // エラータイプに応じた処理
  if (error instanceof Error) {
    if (error.message.includes('401')) {
      // 認証エラー - ログアウト処理
      window.location.href = '/login';
    }
  }
}; 

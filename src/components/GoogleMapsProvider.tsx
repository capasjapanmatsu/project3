import { Loader } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';

// Google Maps 初期化状態の型定義
interface GoogleMapsContextType {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  google: typeof google | null;
}

// コンテキストを作成
const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  isLoading: true,
  error: null,
  google: null,
});

// Google Maps プロバイダー props
interface GoogleMapsProviderProps {
  children: React.ReactNode;
  apiKey?: string;
  libraries?: string[];
}

/**
 * Google Maps API を1回だけ読み込む共通プロバイダー
 * アプリケーション全体で Google Maps の状態を管理
 */
export function GoogleMapsProvider({ 
  children, 
  apiKey,
  libraries = ['places'] 
}: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleInstance, setGoogleInstance] = useState<typeof google | null>(null);

  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        // APIキーの確認
        const key = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!key) {
          setError('Google Maps API キーが設定されていません');
          setIsLoading(false);
          return;
        }

        // すでに読み込み済みの場合
        if (window.google?.maps) {
          setGoogleInstance(window.google);
          setIsLoaded(true);
          setIsLoading(false);
          return;
        }

        // 読み込み中フラグをチェック（重複防止）
        if ((window as any)._googleMapsLoading) {
          // 他の読み込みが完了するまで待機
          const checkInterval = setInterval(() => {
            if (window.google?.maps) {
              clearInterval(checkInterval);
              setGoogleInstance(window.google);
              setIsLoaded(true);
              setIsLoading(false);
            }
          }, 100);
          return;
        }

        // 読み込み開始フラグを設定
        (window as any)._googleMapsLoading = true;

        // Google Maps API スクリプトを動的に読み込み
        const script = document.createElement('script');
        const librariesParam = libraries.length > 0 ? `&libraries=${libraries.join(',')}` : '';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}${librariesParam}`;
        script.async = true;
        script.defer = true;

        // 読み込み完了/エラーハンドリング
        await new Promise<void>((resolve, reject) => {
          script.onload = () => {
            (window as any)._googleMapsLoading = false;
            setGoogleInstance(window.google);
            setIsLoaded(true);
            setIsLoading(false);
            resolve();
          };

          script.onerror = () => {
            (window as any)._googleMapsLoading = false;
            const errorMsg = 'Google Maps API の読み込みに失敗しました';
            setError(errorMsg);
            setIsLoading(false);
            reject(new Error(errorMsg));
          };

          // タイムアウト設定（10秒）
          setTimeout(() => {
            if (!window.google?.maps) {
              (window as any)._googleMapsLoading = false;
              const errorMsg = 'Google Maps API の読み込みがタイムアウトしました';
              setError(errorMsg);
              setIsLoading(false);
              reject(new Error(errorMsg));
            }
          }, 10000);

          document.head.appendChild(script);
        });

      } catch (err) {
        console.error('Google Maps 初期化エラー:', err);
        setError(err instanceof Error ? err.message : 'Google Maps の初期化に失敗しました');
        setIsLoading(false);
      }
    };

    initializeGoogleMaps();
  }, [apiKey, libraries]);

  // コンテキスト値
  const contextValue: GoogleMapsContextType = {
    isLoaded,
    isLoading,
    error,
    google: googleInstance,
  };

  return (
    <GoogleMapsContext.Provider value={contextValue}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

/**
 * Google Maps の状態とインスタンスを取得するフック
 */
export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext);
  if (!context) {
    throw new Error('useGoogleMaps must be used within GoogleMapsProvider');
  }
  return context;
}

/**
 * Google Maps の読み込み状態を表示するロードingコンポーネント
 */
export function GoogleMapsLoader({ children }: { children: React.ReactNode }) {
  const { isLoaded, isLoading, error } = useGoogleMaps();

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 bg-red-50 rounded-lg">
        <div className="text-center">
          <div className="text-red-600 font-semibold mb-2">地図の読み込みに失敗</div>
          <div className="text-red-500 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <div className="text-gray-600 text-sm">地図を読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
        <div className="text-center text-gray-600 text-sm">地図を初期化中...</div>
      </div>
    );
  }

  return <>{children}</>;
}

export default GoogleMapsProvider; 
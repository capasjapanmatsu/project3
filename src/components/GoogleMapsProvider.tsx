/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Loader } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';

// Google Maps API の簡単な型定義
declare global {
  interface Window {
    google: any;
    _googleMapsLoading?: boolean;
  }
}

// Google Maps 初期化状態の型定義
interface GoogleMapsContextType {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  google: any | null;
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
 * エラーが発生してもアプリ全体は正常に動作する
 */
export function GoogleMapsProvider({ 
  children, 
  apiKey,
  libraries = ['places'] 
}: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleInstance, setGoogleInstance] = useState<any | null>(null);

  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        // APIキーの確認
        const isCapacitor = typeof window !== 'undefined' && window.location?.protocol === 'capacitor:';
        const key = apiKey 
          || (isCapacitor ? (import.meta.env.VITE_GOOGLE_MAPS_API_KEY_MOBILE || import.meta.env.VITE_GOOGLE_MAPS_API_KEY) 
                           : import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
        
        // デバッグ用ログ（本番環境でも表示）
        console.log('Google Maps 初期化開始:', {
          hasPropsApiKey: !!apiKey,
          hasEnvApiKey: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          hasMobileKey: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY_MOBILE,
          isCapacitor,
          finalKey: key ? `${key.substring(0, 6)}...` : 'なし',
          windowGoogle: !!window.google,
          windowGoogleMaps: !!window.google?.maps
        });
        
        if (!key) {
          const errorMsg = 'Google Maps API キーが設定されていません（マップ機能は利用できません）';
          console.warn(errorMsg);
          setError(errorMsg);
          setIsLoading(false);
          return; // エラーでもアプリは続行
        }

        // すでに読み込み済みの場合
        if (window.google?.maps) {
          console.log('Google Maps API既に読み込み済み');
          setGoogleInstance(window.google);
          setIsLoaded(true);
          setIsLoading(false);
          return;
        }

        // 読み込み中フラグをチェック（重複防止）
        if ((window as any)._googleMapsLoading) {
          console.log('Google Maps API読み込み中（待機）');
          // 他の読み込みが完了するまで待機
          const checkInterval = setInterval(() => {
            if (window.google?.maps) {
              clearInterval(checkInterval);
              setGoogleInstance(window.google);
              setIsLoaded(true);
              setIsLoading(false);
            }
          }, 100);
          
          // 30秒でタイムアウト
          setTimeout(() => {
            clearInterval(checkInterval);
            if (!window.google?.maps) {
              const errorMsg = 'Google Maps API読み込みタイムアウト（待機中）';
              console.warn(errorMsg);
              setError(errorMsg);
              setIsLoading(false);
            }
          }, 30000);
          return;
        }

        // 読み込み開始フラグを設定
        (window as any)._googleMapsLoading = true;
        console.log('Google Maps APIスクリプト読み込み開始');

        // Google Maps API スクリプトを動的に読み込み
        const script = document.createElement('script');
        const librariesParam = libraries.length > 0 ? `&libraries=${libraries.join(',')}` : '';
        const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${key}${librariesParam}`;
        script.src = scriptUrl;
        script.async = true;
        script.defer = true;

        console.log('Google Maps スクリプトURL:', scriptUrl.replace(key, `${key.substring(0, 6)}...`));
        
        // Promise で読み込み完了を待機（ただしアプリはブロックしない）
        const loadPromise = new Promise<void>((resolve, reject) => {
          script.onload = () => {
            console.log('Google Maps スクリプト読み込み完了');
            (window as any)._googleMapsLoading = false;
            
            if (window.google?.maps) {
              console.log('Google Maps API正常に初期化されました');
              setGoogleInstance(window.google);
              setIsLoaded(true);
              setIsLoading(false);
              resolve();
            } else {
              console.error('Google Maps スクリプトは読み込まれましたが、APIが利用できません');
              const errorMsg = 'Google Maps APIの初期化に失敗しました';
              setError(errorMsg);
              setIsLoading(false);
              reject(new Error(errorMsg));
            }
          };

          script.onerror = (event) => {
            console.error('Google Maps スクリプト読み込みエラー:', event);
            (window as any)._googleMapsLoading = false;
            const errorMsg = 'Google Maps API の読み込みに失敗しました - ネットワークエラーまたはAPIキーが無効です';
            setError(errorMsg);
            setIsLoading(false);
            reject(new Error(errorMsg));
          };

          // タイムアウト設定（30秒）
          setTimeout(() => {
            if (!window.google?.maps) {
              console.error('Google Maps API読み込みタイムアウト');
              (window as any)._googleMapsLoading = false;
              const errorMsg = 'Google Maps API の読み込みがタイムアウトしました（30秒）';
              setError(errorMsg);
              setIsLoading(false);
              reject(new Error(errorMsg));
            }
          }, 30000);

          document.head.appendChild(script);
        });

        // エラーをキャッチしてもアプリは続行
        try {
          await loadPromise;
        } catch (loadError) {
          console.warn('Google Maps読み込みエラー（アプリは続行）:', loadError);
          // エラーが発生してもアプリは正常に動作させる
        }

      } catch (error) {
        console.error('Google Maps Provider初期化エラー:', error);
        const errorMsg = error instanceof Error ? error.message : 'Google Maps の初期化で予期しないエラーが発生しました';
        setError(errorMsg);
        setIsLoading(false);
        // エラーが発生してもアプリは正常に動作させる
      }
    };

    void initializeGoogleMaps();
  }, [apiKey, libraries]);

  // コンテキスト値
  const contextValue: GoogleMapsContextType = {
    isLoaded,
    isLoading,
    error,
    google: googleInstance,
  };

  // エラーが発生してもchildrenは常に表示する
  return (
    <GoogleMapsContext.Provider value={contextValue}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

/**
 * Google Maps コンテキストを使用するフック
 */
export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext);
  if (context === undefined) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider');
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

// コンテキストをエクスポート
export { GoogleMapsContext };
export default GoogleMapsProvider; 
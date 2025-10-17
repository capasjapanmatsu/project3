/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Loader } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';
import isCapacitorNative from '../utils/isCapacitorNative';

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
  const [debugText, setDebugText] = useState<string>('');

  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        // 認証失敗（APIキー無効/リファラ不許可）を捕捉するためのグローバルハンドラ
        try {
          (window as any).gm_authFailure = () => {
            const msg = 'Google Maps 認証に失敗しました（APIキー無効、請求未設定、またはHTTPリファラの制限違反）';
            console.error(msg);
            setError(msg);
            setIsLoading(false);
          };
        } catch {}

        // APIキーの確認
        const isCapacitor = isCapacitorNative();
        const key = apiKey 
          || (isCapacitor ? (import.meta.env.VITE_GOOGLE_MAPS_API_KEY_MOBILE || import.meta.env.VITE_GOOGLE_MAPS_API_KEY) 
                           : import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
        
        // デバッグ用ログ（本番環境でも表示）
        const startInfo = {
          hasPropsApiKey: !!apiKey,
          hasEnvApiKey: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          hasMobileKey: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY_MOBILE,
          isCapacitor,
          finalKey: key ? `${key.substring(0, 6)}...` : 'なし',
          windowGoogle: !!window.google,
          windowGoogleMaps: !!window.google?.maps
        };
        console.log('Google Maps 初期化開始:', startInfo);
        setDebugText((prev) => `Google Maps 初期化開始\n${JSON.stringify(startInfo, null, 2)}\n`);
        
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
          setDebugText((prev) => prev + '既に読み込み済み\n');
          setGoogleInstance(window.google);
          setIsLoaded(true);
          setIsLoading(false);
          return;
        }

        // 読み込み中フラグをチェック（重複防止）
        if ((window as any)._googleMapsLoading) {
          console.log('Google Maps API読み込み中（待機）');
          setDebugText((prev) => prev + '読み込み中（待機）\n');
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
              setDebugText((prev) => prev + errorMsg + '\n');
              setError(errorMsg);
              setIsLoading(false);
            }
          }, 30000);
          return;
        }

        // 読み込み開始フラグを設定
        (window as any)._googleMapsLoading = true;
        console.log('Google Maps APIスクリプト読み込み開始');
        setDebugText((prev) => prev + 'スクリプト読み込み開始\n');

        // Google Maps API スクリプトを動的に読み込み
        const script = document.createElement('script');
        const librariesParam = libraries.length > 0 ? `&libraries=${libraries.join(',')}` : '';
        let scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${key}${librariesParam}`;
        script.src = scriptUrl;
        script.async = true;
        script.defer = true;

        console.log('Google Maps スクリプトURL:', scriptUrl.replace(key, `${key.substring(0, 6)}...`));
        setDebugText((prev) => prev + `URL: ${scriptUrl.replace(key, `${key.substring(0, 6)}...`)}\n`);
        
        // Promise で読み込み完了を待機（ただしアプリはブロックしない）
        const loadPromise = new Promise<void>((resolve, reject) => {
          script.onload = () => {
            console.log('Google Maps スクリプト読み込み完了');
            setDebugText((prev) => prev + 'スクリプト読み込み完了\n');
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
              setDebugText((prev) => prev + errorMsg + '\n');
              setError(errorMsg);
              setIsLoading(false);
              reject(new Error(errorMsg));
            }
          };

          script.onerror = (event) => {
            console.error('Google Maps スクリプト読み込みエラー:', event);
            setDebugText((prev) => prev + 'スクリプト読み込みエラー\n');
            (window as any)._googleMapsLoading = false;
            // フォールバック: モバイル/共通キーの切替を再試行
            try {
              const fallbackKey = isCapacitor
                ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
                : (import.meta.env.VITE_GOOGLE_MAPS_API_KEY_MOBILE || '');
              if (fallbackKey && fallbackKey !== key) {
                console.warn('Google Maps フォールバックキーで再試行');
                setDebugText((prev) => prev + 'フォールバックキーで再試行\n');
                const fallbackScript = document.createElement('script');
                const fallbackUrl = `https://maps.googleapis.com/maps/api/js?key=${fallbackKey}${librariesParam}`;
                fallbackScript.src = fallbackUrl;
                fallbackScript.async = true;
                fallbackScript.defer = true;
                fallbackScript.onload = () => {
                  (window as any)._googleMapsLoading = false;
                  if (window.google?.maps) {
                    setGoogleInstance(window.google);
                    setIsLoaded(true);
                    setIsLoading(false);
                    resolve();
                  } else {
                    const errorMsg = 'Google Maps APIの初期化に失敗しました（フォールバック）';
                    setDebugText((prev) => prev + errorMsg + '\n');
                    setError(errorMsg);
                    setIsLoading(false);
                    reject(new Error(errorMsg));
                  }
                };
                fallbackScript.onerror = () => {
                  const errorMsg = 'Google Maps API の読み込みに失敗しました（フォールバックも失敗）';
                  setDebugText((prev) => prev + errorMsg + '\n');
                  setError(errorMsg);
                  setIsLoading(false);
                  reject(new Error(errorMsg));
                };
                document.head.appendChild(fallbackScript);
                return;
              }
            } catch {}
            const errorMsg = 'Google Maps API の読み込みに失敗しました - ネットワークエラーまたはAPIキーが無効です';
            setDebugText((prev) => prev + errorMsg + '\n');
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
              setDebugText((prev) => prev + errorMsg + '\n');
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
          setDebugText((prev) => prev + '読み込みエラー（続行）\n');
          // エラーが発生してもアプリは正常に動作させる
        }

      } catch (error) {
        console.error('Google Maps Provider初期化エラー:', error);
        const errorMsg = error instanceof Error ? error.message : 'Google Maps の初期化で予期しないエラーが発生しました';
        setDebugText((prev) => prev + errorMsg + '\n');
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
      {error && (
        <div style={{position:'fixed',left:8,right:8,bottom:8,zIndex:9999}}>
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-xs whitespace-pre-wrap">
            <div className="font-semibold mb-1">Google Maps エラー</div>
            {error}
            {debugText && (
              <>
                <div className="mt-2 font-semibold">デバッグ情報</div>
                <pre className="overflow-auto max-h-40 bg-white/60 p-2 rounded border border-red-100">{debugText}</pre>
              </>
            )}
          </div>
        </div>
      )}
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
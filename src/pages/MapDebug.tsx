import { useEffect, useState } from 'react';

export function MapDebug() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      const results: string[] = [];
      
      try {
        // 1. 環境変数の確認
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
        results.push(`APIキー設定: ${apiKey ? `${String(apiKey).substring(0, 10)}...` : '未設定'}`);
        
        // 2. 環境変数の詳細
        results.push(`NODE_ENV: ${import.meta.env.NODE_ENV}`);
        results.push(`DEV: ${import.meta.env.DEV}`);
        results.push(`PROD: ${import.meta.env.PROD}`);
        
        // 3. 全環境変数の確認（VITE_で始まるもの）
        const viteEnvs = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'));
        results.push(`VITE環境変数: ${viteEnvs.join(', ')}`);
        
        // 4. Google Maps APIの状態確認
        const googleObj = (window as any).google as any;
        results.push(`window.google: ${!!googleObj}`);
        results.push(`window.google.maps: ${!!(googleObj?.maps)}`);
        
        // 5. Google Maps APIキーをテスト
        if (apiKey) {
          results.push('Google Maps APIキーのテスト開始...');
          
          const testScript = document.createElement('script');
          testScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
          testScript.async = true;
          
          const loadPromise = new Promise<void>((resolve, reject) => {
            testScript.onload = () => {
              results.push('✅ Google Maps API正常読み込み完了');
              const googleObjAfterLoad = (window as any).google as any;
              if (googleObjAfterLoad?.maps) {
                results.push('✅ Google Maps APIオブジェクト確認済み');
              } else {
                results.push('❌ Google Maps APIオブジェクトが見つかりません');
              }
              resolve();
            };
            
            testScript.onerror = (error) => {
              const errorMsg = error instanceof ErrorEvent ? error.message : 'Unknown error';
              results.push(`❌ Google Maps API読み込みエラー: ${errorMsg}`);
              reject(new Error(errorMsg));
            };
            
            setTimeout(() => {
              results.push('❌ Google Maps API読み込みタイムアウト（10秒）');
              reject(new Error('Timeout'));
            }, 10000);
          });
          
          document.head.appendChild(testScript);
          
          try {
            await loadPromise;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            results.push(`Google Maps API テストエラー: ${errorMsg}`);
          }
        }
        
        // 6. ネットワーク状態の確認
        results.push(`Navigator online: ${navigator.onLine}`);
        const navigatorConnection = (navigator as any).connection as any;
        results.push(`Connection type: ${navigatorConnection?.effectiveType || '不明'}`);
        
        // 7. 位置情報の確認
        if (navigator.geolocation) {
          results.push('✅ 位置情報API利用可能');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              results.push(`✅ 位置情報取得成功: ${position.coords.latitude}, ${position.coords.longitude}`);
              setTestResults([...results]);
            },
            (error) => {
              results.push(`❌ 位置情報取得エラー: ${error.message}`);
              setTestResults([...results]);
            }
          );
        } else {
          results.push('❌ 位置情報API利用不可');
        }
        
        setTestResults(results);
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push(`診断エラー: ${errorMsg}`);
        setTestResults(results);
      } finally {
        setIsLoading(false);
      }
    };

    void runDiagnostics();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Google Maps デバッグ診断</h1>
      
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">診断実行中...</p>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">診断結果</h2>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div key={index} className="font-mono text-sm bg-gray-50 p-2 rounded">
                {result}
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">簡易マップテスト</h2>
          <div 
            id="simple-map" 
            className="w-full h-64 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center"
          >
            <p className="text-gray-500">マップ読み込み待機中...</p>
          </div>
          <button 
            onClick={() => {
              const mapContainer = document.getElementById('simple-map');
              if (mapContainer && (window as any).google?.maps) {
                try {
                  new (window as any).google.maps.Map(mapContainer, {
                    center: { lat: 35.6812, lng: 139.7671 },
                    zoom: 10
                  });
                  setTestResults(prev => [...prev, '✅ 簡易マップ表示成功']);
                } catch (error) {
                  const errorMsg = error instanceof Error ? error.message : String(error);
                  setTestResults(prev => [...prev, `❌ 簡易マップ表示エラー: ${errorMsg}`]);
                }
              } else {
                setTestResults(prev => [...prev, '❌ Google Maps API未読み込み']);
              }
            }}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            簡易マップをテスト
          </button>
        </div>
      </div>
    </div>
  );
} 
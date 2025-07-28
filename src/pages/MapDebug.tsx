/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { useEffect, useState } from 'react';

export function MapDebug() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = () => {
      const results: string[] = [];
      
      try {
        // 1. 環境変数の確認
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
        results.push(`APIキー設定: ${apiKey ? 'あり（最初6文字: ' + apiKey.substring(0, 6) + '...)' : 'なし'}`);
        
        // 2. 環境変数の詳細
        results.push(`NODE_ENV: ${import.meta.env.NODE_ENV}`);
        results.push(`DEV: ${import.meta.env.DEV}`);
        results.push(`PROD: ${import.meta.env.PROD}`);
        
        // 3. Google Maps APIの状態確認
        const windowObj = window as any;
        const hasWindowGoogle = !!windowObj.google;
        const hasGoogleMaps = hasWindowGoogle && !!windowObj.google.maps;
        results.push(`window.google: ${hasWindowGoogle}`);
        results.push(`window.google.maps: ${hasGoogleMaps}`);
        
        // 4. ネットワーク状態の確認
        results.push(`Navigator online: ${navigator.onLine}`);
        
        // 5. 位置情報の確認
        if (navigator.geolocation) {
          results.push('位置情報API: 利用可能');
        } else {
          results.push('位置情報API: 利用不可');
        }
        
        setTestResults(results);
        
      } catch (error) {
        results.push(`診断エラー: ${String(error)}`);
        setTestResults(results);
      } finally {
        setIsLoading(false);
      }
    };

    // すぐに実行
    runDiagnostics();
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
          <h2 className="text-xl font-semibold mb-4">Google Maps スクリプトテスト</h2>
          <button 
            onClick={() => {
              const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
              if (!apiKey) {
                setTestResults(prev => [...prev, 'エラー: Google Maps APIキーが設定されていません']);
                return;
              }
              
              setTestResults(prev => [...prev, 'Google Maps APIスクリプト読み込み開始...']);
              
              const script = document.createElement('script');
              script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
              script.async = true;
              
              script.onload = () => {
                setTestResults(prev => [...prev, '✅ Google Maps APIスクリプト読み込み成功']);
                const windowObj = window as any;
                if (windowObj.google && windowObj.google.maps) {
                  setTestResults(prev => [...prev, '✅ Google Maps APIオブジェクト確認済み']);
                } else {
                  setTestResults(prev => [...prev, '❌ Google Maps APIオブジェクトが見つかりません']);
                }
              };
              
              script.onerror = () => {
                setTestResults(prev => [...prev, '❌ Google Maps APIスクリプト読み込み失敗']);
              };
              
              document.head.appendChild(script);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Google Maps APIをテスト読み込み
          </button>
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
              if (!mapContainer) {
                setTestResults(prev => [...prev, '❌ マップコンテナが見つかりません']);
                return;
              }
              
              const windowObj = window as any;
              if (!windowObj.google || !windowObj.google.maps) {
                setTestResults(prev => [...prev, '❌ Google Maps API未読み込み（上のボタンでスクリプトを読み込んでください）']);
                return;
              }
              
              try {
                new windowObj.google.maps.Map(mapContainer, {
                  center: { lat: 35.6812, lng: 139.7671 },
                  zoom: 10
                });
                setTestResults(prev => [...prev, '✅ 簡易マップ表示成功']);
              } catch (error) {
                setTestResults(prev => [...prev, `❌ 簡易マップ表示エラー: ${String(error)}`]);
              }
            }}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            簡易マップを表示
          </button>
        </div>
      </div>
    </div>
  );
} 
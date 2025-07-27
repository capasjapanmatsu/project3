import { useEffect, useState } from 'react';

export function MapDebug() {
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const runDiagnostics = async () => {
      const results: string[] = [];
      
      // 1. 環境変数の確認
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      results.push(`APIキー設定: ${apiKey ? `${apiKey.substring(0, 10)}...` : '未設定'}`);
      
      // 2. 環境変数の詳細
      results.push(`NODE_ENV: ${import.meta.env.NODE_ENV}`);
      results.push(`DEV: ${import.meta.env.DEV}`);
      results.push(`PROD: ${import.meta.env.PROD}`);
      
      // 3. 全環境変数の確認（VITE_で始まるもの）
      const viteEnvs = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'));
      results.push(`VITE環境変数: ${viteEnvs.join(', ')}`);
      
      // 4. APIキーの直接テスト
      if (apiKey) {
        try {
          const testUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
          results.push(`テストURL: ${testUrl.replace(apiKey, `${apiKey.substring(0, 10)}...`)}`);
          
          // スクリプトタグでの読み込みテスト
          const script = document.createElement('script');
          script.src = testUrl;
          script.async = true;
          script.defer = true;
          
          script.onload = () => {
            results.push('✅ Google Maps スクリプト読み込み成功');
            if (window.google?.maps) {
              results.push('✅ Google Maps API利用可能');
            } else {
              results.push('❌ Google Maps APIが利用できません');
            }
            setTestResults([...results]);
          };
          
          script.onerror = (error) => {
            results.push(`❌ Google Maps スクリプト読み込み失敗: ${error}`);
            setTestResults([...results]);
          };
          
          document.head.appendChild(script);
          
        } catch (error) {
          results.push(`❌ APIキーテストエラー: ${error}`);
        }
      } else {
        results.push('❌ APIキーが設定されていません');
      }
      
      setTestResults(results);
      setDiagnostics({
        apiKey: apiKey || 'なし',
        env: import.meta.env,
        windowGoogle: !!window.google,
        windowGoogleMaps: !!window.google?.maps
      });
    };

    runDiagnostics();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('クリップボードにコピーしました');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Google Maps デバッグ診断</h1>
          
          {/* 診断結果 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">診断結果</h2>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className={`p-2 rounded ${
                  result.includes('✅') ? 'bg-green-100 text-green-800' :
                  result.includes('❌') ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {result}
                </div>
              ))}
            </div>
          </div>

          {/* 詳細情報 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">詳細情報</h2>
            <div className="bg-gray-100 p-4 rounded overflow-auto">
              <pre className="text-sm">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </div>
            <button
              onClick={() => copyToClipboard(JSON.stringify(diagnostics, null, 2))}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              診断情報をコピー
            </button>
          </div>

          {/* 手動テスト */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">手動テスト</h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
                  if (apiKey) {
                    window.open(`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`, '_blank');
                  } else {
                    alert('APIキーが設定されていません');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Google Maps APIを新しいタブで開く
              </button>
              
              <button
                onClick={() => {
                  const results = [];
                  results.push(`現在時刻: ${new Date().toISOString()}`);
                  results.push(`User Agent: ${navigator.userAgent}`);
                  results.push(`Location: ${window.location.href}`);
                  results.push(`Screen: ${screen.width}x${screen.height}`);
                  copyToClipboard(results.join('\n'));
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 ml-2"
              >
                デバイス情報をコピー
              </button>
            </div>
          </div>

          {/* Google Maps テストマップ */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">テストマップ</h2>
            <div 
              id="test-map" 
              className="w-full h-64 bg-gray-200 rounded border"
              style={{ minHeight: '256px' }}
            >
              <div className="flex items-center justify-center h-full text-gray-500">
                マップを読み込み中...
              </div>
            </div>
            <button
              onClick={() => {
                const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
                if (apiKey && window.google?.maps) {
                  const mapElement = document.getElementById('test-map');
                  if (mapElement) {
                    new window.google.maps.Map(mapElement, {
                      center: { lat: 35.6812, lng: 139.7671 },
                      zoom: 10
                    });
                  }
                } else {
                  alert('Google Maps APIが利用できません');
                }
              }}
              className="mt-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              テストマップを表示
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
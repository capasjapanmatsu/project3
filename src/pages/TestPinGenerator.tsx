import { ArrowLeft, Send, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PinGenerator } from '../components/PinGenerator';
import useAuth from '../context/AuthContext';
import { testWebhookNotification, createTestUnlockPayload, checkWebhookEndpoint } from '../utils/webhookTest';
import Button from '../components/Button';

/**
 * PIN発行システムのテストページ
 * 開発・デバッグ用のページです
 */
export function TestPinGenerator() {
  const { user } = useAuth();
  const [webhookTestPin, setWebhookTestPin] = useState('');
  const [webhookTestLockId, setWebhookTestLockId] = useState('123456');
  const [webhookTestResult, setWebhookTestResult] = useState<string>('');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [endpointStatus, setEndpointStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // テスト用のドッグランロック情報
  const testLocks = [
    {
      id: 'lock_001',
      name: '龍田山ドッグラン - メインゲート',
      lockId: 123456
    },
    {
      id: 'lock_002', 
      name: '龍田山ドッグラン - サブゲート',
      lockId: 123457
    }
  ];

  // Webhookエンドポイントの確認
  useEffect(() => {
    checkWebhookEndpoint().then(isOnline => {
      setEndpointStatus(isOnline ? 'online' : 'offline');
    });
  }, []);

  // Webhookテスト実行
  const handleWebhookTest = async () => {
    if (!webhookTestPin || !webhookTestLockId) {
      setWebhookTestResult('❌ PINとLock IDを入力してください');
      return;
    }

    setIsTestingWebhook(true);
    setWebhookTestResult('');

    try {
      const payload = createTestUnlockPayload(webhookTestLockId, webhookTestPin, 2);
      const result = await testWebhookNotification(payload);

      if (result.success) {
        setWebhookTestResult(`✅ 成功: ${result.message}`);
      } else {
        setWebhookTestResult(`❌ 失敗: ${result.error || result.message}`);
      }
    } catch (error) {
      setWebhookTestResult(`❌ エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            ダッシュボードに戻る
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900">
            PIN発行システム テスト
          </h1>
          <p className="mt-2 text-gray-600">
            スマートロックのPIN発行機能をテストできます
          </p>
        </div>

        {/* 開発環境の警告 */}
        {import.meta.env.DEV && (
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    開発環境モード
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    {import.meta.env.VITE_SCIENER_CLIENT_ID 
                      ? 'Sciener APIクライアントIDが設定されています'
                      : '仮のPIN生成機能を使用しています。実際のスマートロック連携は行われません。'}
                  </p>
                </div>
              </div>
            </div>

            {/* 環境変数の設定状況 */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-3">
                Sciener API設定状況
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                    import.meta.env.VITE_SCIENER_CLIENT_ID ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span className="text-gray-700">
                    VITE_SCIENER_CLIENT_ID: {import.meta.env.VITE_SCIENER_CLIENT_ID ? '設定済み' : '未設定'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                    import.meta.env.VITE_SCIENER_ACCESS_TOKEN ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span className="text-gray-700">
                    VITE_SCIENER_ACCESS_TOKEN: {import.meta.env.VITE_SCIENER_ACCESS_TOKEN ? '設定済み' : '未設定'}
                  </span>
                </div>
              </div>
              {!import.meta.env.VITE_SCIENER_CLIENT_ID && (
                <div className="mt-3 p-2 bg-white rounded border border-blue-300">
                  <p className="text-xs text-blue-700">
                    実際のSciener APIを使用するには、.envファイルに以下の環境変数を設定してください：
                  </p>
                  <pre className="text-xs mt-1 text-gray-600">
                    VITE_SCIENER_CLIENT_ID=your_client_id{'\n'}
                    VITE_SCIENER_ACCESS_TOKEN=your_access_token
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ロック選択セクション */}
        <div className="space-y-6">
          {testLocks.map((lock) => (
            <div key={lock.id} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {lock.name}
              </h2>
              <PinGenerator
                lockId={lock.id}
                lockName={lock.name}
                userId={user?.id || 'test_user'}
              />
            </div>
          ))}
        </div>

        {/* 実装状況 */}
        <div className="mt-12 p-6 bg-white rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            実装状況
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-medium mr-3 mt-0.5">
                ✓
              </span>
              <div>
                <p className="font-medium text-gray-900">PIN発行UI</p>
                <p className="text-sm text-gray-600">
                  入場/退場用のPIN発行ボタンとカウントダウンタイマー
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-medium mr-3 mt-0.5">
                ✓
              </span>
              <div>
                <p className="font-medium text-gray-900">データモデル</p>
                <p className="text-sm text-gray-600">
                  AccessLog, DogRunLock等のTypeScript interface定義
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-medium mr-3 mt-0.5">
                ✓
              </span>
              <div>
                <p className="font-medium text-gray-900">Sciener API連携関数</p>
                <p className="text-sm text-gray-600">
                  keyboardPwd/add APIを呼び出す関数実装済み（モック/実API切り替え可能）
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-medium mr-3 mt-0.5">
                ✓
              </span>
              <div>
                <p className="font-medium text-gray-900">Webhook受信エンドポイント</p>
                <p className="text-sm text-gray-600">
                  lockRecord/notify Webhookでの解錠通知受信とAccessLog更新
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs font-medium mr-3 mt-0.5">
                ○
              </span>
              <div>
                <p className="font-medium text-gray-900">実際のロック操作</p>
                <p className="text-sm text-gray-600">
                  Scienerスマートロックとの実連携（未実装）
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Webhookテストセクション */}
        <div className="mt-12 p-6 bg-white rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Send className="w-5 h-5 mr-2 text-purple-600" />
            Webhook受信テスト
          </h3>

          {/* エンドポイント状態 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Webhookエンドポイント状態:
              </span>
              <div className="flex items-center">
                {endpointStatus === 'checking' ? (
                  <>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2 animate-pulse" />
                    <span className="text-sm text-yellow-700">確認中...</span>
                  </>
                ) : endpointStatus === 'online' ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-sm text-green-700">オンライン</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-sm text-red-700">オフライン</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* テストフォーム */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                テスト用PIN（6桁）
              </label>
              <input
                type="text"
                value={webhookTestPin}
                onChange={(e) => setWebhookTestPin(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lock ID
              </label>
              <input
                type="text"
                value={webhookTestLockId}
                onChange={(e) => setWebhookTestLockId(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button
              onClick={handleWebhookTest}
              disabled={isTestingWebhook || endpointStatus !== 'online'}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isTestingWebhook ? (
                <span className="flex items-center justify-center">
                  <Send className="w-5 h-5 mr-2 animate-pulse" />
                  テスト送信中...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Send className="w-5 h-5 mr-2" />
                  解錠通知をテスト送信
                </span>
              )}
            </Button>

            {/* テスト結果 */}
            {webhookTestResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                webhookTestResult.startsWith('✅') 
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="text-sm">{webhookTestResult}</p>
              </div>
            )}
          </div>

          {/* 使用方法 */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              テスト方法：
            </h4>
            <ol className="text-xs text-blue-800 space-y-1">
              <li>1. 上部のPIN発行セクションで新しいPINを発行</li>
              <li>2. 発行されたPINをコピーしてテスト用PINに入力</li>
              <li>3. Lock IDは発行時と同じものを使用</li>
              <li>4. 「解錠通知をテスト送信」ボタンをクリック</li>
              <li>5. AccessLogのステータスが更新されることを確認</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestPinGenerator;

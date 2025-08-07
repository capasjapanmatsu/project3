/**
 * Webhook受信エンドポイントのテストユーティリティ
 * 開発環境でWebhookの動作を検証するための関数
 */

import { ScienerWebhookPayload, WebhookProcessResult } from '../types/pinCode';

/**
 * WebhookエンドポイントのベースURL
 * 開発環境とプロダクション環境で切り替え
 */
function getWebhookEndpoint(): string {
  // ローカル開発時のSupabase Functions
  if (import.meta.env.DEV) {
    return 'http://localhost:54321/functions/v1/lock-record-notify';
  }
  
  // プロダクション環境
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/lock-record-notify`;
  }
  
  throw new Error('VITE_SUPABASE_URL is not defined');
}

/**
 * Webhookペイロードを送信してテスト
 * @param payload Webhook通知のペイロード
 * @returns 処理結果
 */
export async function testWebhookNotification(
  payload: ScienerWebhookPayload
): Promise<WebhookProcessResult> {
  try {
    const endpoint = getWebhookEndpoint();
    console.log('📤 Sending test webhook to:', endpoint);
    console.log('📦 Payload:', payload);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Webhook test failed:', result);
      return {
        success: false,
        message: result.message || 'Webhook test failed',
        error: result.error,
      };
    }

    console.log('✅ Webhook test successful:', result);
    return result;
  } catch (error) {
    console.error('❌ Webhook test error:', error);
    return {
      success: false,
      message: 'Failed to send webhook test',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * PIN使用通知のシミュレーション
 * 実際のSciener通知を模擬
 * 
 * @param lockId ロックID
 * @param pin 使用されたPINコード
 * @param recordType 記録タイプ（2 = 解錠成功）
 * @returns テスト用ペイロード
 */
export function createTestUnlockPayload(
  lockId: string,
  pin: string,
  recordType: number = 2
): ScienerWebhookPayload {
  return {
    lockId,
    keyboardPwd: pin,
    recordType,
    date: Date.now(),
    username: 'test_user',
  };
}

/**
 * Webhookエンドポイントの疎通確認
 * @returns エンドポイントが正常に動作しているか
 */
export async function checkWebhookEndpoint(): Promise<boolean> {
  try {
    const endpoint = getWebhookEndpoint();
    console.log('🔍 Checking webhook endpoint:', endpoint);

    // OPTIONSリクエストでCORS確認
    const response = await fetch(endpoint, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
      },
    });

    if (response.ok) {
      console.log('✅ Webhook endpoint is accessible');
      return true;
    } else {
      console.warn('⚠️ Webhook endpoint returned:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to reach webhook endpoint:', error);
    return false;
  }
}

/**
 * 複数のWebhookイベントをバッチでテスト
 * @param events テストイベントの配列
 * @returns 各イベントの処理結果
 */
export async function batchTestWebhooks(
  events: ScienerWebhookPayload[]
): Promise<WebhookProcessResult[]> {
  const results: WebhookProcessResult[] = [];
  
  for (const event of events) {
    console.log(`📤 Testing webhook ${events.indexOf(event) + 1}/${events.length}`);
    const result = await testWebhookNotification(event);
    results.push(result);
    
    // レート制限を避けるため少し待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

/**
 * AccessLogの状態遷移をテスト
 * 入場 -> 退場のフローをシミュレート
 * 
 * @param lockId ロックID
 * @param entryPin 入場用PIN
 * @param exitPin 退場用PIN
 */
export async function testFullAccessFlow(
  lockId: string,
  entryPin: string,
  exitPin: string
): Promise<void> {
  console.log('🚀 Starting full access flow test');
  
  // 1. 入場通知
  console.log('📥 Testing entry notification...');
  const entryPayload = createTestUnlockPayload(lockId, entryPin, 2);
  const entryResult = await testWebhookNotification(entryPayload);
  
  if (entryResult.success) {
    console.log('✅ Entry processed successfully');
  } else {
    console.error('❌ Entry processing failed:', entryResult.error);
    return;
  }
  
  // 2秒待機
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 2. 退場通知
  console.log('📤 Testing exit notification...');
  const exitPayload = createTestUnlockPayload(lockId, exitPin, 2);
  const exitResult = await testWebhookNotification(exitPayload);
  
  if (exitResult.success) {
    console.log('✅ Exit processed successfully');
  } else {
    console.error('❌ Exit processing failed:', exitResult.error);
  }
  
  console.log('🏁 Full access flow test completed');
}

// デフォルトエクスポート
export default {
  testWebhookNotification,
  createTestUnlockPayload,
  checkWebhookEndpoint,
  batchTestWebhooks,
  testFullAccessFlow,
};

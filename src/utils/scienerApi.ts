/**
 * Sciener EuOpen API連携用ユーティリティ
 * スマートロックのPIN管理機能を提供
 */

import {
  CreatePinParams,
  CreatePinResponse,
  DeletePinParams,
  ScienerApiResponse,
  AccessLog
} from '../types/pinCode';

// Sciener API のベースURL
const SCIENER_API_BASE_URL = 'https://euapi.sciener.com/v3';

/**
 * 6桁のランダムなPINコードを生成
 * @returns 6桁の数字文字列
 */
export function generateRandomPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * DateをUnixタイムスタンプ（ミリ秒）に変換
 * @param date 変換するDate
 * @returns Unixタイムスタンプ（ミリ秒）
 */
function dateToTimestamp(date: Date): number {
  return date.getTime();
}

/**
 * Sciener APIエラーコードのメッセージ変換
 * @param errcode エラーコード
 * @returns 日本語エラーメッセージ
 */
function getScienerErrorMessage(errcode: number): string {
  const errorMessages: { [key: number]: string } = {
    0: '成功',
    1: 'パラメータエラー',
    2: 'アクセストークンが無効です',
    3: '権限がありません',
    4: 'ロックが見つかりません',
    5: 'ロックがオフラインです',
    10: 'PINコードが既に存在します',
    11: 'PINコードの上限に達しています',
    12: 'PIN期間が無効です',
    13: 'PINコードが無効です',
    '-1': 'APIサーバーエラー'
  };

  return errorMessages[errcode] || `不明なエラー (code: ${errcode})`;
}

/**
 * スマートロックにPINコードを登録
 * Sciener EuOpen API の keyboardPwd/add エンドポイントを使用
 * 
 * @param params PIN作成パラメータ
 * @returns PIN作成結果
 */
export async function createSmartLockPin(params: CreatePinParams): Promise<CreatePinResponse> {
  try {
    // APIリクエストパラメータの構築
    const requestBody = {
      clientId: params.clientId,
      accessToken: params.accessToken,
      lockId: params.lockId,
      keyboardPwd: params.keyboardPwd,
      keyboardPwdType: 2, // 2 = 期限付きPIN
      startDate: dateToTimestamp(params.startDate),
      endDate: dateToTimestamp(params.endDate),
      addType: 2, // 2 = APIで追加
      date: Date.now()
    };

    console.log('🔐 Sciener API Request:', {
      ...requestBody,
      accessToken: '***' // セキュリティのためトークンはマスク
    });

    // APIリクエストの送信
    const response = await fetch(`${SCIENER_API_BASE_URL}/keyboardPwd/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(requestBody as any).toString()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ScienerApiResponse = await response.json();
    
    console.log('🔐 Sciener API Response:', data);

    // レスポンスの処理
    if (data.errcode === 0) {
      // 成功時のレスポンス構築
      const successResponse: CreatePinResponse = {
        success: true,
        keyboardPwdId: data.keyboardPwdId,
        lockId: params.lockId,
        keyboardPwd: params.keyboardPwd,
        startDate: params.startDate,
        endDate: params.endDate,
        status: 'active',
        message: 'PINコードが正常に登録されました'
      };

      // AccessLogとして保存可能な形式で返す
      console.log('✅ PIN created successfully:', successResponse);
      return successResponse;

    } else {
      // エラー時のレスポンス構築
      const errorMessage = getScienerErrorMessage(data.errcode);
      console.error('❌ PIN creation failed:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        status: 'failed',
        message: `PINコードの登録に失敗しました: ${errorMessage}`
      };
    }

  } catch (error) {
    // ネットワークエラーなどの処理
    console.error('❌ API call failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      status: 'error',
      message: 'APIとの通信に失敗しました'
    };
  }
}

/**
 * スマートロックからPINコードを削除
 * Sciener EuOpen API の keyboardPwd/delete エンドポイントを使用
 * 
 * @param params PIN削除パラメータ
 * @returns 削除結果
 */
export async function deleteSmartLockPin(params: DeletePinParams): Promise<{ success: boolean; message: string }> {
  try {
    const requestBody = {
      clientId: params.clientId,
      accessToken: params.accessToken,
      lockId: params.lockId,
      keyboardPwdId: params.keyboardPwdId,
      date: Date.now()
    };

    console.log('🗑️ Deleting PIN:', params.keyboardPwdId);

    const response = await fetch(`${SCIENER_API_BASE_URL}/keyboardPwd/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(requestBody as any).toString()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ScienerApiResponse = await response.json();

    if (data.errcode === 0) {
      console.log('✅ PIN deleted successfully');
      return {
        success: true,
        message: 'PINコードが正常に削除されました'
      };
    } else {
      const errorMessage = getScienerErrorMessage(data.errcode);
      console.error('❌ PIN deletion failed:', errorMessage);
      return {
        success: false,
        message: `PINコードの削除に失敗しました: ${errorMessage}`
      };
    }

  } catch (error) {
    console.error('❌ API call failed:', error);
    return {
      success: false,
      message: 'APIとの通信に失敗しました'
    };
  }
}

/**
 * CreatePinResponseをAccessLogに変換
 * データベース保存用のフォーマットに変換
 * 
 * @param response PIN作成レスポンス
 * @param userId ユーザーID
 * @param lockId ロックID（内部ID）
 * @param pinType PINの用途
 * @returns AccessLog形式のデータ
 */
export function convertToAccessLog(
  response: CreatePinResponse,
  userId: string,
  lockId: string,
  pinType: 'entry' | 'exit'
): Partial<AccessLog> {
  if (!response.success || !response.keyboardPwd) {
    throw new Error('Invalid response for AccessLog conversion');
  }

  return {
    userId,
    lockId,
    pin: response.keyboardPwd,
    pinType,
    status: pinType === 'entry' ? 'issued' : 'exit_requested',
    issuedAt: response.startDate || new Date()
  };
}

/**
 * PINコードの有効性を検証
 * 有効期限と形式をチェック
 * 
 * @param pin PINコード
 * @param expiresAt 有効期限
 * @returns 有効性の結果
 */
export function validatePin(pin: string, expiresAt: Date): { isValid: boolean; reason?: string } {
  // PIN形式の検証（6桁の数字）
  if (!/^\d{6}$/.test(pin)) {
    return {
      isValid: false,
      reason: 'PINコードは6桁の数字である必要があります'
    };
  }

  // 有効期限の検証
  const now = new Date();
  if (now > expiresAt) {
    return {
      isValid: false,
      reason: 'PINコードの有効期限が切れています'
    };
  }

  return {
    isValid: true
  };
}

/**
 * モックPIN作成（開発環境用）
 * 実際のAPI呼び出しをシミュレート
 * 
 * @param params PIN作成パラメータ
 * @returns モックレスポンス
 */
export async function createMockPin(params: CreatePinParams): Promise<CreatePinResponse> {
  // API呼び出しのシミュレート（1秒待機）
  await new Promise(resolve => setTimeout(resolve, 1000));

  // モックレスポンスの生成
  return {
    success: true,
    keyboardPwdId: Math.floor(Math.random() * 100000),
    lockId: params.lockId,
    keyboardPwd: params.keyboardPwd,
    startDate: params.startDate,
    endDate: params.endDate,
    status: 'active',
    message: '【開発環境】モックPINが生成されました'
  };
}

// デフォルトエクスポート
export default {
  createSmartLockPin,
  deleteSmartLockPin,
  generateRandomPin,
  convertToAccessLog,
  validatePin,
  createMockPin
};

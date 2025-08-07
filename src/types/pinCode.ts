/**
 * PINコード管理システムのデータモデル定義
 */

/**
 * アクセスログ
 * ドッグランへの入退場記録を管理
 */
export interface AccessLog {
  /** 一意のID */
  id: string;
  
  /** ユーザーID */
  userId: string;
  
  /** ロックID */
  lockId: string;
  
  /** PINコード */
  pin: string;
  
  /** PINの種類（入場用/退場用） */
  pinType: 'entry' | 'exit';
  
  /** 
   * PINの状態
   * - issued: 発行済み
   * - entered: 入場済み
   * - exit_requested: 退場要求中
   * - exited: 退場済み
   */
  status: 'issued' | 'entered' | 'exit_requested' | 'exited';
  
  /** PIN発行日時 */
  issuedAt: Date;
  
  /** PIN使用日時（オプション） */
  usedAt?: Date;
}

/**
 * ドッグランのロック情報
 * 物理的なスマートロックとの連携情報を管理
 */
export interface DogRunLock {
  /** 一意のID */
  id: string;
  
  /** ロック名（表示用） */
  name: string;
  
  /** ScienerのロックID（外部システム連携用） */
  lockId: number;
}

/**
 * PIN生成レスポンス
 * バックエンドからのPIN生成結果
 */
export interface PinGenerationResponse {
  /** 生成されたPIN */
  pin: string;
  
  /** PINの有効期限 */
  expiresAt: Date;
  
  /** アクセスログID */
  accessLogId: string;
  
  /** 成功フラグ */
  success: boolean;
  
  /** エラーメッセージ（エラー時のみ） */
  error?: string;
}

/**
 * PIN検証リクエスト
 * PINの妥当性を確認するためのリクエスト
 */
export interface PinValidationRequest {
  /** 検証するPIN */
  pin: string;
  
  /** ロックID */
  lockId: string;
  
  /** ユーザーID */
  userId: string;
}

/**
 * PIN検証レスポンス
 * PIN検証の結果
 */
export interface PinValidationResponse {
  /** 検証結果 */
  isValid: boolean;
  
  /** PINの種類 */
  pinType?: 'entry' | 'exit';
  
  /** アクセスログ情報 */
  accessLog?: AccessLog;
  
  /** エラーメッセージ（エラー時のみ） */
  error?: string;
}

/**
 * ロック状態
 * スマートロックの現在の状態
 */
export interface LockStatus {
  /** ロックID */
  lockId: string;
  
  /** 
   * ロック状態
   * - locked: 施錠中
   * - unlocked: 開錠中
   * - unknown: 不明
   */
  status: 'locked' | 'unlocked' | 'unknown';
  
  /** バッテリー残量（パーセント） */
  batteryLevel?: number;
  
  /** 最終更新日時 */
  lastUpdated: Date;
}

/**
 * アクセス統計
 * ドッグランの利用統計情報
 */
export interface AccessStatistics {
  /** 対象期間の開始日 */
  startDate: Date;
  
  /** 対象期間の終了日 */
  endDate: Date;
  
  /** 総入場者数 */
  totalEntries: number;
  
  /** 総退場者数 */
  totalExits: number;
  
  /** 現在の利用者数 */
  currentOccupancy: number;
  
  /** ピーク時の利用者数 */
  peakOccupancy: number;
  
  /** ピーク時刻 */
  peakTime?: Date;
}

/**
 * Sciener API: PIN作成パラメータ
 * keyboardPwd/add APIへのリクエストパラメータ
 */
export interface CreatePinParams {
  /** ScienerのクライアントID */
  clientId: string;
  
  /** アクセストークン */
  accessToken: string;
  
  /** スマートロックのID */
  lockId: string;
  
  /** 6桁のPINコード */
  keyboardPwd: string;
  
  /** 有効期間の開始日時 */
  startDate: Date;
  
  /** 有効期間の終了日時 */
  endDate: Date;
  
  /** PINの用途（入場/退場） */
  pinType: 'entry' | 'exit';
}

/**
 * Sciener API: PIN作成レスポンス
 * keyboardPwd/add APIからのレスポンス
 */
export interface CreatePinResponse {
  /** 処理の成功/失敗 */
  success: boolean;
  
  /** Sciener APIから返されるPIN ID */
  keyboardPwdId?: number;
  
  /** ロックID */
  lockId?: string;
  
  /** 発行されたPINコード */
  keyboardPwd?: string;
  
  /** 有効期間の開始日時 */
  startDate?: Date;
  
  /** 有効期間の終了日時 */
  endDate?: Date;
  
  /** ステータスコード */
  status?: string;
  
  /** メッセージ */
  message?: string;
  
  /** エラーメッセージ */
  error?: string;
}

/**
 * Sciener API: 生のAPIレスポンス
 * Sciener APIから直接返される形式
 */
export interface ScienerApiResponse {
  /** エラーコード（0は成功） */
  errcode: number;
  
  /** エラーメッセージ */
  errmsg: string;
  
  /** 生成されたPIN ID */
  keyboardPwdId?: number;
}

/**
 * Sciener API: PIN削除パラメータ
 * keyboardPwd/delete APIへのリクエストパラメータ
 */
export interface DeletePinParams {
  /** ScienerのクライアントID */
  clientId: string;
  
  /** アクセストークン */
  accessToken: string;
  
  /** 削除するPINのID */
  keyboardPwdId: number;
  
  /** スマートロックのID */
  lockId: string;
}

/**
 * Sciener Webhook: ロック記録通知
 * lockRecord/notify Webhookから受信するペイロード
 */
export interface ScienerWebhookPayload {
  /** スマートロックのID */
  lockId: string;
  
  /** 使用されたPINコード */
  keyboardPwd: string;
  
  /** 
   * 記録タイプ
   * 2: 解錠成功
   * その他: 各種イベント
   */
  recordType: number;
  
  /** イベント発生時刻（Unixタイムスタンプ、ミリ秒） */
  date: number;
  
  /** ユーザー名（オプション） */
  username?: string;
  
  /** 追加のメタデータ */
  [key: string]: any;
}

/**
 * Webhook処理結果
 * Webhook処理後のレスポンス
 */
export interface WebhookProcessResult {
  /** 処理の成功/失敗 */
  success: boolean;
  
  /** 処理メッセージ */
  message: string;
  
  /** 更新されたAccessLog */
  updatedLog?: AccessLog;
  
  /** エラー詳細 */
  error?: string;
}

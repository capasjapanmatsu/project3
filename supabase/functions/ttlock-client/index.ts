/**
 * TTLock API Client
 * TTLock社のスマートロックAPIとの統合クライアント
 */

import md5 from "npm:blueimp-md5@2.19.0";

export interface TTLockConfig {
  baseUrl?: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

export interface TTLockAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

export interface TTLockLock {
  lockId: number;
  lockName: string;
  lockMac: string;
  lockVersion: string;
  electricQuantity: number;
  lockStatus: number; // 0: 正常, 1: 異常
}

export interface TTLockPinResponse {
  keyboardPwdId: number;
  keyboardPwd: string;
}

export interface TTLockRecord {
  recordId: number;
  lockId: number;
  lockDate: number; // timestamp
  recordType: number; // 1: app, 2: PIN, 3: card, etc.
  success: number; // 1: 成功, 0: 失敗
  username?: string;
}

export class TTLockClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private username: string;
  private password: string;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: number;

  constructor(config: TTLockConfig) {
    // Cloud API v3 ベースURLは euapi.sciener.com
    this.baseUrl = config.baseUrl || "https://euapi.sciener.com";
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.username = config.username;
    this.password = config.password;
  }

  /**
   * OAuth2認証でアクセストークンを取得
   */
  async authenticate(): Promise<string> {
    try {
      const url = `${this.baseUrl}/oauth2/token`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
        body: new URLSearchParams({
          // ドキュメントは clientId/clientSecret を使用
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          username: this.username,
          // パスワードはlowercase md5が必要
          password: await md5LowerCase(this.password),
          grant_type: 'password'
        })
      });

      const raw = await response.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        console.error(`TTLock OAuth raw response (status ${response.status}) from ${url}:`, raw.slice(0, 200));
        throw new Error(`OAuth response not JSON (status ${response.status})`);
      }
      // OAuth応答は errcode が無く、access_token を直接返す
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
        this.tokenExpiresAt = Date.now() + ((data.expires_in ?? 0) * 1000);
        return data.access_token;
      }
      if (typeof data.errcode !== 'undefined' && data.errcode !== 0) {
        throw new Error(`TTLock認証失敗: ${data.errmsg || 'Unknown error'} (code: ${data.errcode})`);
      }
      throw new Error('TTLock認証応答が不正です');
    } catch (error) {
      console.error('TTLock authentication error:', error);
      throw error;
    }
  }

  /**
   * アクセストークンの有効性確認・自動更新
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiresAt || Date.now() >= this.tokenExpiresAt - 60000) {
      await this.authenticate();
    }
  }

  /**
   * ロック一覧取得
   */
  async getLocks(pageNo: number = 1, pageSize: number = 100): Promise<TTLockLock[]> {
    await this.ensureValidToken();
    
    const timestamp = Date.now();
    const url = `${this.baseUrl}/v3/lock/list?clientId=${this.clientId}&accessToken=${this.accessToken}&pageNo=${pageNo}&pageSize=${pageSize}&date=${timestamp}`;

    try {
      const response = await fetch(url, {
        method: 'GET'
      });

      const data = await response.json();
      
      if (data.errcode === 0) {
        return data.list || [];
      } else {
        throw new Error(`ロック一覧取得失敗: ${data.errmsg || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Get locks error:', error);
      throw error;
    }
  }

  /**
   * PINコード発行
   */
  async addKeyboardPassword(options: {
    lockId: number;
    password: string;
    startDate: number;
    endDate: number;
    name?: string;
    type?: number; // keyboardPwdType: 2=permanent, 3=period(default). One-timeはrandom API。
  }): Promise<TTLockPinResponse> {
    await this.ensureValidToken();
    
    const timestamp = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/v3/keyboardPwd/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
        body: new URLSearchParams({
          clientId: this.clientId,
          accessToken: this.accessToken!,
          lockId: options.lockId.toString(),
          // フィールド名は keyboardPwd
          keyboardPwd: options.password,
          keyboardPwdName: options.name || 'ドッグラン入場PIN',
          keyboardPwdType: (options.type || 3).toString(), // 3=period をデフォルト
          startDate: options.startDate.toString(),
          endDate: options.endDate.toString(),
          // ゲートウェイ経由で登録: 2
          addType: '2',
          date: timestamp.toString()
        })
      });

      const raw = await response.text();
      try {
        const data = JSON.parse(raw);
        if (data.errcode === 0) {
          return { keyboardPwdId: data.keyboardPwdId, keyboardPwd: options.password };
        }
        throw new Error(`PIN発行失敗: ${data.errmsg || 'Unknown error'} (code: ${data.errcode})`);
      } catch (e) {
        throw new Error(`TTLock response not JSON: ${raw.slice(0, 120)}...`);
      }
    } catch (error) {
      console.error('Add keyboard password error:', error);
      throw error;
    }
  }

  /**
   * 作成済みパスコード一覧を取得
   */
  async listKeyboardPasswords(lockId: number, pageNo: number = 1, pageSize: number = 50): Promise<any[]> {
    await this.ensureValidToken();
    const timestamp = Date.now();
    const url = `${this.baseUrl}/v3/lock/listKeyboardPwd?clientId=${this.clientId}&accessToken=${this.accessToken}&lockId=${lockId}&pageNo=${pageNo}&pageSize=${pageSize}&date=${timestamp}`;
    const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }});
    const data = await response.json();
    if (data.errcode === 0) return data.list || [];
    throw new Error(`listKeyboardPwd 失敗: ${data.errmsg || 'Unknown error'} (code: ${data.errcode})`);
  }

  /**
   * リモート解錠（Wi-Fiゲートウェイ経由）
   */
  async unlockLock(lockId: number): Promise<{ ok: boolean; errcode: number; errmsg?: string }> {
    await this.ensureValidToken();
    const timestamp = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/v3/lock/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body: new URLSearchParams({
          clientId: this.clientId,
          accessToken: this.accessToken!,
          lockId: lockId.toString(),
          date: timestamp.toString(),
        }),
      });

      const raw = await response.text();
      try {
        const data = JSON.parse(raw);
        if (data.errcode === 0) return { ok: true, errcode: 0 };
        return { ok: false, errcode: data.errcode, errmsg: data.errmsg };
      } catch {
        return { ok: false, errcode: -2, errmsg: `status ${response.status}; TTLock response not JSON: ${raw.slice(0, 120)}...` };
      }
    } catch (error) {
      console.error('Unlock error:', error);
      return { ok: false, errcode: -1, errmsg: String(error) };
    }
  }

  /**
   * PINコード削除
   */
  async deleteKeyboardPassword(lockId: number, keyboardPwdId: number): Promise<boolean> {
    await this.ensureValidToken();
    
    const timestamp = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/v3/keyboardPwd/delete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
        body: new URLSearchParams({
          clientId: this.clientId,
          accessToken: this.accessToken!,
          lockId: lockId.toString(),
          keyboardPwdId: keyboardPwdId.toString(),
          date: timestamp.toString()
        })
      });

      const data = await response.json();
      return data.errcode === 0;
    } catch (error) {
      console.error('Delete keyboard password error:', error);
      throw error;
    }
  }

  /**
   * 入退室ログ取得
   */
  async getLockRecords(options: {
    lockId: number;
    startDate: number;
    endDate: number;
    pageNo?: number;
    pageSize?: number;
  }): Promise<TTLockRecord[]> {
    await this.ensureValidToken();
    
    const timestamp = Date.now();
    const pageNo = options.pageNo || 1;
    const pageSize = options.pageSize || 100;
    
    const url = `${this.baseUrl}/v3/lockRecord/list?clientId=${this.clientId}&accessToken=${this.accessToken}&lockId=${options.lockId}&startDate=${options.startDate}&endDate=${options.endDate}&pageNo=${pageNo}&pageSize=${pageSize}&date=${timestamp}`;

    try {
      const response = await fetch(url, {
        method: 'GET'
      });

      const data = await response.json();
      
      if (data.errcode === 0) {
        return data.list || [];
      } else {
        throw new Error(`ログ取得失敗: ${data.errmsg || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Get lock records error:', error);
      throw error;
    }
  }

  /**
   * ロックの詳細情報取得
   */
  async getLockDetail(lockId: number): Promise<TTLockLock | null> {
    const locks = await this.getLocks();
    return locks.find(lock => lock.lockId === lockId) || null;
  }
}

// ユーティリティ関数
export function generatePinCode(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

export function formatTTLockTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
} 

// 小文字md5を生成（OAuth用）
async function md5LowerCase(input: string): Promise<string> {
  return md5(input).toLowerCase();
}
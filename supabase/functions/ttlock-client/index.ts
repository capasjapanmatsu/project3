/**
 * TTLock API Client
 * TTLock社のスマートロックAPIとの統合クライアント
 */

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
    this.baseUrl = config.baseUrl || "https://euopen.sciener.com";
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
      const response = await fetch(`${this.baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          username: this.username,
          password: this.password,
          grant_type: 'password',
          redirect_uri: 'https://your-app.com/callback' // 必須だが使用されない
        })
      });

      const data = await response.json();
      
      if (data.errcode === 0) {
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
        this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
        return data.access_token;
      } else {
        throw new Error(`TTLock認証失敗: ${data.errmsg || 'Unknown error'}`);
      }
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
    const url = `${this.baseUrl}/lock/list?clientId=${this.clientId}&accessToken=${this.accessToken}&pageNo=${pageNo}&pageSize=${pageSize}&date=${timestamp}`;

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
    type?: number; // 1: 一回限り, 2: 有効期限内繰り返し
  }): Promise<TTLockPinResponse> {
    await this.ensureValidToken();
    
    const timestamp = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/keyboardPwd/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
        body: new URLSearchParams({
          clientId: this.clientId,
          accessToken: this.accessToken!,
          lockId: options.lockId.toString(),
          password: options.password,
          startDate: options.startDate.toString(),
          endDate: options.endDate.toString(),
          date: timestamp.toString(),
          name: options.name || 'ドッグラン入場PIN',
          type: (options.type || 1).toString() // デフォルト：一回限り
        })
      });

      const data = await response.json();
      
      if (data.errcode === 0) {
        return {
          keyboardPwdId: data.keyboardPwdId,
          keyboardPwd: options.password
        };
      } else {
        throw new Error(`PIN発行失敗: ${data.errmsg || 'Unknown error'} (code: ${data.errcode})`);
      }
    } catch (error) {
      console.error('Add keyboard password error:', error);
      throw error;
    }
  }

  /**
   * PINコード削除
   */
  async deleteKeyboardPassword(lockId: number, keyboardPwdId: number): Promise<boolean> {
    await this.ensureValidToken();
    
    const timestamp = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/keyboardPwd/delete`, {
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
    
    const url = `${this.baseUrl}/lockRecord/list?clientId=${this.clientId}&accessToken=${this.accessToken}&lockId=${options.lockId}&startDate=${options.startDate}&endDate=${options.endDate}&pageNo=${pageNo}&pageSize=${pageSize}&date=${timestamp}`;

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
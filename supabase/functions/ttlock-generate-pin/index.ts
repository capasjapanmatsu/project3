import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import md5 from "npm:blueimp-md5@2.19.0";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// TTLock API Client (簡略版)
class TTLockClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private username: string;
  private password: string;
  private accessToken?: string;

  constructor() {
    // Cloud API v3 は euapi.sciener.com
    this.baseUrl = "https://euapi.sciener.com";
    this.clientId = Deno.env.get("TTLOCK_CLIENT_ID") || "";
    this.clientSecret = Deno.env.get("TTLOCK_CLIENT_SECRET") || "";
    this.username = Deno.env.get("TTLOCK_USERNAME") || "";
    this.password = Deno.env.get("TTLOCK_PASSWORD") || "";
  }

  async authenticate(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        username: this.username,
        password: md5(this.password).toLowerCase(),
        grant_type: 'password',
        
      })
    });

    const data = await response.json();
    if (data.access_token) {
      this.accessToken = data.access_token;
      return data.access_token;
    }
    if (typeof data.errcode !== 'undefined' && data.errcode !== 0) {
      throw new Error(`TTLock認証失敗: ${data.errmsg || 'Unknown error'} (code: ${data.errcode})`);
    }
    throw new Error('TTLock認証応答が不正です');
  }

  async addKeyboardPassword(options: {
    lockId: number;
    password: string;
    startDate: number;
    endDate: number;
    name?: string;
  }): Promise<{ keyboardPwdId: number }> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const timestamp = Date.now();
    const response = await fetch(`${this.baseUrl}/v3/keyboardPwd/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        clientId: this.clientId,
        accessToken: this.accessToken!,
        lockId: options.lockId.toString(),
        keyboardPwd: options.password,
        keyboardPwdName: options.name || 'ドッグラン入場PIN',
        keyboardPwdType: '3',
        startDate: options.startDate.toString(),
        endDate: options.endDate.toString(),
        addType: '2',
        date: timestamp.toString()
      })
    });

    const data = await response.json();
    if (data.errcode === 0) {
      return { keyboardPwdId: data.keyboardPwdId };
    }
    throw new Error(`PIN発行失敗: ${data.errmsg || 'Unknown error'} (code: ${data.errcode})`);
  }
}

// PIN生成用のユーティリティ関数
function generatePinCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}


serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Supabaseクライアント初期化
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // リクエストデータ取得
    const { userId, lockId, purpose = 'entry', expiryMinutes = 5 } = await req.json();

    // 認証ヘッダー確認
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("認証が必要です");
    }

    // ユーザー認証確認
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.id !== userId) {
      throw new Error("認証に失敗しました");
    }

    // スマートロック情報取得
    const { data: lock, error: lockError } = await supabase
      .from("smart_locks")
      .select(`
        *,
        dog_parks!inner(id, name)
      `)
      .eq("lock_id", lockId)
      .single();

    if (lockError || !lock) {
      console.error('Lock not found:', lockError);
      throw new Error("スマートロックが見つかりません");
    }

    // TTLockのlockIdが設定されているか確認
    if (!lock.ttlock_lock_id) {
      // デモ用：TTLockのIDがない場合は仮想的なPINを生成
      console.log('TTLock ID not configured, generating demo PIN');
      
      const pinCode = generatePinCode();
      const pinHash = await sha256Hex(pinCode);
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (expiryMinutes * 60 * 1000));

      // デモ用にデータベースに記録
      const { error: insertError } = await supabase
        .from('smart_lock_pins')
        .insert({
          lock_id: lockId,
          user_id: userId,
          pin_code: pinCode,
          pin_hash: pinHash,
          purpose: purpose,
          created_at: startDate.toISOString(),
          expires_at: endDate.toISOString(),
          is_used: false
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error('PIN記録に失敗しました');
      }

      // 入退場ログに記録
      await supabase.from("user_entry_exit_logs").insert({
        user_id: userId,
        park_id: lock.dog_parks?.id,
        action: "entry",
        pin_code: pinCode,
        lock_id: lockId,
        pin_issued_at: startDate.toISOString(),
        pin_expires_at: endDate.toISOString()
      });

      return new Response(
        JSON.stringify({
          success: true,
          pin_code: pinCode,
          expires_at: endDate.toISOString(),
          park_name: lock.dog_parks?.name || 'ドッグラン',
          demo_mode: true
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // 実際のTTLock API使用（将来の実装）
    const ttlockClient = new TTLockClient();
    const pinCode = generatePinCode();
    const pinHash = await sha256Hex(pinCode);
    // TTLock推奨に合わせ、UTCの現在時刻の時間境界〜+1時間で登録
    const now = new Date();
    const startOfHourUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      0, 0, 0
    );
    const startDate = startOfHourUtc;
    const endDate = startOfHourUtc + 60 * 60 * 1000;

    try {
      const result = await ttlockClient.addKeyboardPassword({
        lockId: parseInt(lock.ttlock_lock_id),
        password: pinCode,
        startDate,
        endDate,
        name: `ドッグラン入場PIN - ${new Date().toLocaleString('ja-JP')}`
      });

      // データベースに記録
      const { error: insertError } = await supabase
        .from('smart_lock_pins')
        .insert({
          lock_id: lockId,
          user_id: userId,
          pin_code: pinCode,
          pin_hash: pinHash,
          purpose: purpose,
          created_at: new Date().toISOString(),
          expires_at: new Date(endDate).toISOString(),
          is_used: false,
          ttlock_keyboard_pwd_id: result.keyboardPwdId
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error('PIN記録に失敗しました');
      }

      // 入退場ログに記録
      await supabase.from("user_entry_exit_logs").insert({
        user_id: userId,
        park_id: lock.dog_parks?.id,
        action: "entry",
        pin_code: pinCode,
        lock_id: lockId,
        pin_issued_at: new Date(startDate).toISOString(),
        pin_expires_at: new Date(endDate).toISOString(),
        ttlock_keyboard_pwd_id: result.keyboardPwdId
      });

      return new Response(
        JSON.stringify({
          success: true,
          pin_code: pinCode,
          expires_at: new Date(endDate).toISOString(),
          park_name: lock.dog_parks?.name || 'ドッグラン',
          ttlock_pin_id: result.keyboardPwdId
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );

    } catch (ttlockError) {
      console.error('TTLock API error:', ttlockError);
      
      // TTLock API エラー時はデモモードで動作
      const pinCode = generatePinCode();
      const pinHash = await sha256Hex(pinCode);
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (expiryMinutes * 60 * 1000));

      const { error: insertError } = await supabase
        .from('smart_lock_pins')
        .insert({
          lock_id: lockId,
          user_id: userId,
          pin_code: pinCode,
          pin_hash: pinHash,
          purpose: purpose,
          created_at: startDate.toISOString(),
          expires_at: endDate.toISOString(),
          is_used: false
        });

      if (insertError) {
        throw new Error('PIN記録に失敗しました');
      }

      return new Response(
        JSON.stringify({
          success: true,
          pin_code: pinCode,
          expires_at: endDate.toISOString(),
          park_name: lock.dog_parks?.name || 'ドッグラン',
          demo_mode: true,
          warning: 'TTLock API接続エラーのためデモモードで動作中'
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

  } catch (error) {
    console.error('PIN generation error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'PIN生成中にエラーが発生しました'
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
}); 
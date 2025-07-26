# TTLock API 統合設計書

## 🎯 概要

ドッグラン無人経営システムにおけるTTLock APIの統合設計書です。
現在の汎用スマートロック実装からTTLock専用APIへの移行を行います。

## 📊 現状分析

### 現在の実装構造
```
├── supabase/functions/
│   ├── generate-pin/          # PIN生成
│   ├── verify-pin/           # PIN検証  
│   └── open-door-lock/       # ドア開錠
├── src/components/
│   ├── DoorLockButton.tsx    # ドア操作ボタン
│   └── PinCodeGenerator.tsx  # PINコード生成UI
└── src/pages/
    └── AccessControl.tsx     # 入退場制御ページ
```

### データベーススキーマ
- `smart_locks` - スマートロック情報
- `smart_lock_pins` - 一時的なPINコード
- `user_entry_exit_logs` - 入退場ログ

## 🔧 TTLock API 仕様

### 認証フロー
- **エンドポイント**: `POST /oauth2/token`
- **必要データ**: client_id, client_secret, username, password
- **応答**: access_token, refresh_token

### 主要APIエンドポイント
| エンドポイント | 用途 | 説明 |
|---|---|---|
| `/oauth2/token` | 認証 | アクセストークン取得 |
| `/lock/list` | デバイス管理 | ロック一覧取得 |
| `/keyboardPwd/add` | PIN管理 | PINコード発行 |
| `/keyboardPwd/delete` | PIN管理 | PINコード削除 |
| `/lockRecord/list` | ログ取得 | 入退室記録取得 |

## 🏗️ 新しい実装設計

### 1. 環境変数設定
```typescript
// .env
TTLOCK_CLIENT_ID=your_client_id
TTLOCK_CLIENT_SECRET=your_client_secret  
TTLOCK_API_BASE_URL=https://euopen.sciener.com
```

### 2. TTLock API クライアント

#### `/supabase/functions/ttlock-client/index.ts`
```typescript
export class TTLockClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken?: string;

  constructor() {
    this.baseUrl = Deno.env.get("TTLOCK_API_BASE_URL") || "https://euopen.sciener.com";
    this.clientId = Deno.env.get("TTLOCK_CLIENT_ID") || "";
    this.clientSecret = Deno.env.get("TTLOCK_CLIENT_SECRET") || "";
  }

  // OAuth2認証
  async authenticate(username: string, password: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username,
        password,
        grant_type: 'password'
      })
    });
    
    const data = await response.json();
    if (data.access_token) {
      this.accessToken = data.access_token;
      return data.access_token;
    }
    throw new Error(`Authentication failed: ${data.errmsg}`);
  }

  // ロック一覧取得
  async getLocks(pageNo: number = 1, pageSize: number = 20): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/lock/list?pageNo=${pageNo}&pageSize=${pageSize}&date=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    
    const data = await response.json();
    if (data.errcode === 0) {
      return data.list || [];
    }
    throw new Error(`Failed to get locks: ${data.errmsg}`);
  }

  // PINコード発行
  async addKeyboardPassword(lockId: number, password: string, startDate: number, endDate: number, options: {
    name?: string;
    type?: number; // 1: 一回限り, 2: 有効期限内繰り返し
  } = {}): Promise<number> {
    const response = await fetch(`${this.baseUrl}/keyboardPwd/add`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: this.clientId,
        accessToken: this.accessToken,
        lockId,
        password,
        startDate,
        endDate,
        date: Date.now(),
        name: options.name || 'ドッグラン入場PIN',
        type: options.type || 2
      })
    });

    const data = await response.json();
    if (data.errcode === 0) {
      return data.keyboardPwdId;
    }
    throw new Error(`Failed to add PIN: ${data.errmsg}`);
  }

  // PINコード削除
  async deleteKeyboardPassword(lockId: number, keyboardPwdId: number): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/keyboardPwd/delete`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: this.clientId,
        accessToken: this.accessToken,
        lockId,
        keyboardPwdId,
        date: Date.now()
      })
    });

    const data = await response.json();
    return data.errcode === 0;
  }

  // 入退室ログ取得
  async getLockRecords(lockId: number, startDate: number, endDate: number, pageNo: number = 1, pageSize: number = 20): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/lockRecord/list?lockId=${lockId}&startDate=${startDate}&endDate=${endDate}&pageNo=${pageNo}&pageSize=${pageSize}&date=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });

    const data = await response.json();
    if (data.errcode === 0) {
      return data.list || [];
    }
    throw new Error(`Failed to get lock records: ${data.errmsg}`);
  }
}
```

### 3. 更新されたEdge Functions

#### `/supabase/functions/ttlock-generate-pin/index.ts`
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { TTLockClient } from "../ttlock-client/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, lockId, purpose, expiryMinutes = 5 } = await req.json();

    // ユーザー認証確認
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // スマートロック情報取得
    const { data: lock, error: lockError } = await supabase
      .from("smart_locks")
      .select("*")
      .eq("ttlock_lock_id", lockId)
      .single();

    if (lockError || !lock) {
      throw new Error("Smart lock not found");
    }

    // TTLock APIクライアント初期化
    const ttlockClient = new TTLockClient();
    
    // TTLockアカウント認証（環境変数から）
    await ttlockClient.authenticate(
      Deno.env.get("TTLOCK_USERNAME") ?? "",
      Deno.env.get("TTLOCK_PASSWORD") ?? ""
    );

    // 6桁のPINコード生成
    const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 有効期間設定
    const startDate = Date.now();
    const endDate = startDate + (expiryMinutes * 60 * 1000);

    // TTLock APIでPIN発行
    const keyboardPwdId = await ttlockClient.addKeyboardPassword(
      parseInt(lock.ttlock_lock_id),
      pinCode,
      startDate,
      endDate,
      {
        name: `ドッグラン入場PIN - ${new Date().toISOString()}`,
        type: 1 // 一回限り使用
      }
    );

    // データベースに記録
    const { error: insertError } = await supabase
      .from('ttlock_pins')
      .insert({
        lock_id: lockId,
        user_id: userId,
        pin_code: pinCode,
        ttlock_keyboard_pwd_id: keyboardPwdId,
        purpose: purpose,
        created_at: new Date().toISOString(),
        expires_at: new Date(endDate).toISOString(),
        is_used: false
      });

    if (insertError) {
      // TTLock側のPINも削除
      await ttlockClient.deleteKeyboardPassword(parseInt(lock.ttlock_lock_id), keyboardPwdId);
      throw new Error('Failed to store PIN in database');
    }

    // 入退場ログに記録
    await supabase.from("user_entry_exit_logs").insert({
      user_id: userId,
      park_id: lock.park_id,
      action: "entry",
      pin_code: pinCode,
      lock_id: lockId,
      pin_issued_at: new Date(startDate).toISOString(),
      pin_expires_at: new Date(endDate).toISOString(),
      ttlock_keyboard_pwd_id: keyboardPwdId
    });

    return new Response(
      JSON.stringify({
        success: true,
        pin_code: pinCode,
        expires_at: new Date(endDate).toISOString(),
        ttlock_pin_id: keyboardPwdId
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error('TTLock PIN generation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
```

#### `/supabase/functions/ttlock-delete-pin/index.ts`
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { TTLockClient } from "../ttlock-client/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { pinId } = await req.json();

    // PIN情報取得
    const { data: pin, error: pinError } = await supabase
      .from("ttlock_pins")
      .select(`
        *,
        smart_locks!inner(ttlock_lock_id)
      `)
      .eq("id", pinId)
      .single();

    if (pinError || !pin) {
      throw new Error("PIN not found");
    }

    // TTLock APIクライアント初期化
    const ttlockClient = new TTLockClient();
    await ttlockClient.authenticate(
      Deno.env.get("TTLOCK_USERNAME") ?? "",
      Deno.env.get("TTLOCK_PASSWORD") ?? ""
    );

    // TTLock APIでPIN削除
    const success = await ttlockClient.deleteKeyboardPassword(
      parseInt(pin.smart_locks.ttlock_lock_id),
      pin.ttlock_keyboard_pwd_id
    );

    if (success) {
      // データベースからも削除
      const { error: deleteError } = await supabase
        .from('ttlock_pins')
        .delete()
        .eq('id', pinId);

      if (deleteError) {
        throw new Error('Failed to delete PIN from database');
      }
    }

    return new Response(
      JSON.stringify({ success }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error('TTLock PIN deletion error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
```

#### `/supabase/functions/ttlock-sync-records/index.ts`
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { TTLockClient } from "../ttlock-client/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { lockId, startDate, endDate } = await req.json();

    // スマートロック情報取得
    const { data: lock, error: lockError } = await supabase
      .from("smart_locks")
      .select("*")
      .eq("lock_id", lockId)
      .single();

    if (lockError || !lock) {
      throw new Error("Smart lock not found");
    }

    // TTLock APIクライアント初期化
    const ttlockClient = new TTLockClient();
    await ttlockClient.authenticate(
      Deno.env.get("TTLOCK_USERNAME") ?? "",
      Deno.env.get("TTLOCK_PASSWORD") ?? ""
    );

    // TTLock APIから入退室記録取得
    const records = await ttlockClient.getLockRecords(
      parseInt(lock.ttlock_lock_id),
      startDate || Date.now() - (24 * 60 * 60 * 1000), // デフォルト：過去24時間
      endDate || Date.now()
    );

    // 記録をデータベースに同期
    const syncedRecords = [];
    for (const record of records) {
      const { error: insertError } = await supabase
        .from('ttlock_access_records')
        .upsert({
          ttlock_record_id: record.recordId,
          lock_id: lockId,
          access_time: new Date(record.lockDate).toISOString(),
          access_type: record.recordType, // 1: app, 2: PIN, 3: カード等
          success: record.success === 1,
          ttlock_data: record
        }, {
          onConflict: 'ttlock_record_id'
        });

      if (!insertError) {
        syncedRecords.push(record);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced_count: syncedRecords.length,
        total_records: records.length
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error('TTLock record sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
```

### 4. データベーススキーマ更新

#### 新しいテーブル
```sql
-- TTLock固有のPINテーブル
CREATE TABLE ttlock_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_id TEXT NOT NULL REFERENCES smart_locks(lock_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pin_code TEXT NOT NULL,
  ttlock_keyboard_pwd_id INTEGER NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('entry', 'exit')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT FALSE,
  UNIQUE(ttlock_keyboard_pwd_id)
);

-- TTLockアクセス記録テーブル
CREATE TABLE ttlock_access_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ttlock_record_id INTEGER UNIQUE NOT NULL,
  lock_id TEXT NOT NULL REFERENCES smart_locks(lock_id) ON DELETE CASCADE,
  access_time TIMESTAMP WITH TIME ZONE NOT NULL,
  access_type INTEGER NOT NULL, -- 1: app, 2: PIN, 3: card, etc.
  success BOOLEAN NOT NULL DEFAULT TRUE,
  ttlock_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- smart_locksテーブルの更新
ALTER TABLE smart_locks ADD COLUMN IF NOT EXISTS ttlock_lock_id TEXT;
ALTER TABLE smart_locks ADD COLUMN IF NOT EXISTS ttlock_mac_address TEXT;
ALTER TABLE smart_locks ADD COLUMN IF NOT EXISTS ttlock_admin_pwd TEXT;

-- インデックス追加
CREATE INDEX idx_ttlock_pins_user_lock ON ttlock_pins(user_id, lock_id);
CREATE INDEX idx_ttlock_pins_expires ON ttlock_pins(expires_at);
CREATE INDEX idx_ttlock_access_records_lock_time ON ttlock_access_records(lock_id, access_time);
```

### 5. フロントエンド更新

#### PinCodeGenerator コンポーネント更新
```typescript
// src/components/TTLockPinGenerator.tsx
import React, { useState } from 'react';
import { Key, Clock, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import Button from './Button';
import Card from './Card';
import { supabase } from '../utils/supabase';

interface TTLockPinGeneratorProps {
  lockId: string;
  parkName?: string;
  onSuccess?: (pinCode: string, expiresAt: string) => void;
  onError?: (error: string) => void;
}

export function TTLockPinGenerator({ 
  lockId, 
  parkName = 'ドッグラン', 
  onSuccess, 
  onError 
}: TTLockPinGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePin = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ユーザー認証が必要です');

      const { data, error } = await supabase.functions.invoke('ttlock-generate-pin', {
        body: {
          userId: user.id,
          lockId,
          purpose: 'entry',
          expiryMinutes: 5
        }
      });

      if (error) throw error;

      if (data.success) {
        setPinCode(data.pin_code);
        setExpiresAt(data.expires_at);
        onSuccess?.(data.pin_code, data.expires_at);
      } else {
        throw new Error(data.error || 'PIN生成に失敗しました');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'PIN生成中にエラーが発生しました';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMinutes = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60));
    return `${diffMinutes}分後`;
  };

  return (
    <Card className="p-6">
      <div className="text-center mb-6">
        <Key className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">入場PINコード生成</h2>
        <p className="text-gray-600">
          {parkName}への入場用PINコードを生成します
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {pinCode ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">PIN生成完了</span>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-800 mb-2 tracking-wider">
                {pinCode}
              </div>
              <div className="flex items-center justify-center text-sm text-green-700">
                <Clock className="w-4 h-4 mr-1" />
                <span>有効期限: {expiresAt && formatExpiryTime(expiresAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">ご利用方法</p>
                <p>ドッグランの入り口でこのPINコードを入力してください。</p>
                <p>このPINは一度のみ使用可能で、{expiresAt && formatExpiryTime(expiresAt)}に期限切れとなります。</p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              setPinCode(null);
              setExpiresAt(null);
            }}
            className="w-full"
            variant="secondary"
          >
            新しいPINを生成
          </Button>
        </div>
      ) : (
        <Button
          onClick={generatePin}
          isLoading={isGenerating}
          className="w-full"
          disabled={isGenerating}
        >
          <Key className="w-4 h-4 mr-2" />
          PINコードを生成
        </Button>
      )}
    </Card>
  );
}
```

### 6. AccessControl ページの更新

#### src/pages/AccessControl.tsx (TTLock対応)
```typescript
import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Users, PawPrint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { TTLockPinGenerator } from '../components/TTLockPinGenerator';
import { supabase } from '../utils/supabase';
import type { Dog, SmartLock, DogPark } from '../types';

export function AccessControl() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [smartLocks, setSmartLocks] = useState<SmartLock[]>([]);
  const [parks, setParks] = useState<DogPark[]>([]);
  const [selectedDogs, setSelectedDogs] = useState<string[]>([]);
  const [selectedLock, setSelectedLock] = useState<SmartLock | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // ユーザーの登録犬を取得
      const { data: dogsData } = await supabase
        .from('dogs')
        .select('*')
        .eq('owner_id', user.id);

      setDogs(dogsData || []);

      // アクセス可能なスマートロック一覧取得
      const { data: locksData } = await supabase
        .from('smart_locks')
        .select(`
          *,
          dog_parks!inner(id, name, address)
        `)
        .not('ttlock_lock_id', 'is', null); // TTLockに対応したロックのみ

      setSmartLocks(locksData || []);

      // パーク情報を抽出
      const parkData = locksData?.map(lock => lock.dog_parks).filter(Boolean) || [];
      setParks(parkData);

    } catch (error) {
      console.error('データ取得エラー:', error);
    }
  };

  const handlePinSuccess = (pinCode: string, expiresAt: string) => {
    console.log('PIN生成成功:', { pinCode, expiresAt });
    // 必要に応じて追加の処理
  };

  const handlePinError = (error: string) => {
    console.error('PIN生成エラー:', error);
    // エラーハンドリング
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                onClick={() => navigate(-1)}
                variant="secondary"
                size="sm"
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-2xl font-bold">入退場</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* 愛犬選択 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <PawPrint className="w-5 h-5 mr-2" />
              同伴する愛犬を選択
            </h2>
            <div className="space-y-2">
              {dogs.map(dog => (
                <label key={dog.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDogs.includes(dog.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDogs([...selectedDogs, dog.id]);
                      } else {
                        setSelectedDogs(selectedDogs.filter(id => id !== dog.id));
                      }
                    }}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">{dog.name}</div>
                    <div className="text-sm text-gray-500">{dog.breed}</div>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* スマートロック選択 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              利用するドッグランを選択
            </h2>
            <div className="space-y-2">
              {smartLocks.map(lock => (
                <label key={lock.lock_id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="smartLock"
                    checked={selectedLock?.lock_id === lock.lock_id}
                    onChange={() => setSelectedLock(lock)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">{lock.dog_parks?.name}</div>
                    <div className="text-sm text-gray-500">{lock.dog_parks?.address}</div>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* PINコード生成 */}
          {selectedLock && selectedDogs.length > 0 && (
            <TTLockPinGenerator
              lockId={selectedLock.lock_id}
              parkName={selectedLock.dog_parks?.name}
              onSuccess={handlePinSuccess}
              onError={handlePinError}
            />
          )}

        </div>
      </div>
    </div>
  );
}
```

## 🚀 実装手順

### Phase 1: 基盤構築
1. TTLock API クライアントの実装
2. 新しいデータベーススキーマの適用
3. 環境変数の設定

### Phase 2: Edge Functions 移行
1. 既存のPIN生成機能をTTLock API対応に移行
2. 新しいEdge Functionsのデプロイ
3. 動作テストと検証

### Phase 3: フロントエンド更新
1. TTLock対応のコンポーネント作成
2. AccessControlページの更新
3. UI/UXテストと調整

### Phase 4: データ移行・統合テスト
1. 既存データのTTLock形式への移行
2. 統合テストの実施
3. 本番環境での動作確認

## 🔒 セキュリティ考慮事項

1. **API認証情報の安全な管理**
   - 環境変数での管理
   - アクセストークンの適切な更新

2. **PINコードの暗号化**
   - データベース保存時の暗号化
   - 通信時のHTTPS必須

3. **アクセス制御**
   - ユーザー権限の適切な検証
   - Rate Limitingの実装

## 📊 監視・ログ

1. **API呼び出しログ**
   - TTLock API レスポンス時間
   - エラー率の監視

2. **PIN利用状況**
   - 生成・使用・期限切れの統計
   - 異常利用パターンの検出

3. **システム健全性**
   - Edge Functions実行状況
   - データベース性能監視

この設計に基づいて実装を進めることで、TTLock APIを活用した安全で効率的なドッグラン無人経営システムが構築できます。 
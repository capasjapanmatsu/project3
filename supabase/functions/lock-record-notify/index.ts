/**
 * Sciener Webhook受信エンドポイント
 * lockRecord/notify からの通知を受け取り、AccessLogを更新する
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabaseクライアントの初期化
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// CORSヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unixタイムスタンプ（ミリ秒）をISO文字列に変換
 */
function timestampToISOString(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Webhookペイロードの型定義
 */
interface ScienerWebhookPayload {
  lockId: string;
  keyboardPwd: string;
  recordType: number;
  date: number;
  username?: string;
}

/**
 * AccessLogの型定義
 */
interface AccessLog {
  id: string;
  user_id: string;
  lock_id: string;
  pin: string;
  pin_type: 'entry' | 'exit';
  status: 'issued' | 'entered' | 'exit_requested' | 'exited';
  issued_at: string;
  used_at?: string;
  expires_at: string;
  keyboard_pwd_id?: number;
}

serve(async (req) => {
  // CORSプリフライトリクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('🔔 Webhook received:', req.method, req.url);

  try {
    // POSTメソッドのみ受け付ける
    if (req.method !== 'POST') {
      console.error('❌ Invalid method:', req.method);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // リクエストボディを取得
    const payload: ScienerWebhookPayload = await req.json();
    console.log('📦 Webhook payload:', payload);

    // 必須パラメータの検証
    if (!payload.lockId || !payload.keyboardPwd || payload.recordType === undefined || !payload.date) {
      console.error('❌ Missing required parameters');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Missing required parameters',
          error: 'lockId, keyboardPwd, recordType, and date are required'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // recordType が 2（解錠成功）以外は処理しない
    if (payload.recordType !== 2) {
      console.log(`ℹ️ Ignoring non-unlock event (recordType: ${payload.recordType})`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Event type ${payload.recordType} logged but not processed`
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Supabaseクライアントの作成（Service Roleキーを使用）
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 該当するAccessLogを検索
    console.log(`🔍 Searching for AccessLog with pin: ${payload.keyboardPwd}, lockId: ${payload.lockId}`);
    
    const { data: logs, error: selectError } = await supabase
      .from('access_logs')
      .select('*')
      .eq('pin', payload.keyboardPwd)
      .eq('lock_id', payload.lockId)
      .or('status.eq.issued,status.eq.exit_requested')
      .order('issued_at', { ascending: false })
      .limit(1);

    if (selectError) {
      console.error('❌ Database select error:', selectError);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Database error',
          error: selectError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 該当するログが見つからない場合
    if (!logs || logs.length === 0) {
      console.log(`⚠️ No matching AccessLog found for pin: ${payload.keyboardPwd}, lockId: ${payload.lockId}`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No matching access log found (PIN may be from another system)'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const log = logs[0] as AccessLog;
    console.log('✅ Found AccessLog:', log.id, 'Current status:', log.status);

    // すでにused_atが設定されている場合は重複処理を防ぐ
    if (log.used_at) {
      console.log(`ℹ️ AccessLog ${log.id} already has used_at, skipping update`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Access log already processed',
          updatedLog: log
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ステータスの更新判定
    let newStatus: string;
    if (log.pin_type === 'entry' && log.status === 'issued') {
      newStatus = 'entered';
    } else if (log.pin_type === 'exit' && log.status === 'exit_requested') {
      newStatus = 'exited';
    } else {
      console.log(`⚠️ Unexpected status transition: ${log.status} -> ? (pin_type: ${log.pin_type})`);
      newStatus = log.pin_type === 'entry' ? 'entered' : 'exited';
    }

    // AccessLogを更新
    const usedAtTime = timestampToISOString(payload.date);
    console.log(`📝 Updating AccessLog ${log.id}: status -> ${newStatus}, used_at -> ${usedAtTime}`);

    const { data: updatedLog, error: updateError } = await supabase
      .from('access_logs')
      .update({
        status: newStatus,
        used_at: usedAtTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', log.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Failed to update access log',
          error: updateError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ AccessLog updated successfully:', updatedLog);

    // 入場時の追加処理（統計更新、同時利用者記録、通知生成）
    if (newStatus === 'entered' && updatedLog.dog_id && updatedLog.dog_run_id) {
      console.log('🎯 Processing entry log for community features...');
      
      try {
        // process_entry_log関数を呼び出し
        const { error: processError } = await supabase.rpc('process_entry_log', {
          p_user_id: updatedLog.user_id,
          p_dog_id: updatedLog.dog_id,
          p_dog_run_id: updatedLog.dog_run_id,
          p_used_at: usedAtTime
        });

        if (processError) {
          console.error('⚠️ Failed to process entry log:', processError);
        } else {
          console.log('✅ Entry log processed successfully');
        }
      } catch (error) {
        console.error('⚠️ Error processing entry log:', error);
      }
    }

    // 退場時の滞在時間計算
    if (newStatus === 'exited' && updatedLog.dog_run_id) {
      console.log('⏱️ Calculating stay duration...');
      
      try {
        // calculate_duration関数を呼び出し
        const { data: duration, error: durationError } = await supabase.rpc('calculate_duration', {
          p_user_id: updatedLog.user_id,
          p_dog_run_id: updatedLog.dog_run_id,
          p_exit_time: usedAtTime
        });

        if (durationError) {
          console.error('⚠️ Failed to calculate duration:', durationError);
        } else if (duration) {
          // AccessLogに滞在時間を記録
          await supabase
            .from('access_logs')
            .update({ duration })
            .eq('id', log.id);
          
          console.log(`✅ Stay duration calculated: ${duration}ms (${Math.round(duration / 60000)} minutes)`);
        }
      } catch (error) {
        console.error('⚠️ Error calculating duration:', error);
      }
    }

    // 成功レスポンス
    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Access log updated: ${newStatus}`,
        updatedLog: updatedLog
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

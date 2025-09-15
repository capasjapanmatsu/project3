import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { TTLockClient } from "../ttlock-client/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      // サーバー側でRLSを回避し、確実に設定を参照するためにService Roleを使用
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { lockId, userId, purpose = "entry", ttlockLockId, userLat, userLng, radiusKm } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("認証が必要です");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || (userId && user.id !== userId)) throw new Error("認証に失敗しました");

    // アクセス権チェック（サブスク/1Day）
    // 必要に応じてRPCへ置換可能
    let hasSubscription = false;
    try {
      const { data: sub } = await supabase
        .from("stripe_user_subscriptions")
        .select("status")
        .maybeSingle();
      hasSubscription = !!sub && (sub.status === "active" || sub.status === "trialing");
    } catch {}

    // day pass 等の追加チェックは省略（既存ロジックで実装済みのため）

    // smart_locks から TTLock 数値ID を取得
    let resolvedTtlockId: string | null = null;
    let parkId: string | null = null;
    if (ttlockLockId) {
      resolvedTtlockId = String(ttlockLockId);
    } else {
      const { data: lock, error: lockErr } = await supabase
        .from("smart_locks")
        .select("ttlock_lock_id, park_id")
        .eq("lock_id", lockId)
        .maybeSingle();
      if (lockErr || !lock?.ttlock_lock_id) throw new Error("スマートロック情報が見つかりません");
      resolvedTtlockId = String(lock.ttlock_lock_id);
      parkId = lock.park_id as any;
    }

    // 位置チェック（ジオフェンス）: ユーザー位置が提供されている場合のみ検証
    const effectiveRadiusKm = typeof radiusKm === 'number' && radiusKm > 0 ? radiusKm : (parseFloat(Deno.env.get('GEOFENCE_RADIUS_KM') || '1') || 1);
    if (typeof userLat === 'number' && typeof userLng === 'number' && parkId) {
      const { data: park, error: parkErr } = await supabase
        .from('dog_parks')
        .select('latitude, longitude, geofence_radius_km')
        .eq('id', parkId as any)
        .maybeSingle();
      if (!parkErr && park?.latitude && park?.longitude) {
        const toRad = (deg: number) => deg * (Math.PI / 180);
        const R = 6371; // km
        const dLat = toRad(park.latitude - userLat);
        const dLon = toRad(park.longitude - userLng);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(userLat)) * Math.cos(toRad(park.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c;
        const allowed = (park as any).geofence_radius_km ?? effectiveRadiusKm;
        if (dist > allowed) {
          // ログ（拒否理由: 距離超過）
          try {
            await supabase.from('lock_access_logs').insert({
              user_id: user.id,
              lock_id: lockId,
              action: 'unlock',
              status: 'error',
              timestamp: new Date().toISOString(),
              error_message: `Geofence exceeded: distance=${dist.toFixed(3)}km, allowed=${allowed}`
            });
          } catch {}
          return ok({ success: false, error: `解錠は施設から${allowed}km以内でのみ可能です（現在約${dist.toFixed(2)}km）` }, 403);
        }
      }
    } else {
      // 位置未提供の場合はエラー（クライアントにGPS必須を促す）
      try {
        await supabase.from('lock_access_logs').insert({
          user_id: user.id,
          lock_id: lockId,
          action: 'unlock',
          status: 'error',
          timestamp: new Date().toISOString(),
          error_message: 'Location not provided'
        });
      } catch {}
      return ok({ success: false, error: '解錠には位置情報（GPS）が必須です。端末の位置情報を許可してください。' }, 400);
    }

    const client = new TTLockClient({
      baseUrl: Deno.env.get("TTLOCK_BASE_URL") || "https://euapi.sciener.com",
      clientId: Deno.env.get("TTLOCK_CLIENT_ID") || "",
      clientSecret: Deno.env.get("TTLOCK_CLIENT_SECRET") || "",
      username: Deno.env.get("TTLOCK_USERNAME") || "",
      password: Deno.env.get("TTLOCK_PASSWORD") || "",
    });

    // まず発行済みのキーボードパスコードがクラウド側に反映されているか確認（デバッグ用）
    try {
      const list = await client.listKeyboardPasswords(parseInt(lock.ttlock_lock_id, 10));
      console.log('keyboardPwd list sample:', Array.isArray(list) ? list.slice(0, 2) : list);
    } catch (e) {
      console.log('listKeyboardPwd error:', e);
    }

    const result = await client.unlockLock(parseInt(resolvedTtlockId, 10));
    if (!result.ok) {
      return ok({ success: false, error: `TTLock error code ${result.errcode}${result.errmsg ? `: ${result.errmsg}` : ''}` }, 502);
    }

    // 入退場ログを記録
    await supabase.from("user_entry_exit_logs").insert({
      user_id: user.id,
      park_id: parkId,
      action: purpose,
      lock_id: lockId,
      pin_issued_at: new Date().toISOString(),
      pin_expires_at: new Date(Date.now() + 60_000).toISOString(),
      ticket_type: hasSubscription ? "subscription" : null,
    });

    // ドッグラン利用ボーナス（30P、1日1回）を付与
    try {
      await supabase.rpc('rpc_award_park_usage', { p_user: user.id });
    } catch (e) {
      console.warn('Failed to award park usage points:', e);
    }

    return ok({ success: true });
  } catch (error) {
    console.error("Unlock function error:", error);
    return ok({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});



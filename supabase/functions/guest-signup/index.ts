// deno-lint-ignore-file no-explicit-any
// Edge Function: guest-signup
// 目的: iOS（将来はAndroidも）でアプリ起動時に匿名アカウントを自動発行し、
//       email/password を返す。既存があれば再利用する。

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type RequestBody = {
  device_uuid?: string;
};

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const deviceUUID = (body.device_uuid || "").trim();
    if (!deviceUUID) {
      return new Response(JSON.stringify({ error: "device_uuid is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // email を UUID から決定（不正送信を避けるため固定ドメインを使用）
    // RFC的に有効かつ実配信しないドメインとして example.invalid を使用
    const email = `guest+${deviceUUID}@example.invalid`;

    // 既存ユーザーの再利用
    let user = null as any;
    try {
      const { data } = await admin.auth.admin.getUserByEmail(email);
      user = data?.user ?? null;
    } catch (_) {
      // getUserByEmail は見つからない場合にエラーを投げることがある
      user = null;
    }

    // 既存の場合はダミーパスを返さないため、新しいランダムパスを毎回生成
    const password = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");

    if (!user) {
      // 新規作成（メール確認済みフラグ）
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { is_guest: true, device_uuid: deviceUUID },
        app_metadata: { provider: "guest" },
      });
      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      user = created.user;

      // プロフィール行を作成（存在しない場合のみ）。RLSはservice roleで無視される
      try {
        await admin.from("profiles").insert({
          id: user.id,
          user_type: "guest",
          name: "ゲスト",
          email,
        }).onConflict("id").ignore();
      } catch (_) { /* ignore */ }

      return new Response(JSON.stringify({ email, password, created: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 既存ユーザー。プロフィールだけ念のため作成（無ければ）
    try {
      await admin.from("profiles").insert({
        id: user.id,
        user_type: "guest",
        name: "ゲスト",
        email,
      }).onConflict("id").ignore();
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ email, password, created: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});



import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { readCookie, verifySessionToken } from './_lib/session';

// 環境変数
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

// POST: LINEセッション(dpjp_session)からリンク済みの Supabase ユーザー(app_user_id)の
// Magic Link OTP を発行し、そのOTPで Supabase セッション(access_token/refresh_token)を生成して返す
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return { statusCode: 500, body: 'Server not configured' };
    }

    // 1) dpjp_session から users.id を特定
    const token = readCookie(event.headers as any);
    if (!token) return { statusCode: 401, body: 'No session' };
    const payload = await verifySessionToken(token).catch(() => null);
    const uid = (payload?.uid as string) || undefined; // users.id（LIFF側のユーザーID）
    if (!uid) return { statusCode: 401, body: 'Invalid session' };

    // 2) users テーブルから app_user_id を取得（Supabase Auth のユーザーID）
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: userRow, error: userErr } = await admin
      .from('users')
      .select('app_user_id, display_name, picture_url, id')
      .eq('id', uid)
      .single();
    if (userErr) return { statusCode: 500, body: userErr.message };
    // 常に合成メールを使用（既存ユーザーがいれば既存扱いでOK）
    const syntheticEmail = `line-${uid}@line.local`;

    // app_user_id がない場合は Supabase Auth ユーザーを作成（既存ならエラー無視）
    if (!userRow?.app_user_id) {
      const { error: createErr } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: {
          line_user_id: uid,
          display_name: userRow?.display_name ?? null,
          picture_url: userRow?.picture_url ?? null,
          provider: 'line'
        }
      });
      if (createErr && !String(createErr.message || '').toLowerCase().includes('already')) {
        return { statusCode: 500, body: createErr.message };
      }
    }

    // 3) Magic Link を発行し email_otp を取得（既存/新規どちらでも同じメール）
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: syntheticEmail
    });
    if (linkErr) return { statusCode: 500, body: linkErr.message };
    const emailOtp = (linkData as any)?.properties?.email_otp as string | undefined;
    if (!emailOtp) return { statusCode: 500, body: 'email_otp_not_issued' };

    // 5) anon クライアントで verifyOtp を実行してセッションを発行
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: sessionData, error: verifyErr } = await anon.auth.verifyOtp({
      type: 'email',
      email: syntheticEmail,
      token: emailOtp
    });
    if (verifyErr || !sessionData?.session) {
      return { statusCode: 500, body: verifyErr?.message || 'verify_failed' };
    }

    const { access_token, refresh_token, user: sessionUser } = sessionData.session as any;

    // users.app_user_id を最新のIDでリンクし、profilesを必ず用意
    try {
      const sid = sessionUser?.id as string | undefined;
      if (sid) {
        await admin.from('users').update({ app_user_id: sid }).eq('id', uid);
        // profiles が無い場合に備えて Service Role で強制UPSERT（RLS非依存）
        await admin.from('profiles').upsert({ id: sid, auth_type: 'line' } as any, { onConflict: 'id' });
      }
    } catch {}
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token, refresh_token })
    };
  } catch (e: any) {
    return { statusCode: 500, body: e.message };
  }
};

export default handler;



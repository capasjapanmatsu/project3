import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { readCookie, verifySessionToken } from './_lib/session';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

// POST { appUserId: uuid }
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 500, body: 'Not configured' };

  try {
    const { appUserId } = JSON.parse(event.body || '{}') as { appUserId?: string };
    if (!appUserId) return { statusCode: 400, body: 'Missing appUserId' };

    // セッションクッキーからLIFFユーザー(users.id)を特定
    const token = readCookie(event.headers as any);
    if (!token) return { statusCode: 401, body: 'No session' };
    const payload = await verifySessionToken(token).catch(() => null);
    const uid = (payload?.uid as string) || undefined;
    if (!uid) return { statusCode: 401, body: 'Invalid session' };

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    // 多対多リンクテーブルへ保存（重複は上書き）
    // テーブル: user_line_link(line_user_id text pk?, app_user_id uuid, updated_at)
    const { error: upsertErr } = await admin
      .from('user_line_link')
      .upsert({ line_user_id: uid, app_user_id: appUserId }, { onConflict: 'line_user_id,app_user_id' });
    if (upsertErr) return { statusCode: 500, body: upsertErr.message };

    // 旧方式の単一リンクも併記で維持（存在すれば更新）
    await admin.from('users').update({ app_user_id: appUserId }).eq('id', uid);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: 500, body: e.message };
  }
};

export default handler;



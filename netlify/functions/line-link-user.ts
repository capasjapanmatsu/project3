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
    const { error } = await admin.from('users').update({ app_user_id: appUserId }).eq('id', uid);
    if (error) return { statusCode: 500, body: error.message };

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: 500, body: e.message };
  }
};

export default handler;



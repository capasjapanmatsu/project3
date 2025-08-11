import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { buildSessionCookie, createSessionToken } from './_lib/session';

const LOGIN_CHANNEL_ID = process.env.LOGIN_CHANNEL_ID as string;
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { idToken } = JSON.parse(event.body || '{}') as { idToken?: string };
    if (!idToken) return { statusCode: 400, body: 'Missing idToken' };

    if (!LOGIN_CHANNEL_ID) return { statusCode: 500, body: 'LOGIN_CHANNEL_ID is not set' };

    // 1) verify idToken with LINE
    const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: LOGIN_CHANNEL_ID }),
    });
    const verify = await verifyRes.json() as any;
    if (!verifyRes.ok) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: verify.error_description || 'verify failed' })
      };
    }

    const lineUserId: string = verify.sub;
    const name: string | undefined = verify.name;
    const picture: string | undefined = verify.picture;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, body: 'Supabase service role not configured' };
    }

    // 2) upsert user
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: existing } = await admin.from('users').select('id').eq('line_user_id', lineUserId).single();

    let uid = existing?.id as string | undefined;
    if (!uid) {
      const { data: inserted, error } = await admin
        .from('users')
        .insert({ line_user_id: lineUserId, display_name: name ?? null, picture_url: picture ?? null })
        .select('id')
        .single();
      if (error) return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) };
      uid = inserted!.id as string;
    } else {
      await admin.from('users').update({ display_name: name ?? null, picture_url: picture ?? null }).eq('id', uid);
    }

    // 3) create session record (optional)
    try {
      await admin.from('sessions').insert({ user_id: uid, expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() });
    } catch {}

    // 4) sign cookie
    const sid = randomUUID();
    const token = await createSessionToken({ sid, uid });
    const cookie = buildSessionCookie(token);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      },
      body: JSON.stringify({ ok: true }),
    };
  } catch (e: any) {
    console.error('auth-session error', e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};

export default handler;



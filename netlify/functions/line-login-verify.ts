import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const LOGIN_CHANNEL_ID = process.env.LOGIN_CHANNEL_ID as string; // LINEログインのChannel ID（Bot用ではない）
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
const SESSION_SECRET = (process.env.SESSION_SECRET || process.env.LINE_SESSION_SECRET) as string | undefined;

function signJwtHS256(payload: Record<string, any>, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const base64url = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${base64url(header)}.${base64url(payload)}`;
  const sig = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${sig}`;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { idToken, lineUserId } = JSON.parse(event.body || '{}') as {
      idToken?: string;
      lineUserId?: string;
    };

    if (!LOGIN_CHANNEL_ID) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Missing LOGIN_CHANNEL_ID' }) };
    }

    if (!idToken || !lineUserId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'Missing idToken or lineUserId' }),
      };
    }

    // LINEの検証API
    const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: LOGIN_CHANNEL_ID,
      }),
    });

    const verify = (await verifyRes.json()) as any;
    if (!verifyRes.ok) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: verify.error_description || 'verify failed', detail: verify }),
      };
    }

    // 一致チェック（通常 verify.sub は LIFFの userId と同じ）
    if (verify.sub && verify.sub !== lineUserId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: 'userId mismatch', detail: { sub: verify.sub, lineUserId } }),
      };
    }

    console.log('[line-login] verified', {
      lineUserId,
      name: verify.name,
      email: verify.email,
      expires_in: verify.expires_in,
      amr: verify.amr,
    });

    // --- DB UPSERTはここでは行わない ---
    // 連携は /line/link-user で行うため、ログイン検証ではセッションCookieの設定のみを行う。

    // --- 自前JWT発行＆Cookie設定（7日有効） ---
    let setCookieHeader: string | undefined;
    try {
      if (SESSION_SECRET) {
        const now = Math.floor(Date.now() / 1000);
        const exp = now + 7 * 24 * 60 * 60;
        const token = signJwtHS256({ sub: lineUserId, name: verify.name ?? null, aud: 'line', iat: now, exp }, SESSION_SECRET);
        const maxAge = 7 * 24 * 60 * 60;
        setCookieHeader = `dp_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
      }
    } catch (e) {
      console.warn('[line-login] jwt issue skipped', e);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...(setCookieHeader ? { 'Set-Cookie': setCookieHeader } : {}) },
      body: JSON.stringify({ ok: true, user: { lineUserId, name: verify.name ?? null, email: verify.email ?? null } }),
    };
  } catch (err: any) {
    console.error('[line-login] error', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};

export default handler;



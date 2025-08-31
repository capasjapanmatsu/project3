import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { readCookie, verifySessionToken } from './_lib/session';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const handler: Handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  } as const;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  }

  try {
    // Verify LINE-auth session cookie
    const token = readCookie(event.headers as any);
    if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ ok: false, error: 'Auth session missing' }) };
    const payload = await verifySessionToken(token);
    const uid = (payload?.uid as string) || '';
    if (!uid) return { statusCode: 401, headers: cors, body: JSON.stringify({ ok: false, error: 'Invalid auth session' }) };

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ ok: false, error: 'Server not configured' }) };
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { notifyOptIn } = JSON.parse(event.body || '{}') as { notifyOptIn?: boolean };
    if (typeof notifyOptIn !== 'boolean') {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ ok: false, error: 'notifyOptIn boolean required' }) };
    }

    const { error } = await admin
      .from('profiles')
      .update({ notify_opt_in: notifyOptIn, updated_at: new Date().toISOString() })
      .eq('id', uid);
    if (error) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ ok: false, error: error.message }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok: false, error: e?.message || 'error' }) };
  }
};

export default handler;



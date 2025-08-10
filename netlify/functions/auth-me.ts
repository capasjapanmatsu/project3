import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { readCookie, verifySessionToken } from './_lib/session';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const handler: Handler = async (event) => {
  try {
    const token = readCookie(event.headers as any);
    if (!token) return { statusCode: 401, body: 'No session' };

    const payload = await verifySessionToken(token);
    const uid = payload.uid as string | undefined;
    if (!uid) return { statusCode: 401, body: 'Invalid session' };

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 500, body: 'Server not configured' };
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await admin
      .from('users')
      .select('id, line_user_id, display_name, picture_url')
      .eq('id', uid)
      .single();
    if (error || !data) return { statusCode: 401, body: 'User not found' };

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (e: any) {
    return { statusCode: 401, body: 'Invalid session' };
  }
};

export default handler;



import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

// POST { appUserId: uuid, lineUserId?: string }
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 500, body: 'Not configured' };

  try {
    const { appUserId, lineUserId } = JSON.parse(event.body || '{}') as { appUserId?: string; lineUserId?: string };
    if (!appUserId) return { statusCode: 400, body: 'Missing appUserId' };

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    if (lineUserId) {
      const { error } = await admin
        .from('users')
        .update({ app_user_id: appUserId })
        .eq('line_user_id', lineUserId);
      if (error) return { statusCode: 500, body: error.message };
    } else {
      // 最新のLINEログインユーザー（同名が1つ前提）: 実運用では明示のlineUserIdを推奨
      return { statusCode: 400, body: 'lineUserId required for now' };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: 500, body: e.message };
  }
};

export default handler;



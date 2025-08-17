import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  } as const;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL as string;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, headers: cors, body: 'Supabase env not set' };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { userId, title, message, linkUrl, kind } = JSON.parse(event.body || '{}');
    if (!userId || !title || !message) {
      return { statusCode: 400, headers: cors, body: 'userId, title, message are required' };
    }

    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      link_url: linkUrl ?? null,
      read: false,
    });
    if (error) throw error;

    // Optional: also forward to LINE if linked
    try {
      await fetch(`${process.env.URL || ''}/.netlify/functions/line-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: kind || 'alert', title, message, linkUrl })
      });
    } catch {}

    return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: 500, headers: cors, body: e?.message || 'Internal Error' };
  }
};



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
    const { userId, title, message, linkUrl, kind } = JSON.parse(event.body || '{}');
    if (!userId || !title || !message) {
      return { statusCode: 400, headers: cors, body: 'userId, title, message are required' };
    }

    // 1) まずLINEへフォワード（環境変数が無くても動作させる）
    try {
      const base = process.env.URL || process.env.DEPLOY_PRIME_URL || '';
      const resp = await fetch(`${base}/.netlify/functions/line-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: kind || 'alert', title, message, linkUrl, userId })
      });
      if (!resp.ok) console.warn('line-notify forward failed', await resp.text());
    } catch (fwdErr) {
      console.warn('line-notify forward error', fwdErr);
    }

    // 2) Supabaseに通知レコードを保存（ローカルでキーが無い場合はスキップ）
    const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
        const { error } = await supabase.from('notifications').insert({
          user_id: userId,
          title,
          message,
          link_url: linkUrl ?? null,
          read: false,
        });
        if (error) console.warn('notifications insert failed', error);
      } catch (insErr) {
        console.warn('supabase insert error', insErr);
      }
    }

    return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: 500, headers: cors, body: e?.message || 'Internal Error' };
  }
};



import { validateSignature, type WebhookRequestBody } from '@line/bot-sdk';
import type { Handler } from '@netlify/functions';
import { lineClient } from './_lineClient';
import { createClient } from '@supabase/supabase-js';

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET as string;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const signature = (event.headers['x-line-signature'] || event.headers['X-Line-Signature']) as string | undefined;
  const rawBody = event.body || '';

  if (!CHANNEL_SECRET || !signature) {
    return { statusCode: 400, body: 'Missing channel secret or signature' };
  }

  const ok = validateSignature(rawBody, CHANNEL_SECRET, String(signature));
  if (!ok) {
    return { statusCode: 403, body: 'Invalid signature' };
  }

  const body: WebhookRequestBody = JSON.parse(rawBody);
  await Promise.all(body.events.map(handleEvent));
  return { statusCode: 200, body: 'OK' };
};

async function handleEvent(evt: import('@line/bot-sdk').WebhookEvent) {
  const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string | undefined;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  const admin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;
  // follow
  if (evt.type === 'follow' && evt.source.type === 'user' && evt.source.userId) {
    console.log('FOLLOW userId:', evt.source.userId);
    await safeReply(evt.replyToken, '友だち追加ありがとうございます！通知設定が完了しました。');
    // 通知ONに更新（users.notify_opt_in=true）。既存がなければ挿入
    if (admin) {
      try {
        const { data } = await admin.from('users').select('id').eq('line_user_id', evt.source.userId).maybeSingle();
        if (data?.id) {
          await admin.from('users').update({ notify_opt_in: true }).eq('id', data.id);
        }
      } catch (e) { console.warn('follow upsert warn', e); }
    }
    return;
  }
  // unfollow
  if (evt.type === 'unfollow' && evt.source.type === 'user' && evt.source.userId) {
    console.log('UNFOLLOW userId:', evt.source.userId);
    if (admin) {
      try { await admin.from('users').update({ notify_opt_in: false }).eq('line_user_id', evt.source.userId); } catch {}
    }
    return;
  }
  // message:text
  if (evt.type === 'message' && evt.message.type === 'text') {
    const text = evt.message.text?.trim();
    console.log('MESSAGE:', text, 'from', evt.source.type);
    // キーワード: 停止/開始
    if (/^停止$/.test(text)) {
      if (admin && evt.source.type==='user' && evt.source.userId) {
        try { await admin.from('users').update({ notify_opt_in: false }).eq('line_user_id', evt.source.userId); } catch {}
      }
      await safeReply(evt.replyToken, '通知を停止しました。いつでも「開始」と送ると再開します。');
      return;
    }
    if (/^開始$/.test(text)) {
      if (admin && evt.source.type==='user' && evt.source.userId) {
        try { await admin.from('users').update({ notify_opt_in: true }).eq('line_user_id', evt.source.userId); } catch {}
      }
      await safeReply(evt.replyToken, '通知を再開しました。');
      return;
    }

    await safeReply(evt.replyToken, `受信: ${text}`);
    return;
  }
  console.log('Unhandled event:', JSON.stringify(evt));
}

async function safeReply(replyToken: string | undefined, message: string) {
  if (!replyToken) return;
  try {
    await lineClient.replyMessage(replyToken, { type: 'text', text: message });
  } catch (e) {
    console.error('reply error', e);
  }
}


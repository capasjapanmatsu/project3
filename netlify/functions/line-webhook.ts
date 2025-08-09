import { validateSignature, type WebhookRequestBody } from '@line/bot-sdk';
import type { Handler } from '@netlify/functions';
import { lineClient } from './_lineClient';

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
  // follow
  if (evt.type === 'follow' && evt.source.type === 'user' && evt.source.userId) {
    console.log('FOLLOW userId:', evt.source.userId);
    await safeReply(evt.replyToken, '友だち追加ありがとうございます！通知設定が完了しました。');
    // TODO: Supabaseに upsert して通知ONを記録
    // await supabase.from('user_line_link').upsert({ app_user_id, line_user_id: evt.source.userId })
    return;
  }
  // unfollow
  if (evt.type === 'unfollow' && evt.source.type === 'user' && evt.source.userId) {
    console.log('UNFOLLOW userId:', evt.source.userId);
    // TODO: Supabaseで通知OFFに更新
    // await supabase.from('user_line_link').update({ unfollowed_at: new Date().toISOString() }).eq('line_user_id', evt.source.userId)
    return;
  }
  // message:text
  if (evt.type === 'message' && evt.message.type === 'text') {
    const text = evt.message.text;
    console.log('MESSAGE:', text, 'from', evt.source.type);
    // キーワード: 停止/開始
    if (/^停止$/.test(text)) {
      // TODO: DBで通知OFFにする
      // await supabase.from('user_line_link').update({ notify: false }).eq('line_user_id', evt.source.userId)
      await safeReply(evt.replyToken, '通知を停止しました。いつでも「開始」と送ると再開します。');
      return;
    }
    if (/^開始$/.test(text)) {
      // TODO: DBで通知ONにする
      // await supabase.from('user_line_link').update({ notify: true }).eq('line_user_id', evt.source.userId)
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


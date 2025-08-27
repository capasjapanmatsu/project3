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
    await safeReplyMessages(evt.replyToken, [
      { type: 'text', text: '友だち追加ありがとうございます！通知設定が完了しました。' },
      buildMenuFlex()
    ]);
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

    // ルールベース応答
    const normalized = (text || '').toLowerCase();
    const quickItems = [
      { type: 'action', action: { type: 'message', label: 'メニュー', text: 'メニュー' } },
      { type: 'action', action: { type: 'message', label: 'サポート', text: 'サポート' } },
    ];

    const replyWith = async (message: string) =>
      safeReplyRich(evt.replyToken, message, quickItems);

    // あいさつ/メニュー
    if (/^(こんにちは|こんちは|こんばんは|おはよう|はじめまして)$/i.test(text || '') || /^(menu|メニュー)$/.test(text || '')) {
      await safeReplyMessages(evt.replyToken, [buildMenuFlex()]);
      return;
    }
    // 予約・料金・サブスクに対してはメニュー案内に誘導（個別説明は廃止）
    if (/^(予約|予約方法|どうやって予約|どうやって使う|料金|いくら|値段|price|サブスク|subscription|定額)$/i.test(text || '')) {
      await safeReplyMessages(evt.replyToken, [buildMenuFlex()]);
      return;
    }
    // サポート
    if (/^(サポート|問い合わせ|お問い合わせ|ヘルプ|help)$/i.test(text || '')) {
      await replyWith('お困りの内容を教えてください。フォームからもお問い合わせいただけます：https://dogparkjp.com/contact');
      return;
    }

    // 既定: メニュー案内
    await safeReplyMessages(evt.replyToken, [buildMenuFlex()]);
    return;
  }
  // postback
  if (evt.type === 'postback') {
    const data = evt.postback?.data || '';
    if (data === 'help') {
      await safeReplyRich(evt.replyToken, 'サポートが必要な内容を教えてください。フォームもご利用いただけます：https://dogparkjp.com/contact');
      return;
    }
    // default -> show menu
    await safeReplyMessages(evt.replyToken, [buildMenuFlex()]);
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

async function safeReplyMessages(replyToken: string | undefined, messages: any[]) {
  if (!replyToken) return;
  try {
    await lineClient.replyMessage(replyToken, messages as any);
  } catch (e) {
    console.error('reply error', e);
  }
}

async function safeReplyRich(
  replyToken: string | undefined,
  message: string,
  quickItems?: any[]
) {
  if (!replyToken) return;
  try {
    const messages: any[] = [{ type: 'text', text: message }];
    if (quickItems && quickItems.length > 0) {
      messages[0].quickReply = { items: quickItems };
    }
    await lineClient.replyMessage(replyToken, messages as any);
  } catch (e) {
    console.error('reply error', e);
  }
}

function buildMenuFlex(): any {
  const imgPng = 'https://dogparkjp.com/icons/icon_android_192x192.png';
  const makeBubble = (title: string, subtitle: string, uri: string): any => ({
    type: 'bubble',
    hero: { type: 'image', url: imgPng, size: 'full', aspectRatio: '1:1', aspectMode: 'cover', action: { type: 'uri', uri } },
    body: {
      type: 'box', layout: 'vertical', spacing: 'sm', contents: [
        { type: 'text', text: title, weight: 'bold', size: 'lg', wrap: true },
        { type: 'text', text: subtitle, size: 'sm', color: '#6b7280', wrap: true }
      ]
    },
    footer: {
      type: 'box', layout: 'vertical', contents: [
        { type: 'button', style: 'primary', color: '#06C755', action: { type: 'uri', label: '開く', uri } }
      ]
    }
  });

  return {
    type: 'flex',
    altText: 'メニュー',
    contents: {
      type: 'carousel',
      contents: [
        makeBubble('ドッグランを探す', '近くのドッグランを検索', 'https://dogparkjp.com/parks'),
        makeBubble('ワンちゃんと行ける施設', 'ショップ・病院・サロンなど', 'https://dogparkjp.com/parks?view=facilities'),
        makeBubble('コミュニティ', '飼い主同士で交流・メッセージ', 'https://dogparkjp.com/community'),
        makeBubble('入退場', 'スマートロックで入退場', 'https://dogparkjp.com/access-control')
      ]
    }
  };
}

function button(label: string, uri?: string, data?: string): any {
  if (uri) {
    return { type: 'button', action: { type: 'uri', label, uri } };
  }
  return { type: 'button', action: { type: 'postback', label, data } };
}


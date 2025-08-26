import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { lineClient } from './_lineClient';

// ---- Flex 生成ユーティリティ ----
function flexReservation(params: {
  park: string; time: string; pin?: string; mapUrl?: string; note?: string;
}) {
  const { park, time, pin, mapUrl, note } = params;
  return {
    type: 'flex',
    altText: `予約完了: ${park} ${time}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '予約完了', weight: 'bold', size: 'lg' },
          { type: 'text', text: park, size: 'md' },
          { type: 'text', text: time, size: 'sm', color: '#888888' }
        ],
        spacing: 'sm'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          ...(pin ? [{ type: 'box', layout: 'baseline', contents: [
              { type: 'text', text: '入場PIN', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: pin, weight: 'bold', size: 'md', flex: 5 }
          ]}] : []),
          ...(note ? [{ type: 'text', text: note, wrap: true }] : [])
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          ...(mapUrl ? [{
            type: 'button',
            style: 'primary',
            action: { type: 'uri', label: '地図を開く', uri: mapUrl }
          }] : []),
          {
            type: 'button',
            style: 'secondary',
            action: { type: 'message', label: 'ヘルプ', text: 'ヘルプ' }
          }
        ]
      }
    }
  } as const;
}

function textMsg(text: string) { return { type: 'text', text } as const; }

function alertWithLink(title: string, message: string, linkUrl?: string) {
  if (!linkUrl) return [textMsg(`【${title}】`), textMsg(message)] as const;
  return [
    textMsg(`【${title}】`),
    {
      type: 'flex',
      altText: title,
      contents: {
        type: 'bubble',
        body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
          { type: 'text', text: message, wrap: true }
        ]},
        footer: { type: 'box', layout: 'vertical', contents: [
          { type: 'button', style: 'primary', action: { type: 'uri', label: 'アプリで開く', uri: linkUrl } }
        ]}
      }
    } as any
  ] as const;
}

function badgeApprovedFlex(dogName: string, expires?: string) {
  return {
    type: 'flex',
    altText: '証明書承認',
    contents: {
      type: 'bubble',
      header: { type: 'box', layout: 'vertical', contents: [
        { type: 'text', text: '証明書が承認されました', weight: 'bold', size: 'lg' },
      ]},
      body: { type: 'box', layout: 'vertical', contents: [
        { type: 'text', text: `対象: ${dogName}` },
        ...(expires ? [{ type: 'text', text: `有効期限: ${expires}`, size: 'sm', color: '#888' }] : [])
      ]}
    }
  } as const;
}

// ---- ハンドラ ----
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string | undefined;
const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || process.env.VITE_PUBLIC_BASE_URL || 'https://dogparkjp.com';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const handler: Handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  } as const;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'POST only' };
  }
  try {
    // 必須: LINEアクセストークン
    if (!process.env.LINE_ACCESS_TOKEN) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ ok: false, error: 'LINE_ACCESS_TOKEN is not set' }) };
    }
    const body = event.body ? JSON.parse(event.body) : {};
    const { to, userId, lineUserId, kind = 'text' } = body as {
      to?: string; // LINE userId
      userId?: string; // app users.app_user_id（アプリのユーザーID）
      lineUserId?: string; // 直接指定
      kind?: 'text' | 'reservation' | 'badge_approved' | 'alert';
      message?: string;
      park?: string; time?: string; pin?: string; mapUrl?: string; note?: string;
      dogName?: string; expires?: string;
      title?: string;
    };

    let recipients: string[] = [];
    if (to) recipients = [to];
    // 受信者解決: app_user_id → 複数の line_user_id を許容
    if (recipients.length === 0 && (userId || lineUserId)) {
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
        if (userId) {
          // 多対多テーブル優先
          const { data: links } = await admin
            .from('user_line_link')
            .select('line_user_id')
            .eq('app_user_id', userId);
          if (links && links.length) {
            recipients = links.map((r: any) => r.line_user_id).filter(Boolean);
          }
          // 古い users テーブルの単一リンクも補助
          if (recipients.length === 0) {
            const { data } = await admin.from('users').select('line_user_id').eq('app_user_id', userId).maybeSingle();
            if (data?.line_user_id) recipients = [data.line_user_id];
          }
        } else if (lineUserId) {
          recipients = [lineUserId];
        }
      }
    }
    // 開発用フォールバック: 受信者解決に失敗したらテストユーザーへ送信
    if (recipients.length === 0) {
      const testId = process.env.LINE_TEST_USER_ID;
      if (testId) {
        recipients = [testId];
      } else {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ ok: false, error: 'No recipients resolved (user not linked to LINE?)' }) };
      }
    }

    const pushAll = async (msg: any) => {
      for (const id of recipients) {
        await lineClient.pushMessage(id, msg);
      }
    };

    if (kind === 'text') {
      await pushAll(textMsg(body.message || 'お知らせです') as any);
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    if (kind === 'reservation') {
      const msg = flexReservation({
        park: body.park ?? 'DogParkJP',
        time: body.time ?? '未指定',
        pin: body.pin,
        mapUrl: body.mapUrl,
        note: body.note
      });
      await pushAll(msg as any);
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    if (kind === 'badge_approved') {
      const msg = badgeApprovedFlex(body.dogName ?? 'わんちゃん', body.expires);
      await pushAll(msg as any);
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    if (kind === 'alert') {
      const title = body.title ?? '通知';
      const message = body.message ?? '内容はありません';
      const linkUrl = (body.linkUrl ?? body.mapUrl)?.replace('http://localhost:3000', PUBLIC_BASE);
      const msgs = alertWithLink(title, message, linkUrl);
      for (const id of recipients) {
        await lineClient.pushMessage(id, msgs as any);
      }
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: cors, body: JSON.stringify({ ok: false, error: 'Unknown kind' }) };
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : String(e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok: false, error: msg }) };
  }
};




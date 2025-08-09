import type { Handler } from '@netlify/functions';
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

function textMsg(text: string) {
  return { type: 'text', text } as const;
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
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'POST only' };
  }
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { to, kind = 'text' } = body as {
      to?: string;
      kind?: 'text' | 'reservation' | 'badge_approved' | 'alert';
      message?: string;
      park?: string; time?: string; pin?: string; mapUrl?: string; note?: string;
      dogName?: string; expires?: string;
      title?: string;
    };

    const recipient = to || process.env.LINE_TEST_USER_ID;
    if (!recipient) return { statusCode: 400, body: 'Missing "to"' };

    if (kind === 'text') {
      await lineClient.pushMessage(recipient, textMsg(body.message || 'お知らせです') as any);
      return { statusCode: 200, body: '{"ok":true}' };
    }

    if (kind === 'reservation') {
      const msg = flexReservation({
        park: body.park ?? 'DogParkJP',
        time: body.time ?? '未指定',
        pin: body.pin,
        mapUrl: body.mapUrl,
        note: body.note
      });
      await lineClient.pushMessage(recipient, msg as any);
      return { statusCode: 200, body: '{"ok":true}' };
    }

    if (kind === 'badge_approved') {
      const msg = badgeApprovedFlex(body.dogName ?? 'わんちゃん', body.expires);
      await lineClient.pushMessage(recipient, msg as any);
      return { statusCode: 200, body: '{"ok":true}' };
    }

    if (kind === 'alert') {
      const title = body.title ?? '通知';
      const message = body.message ?? '内容はありません';
      await lineClient.pushMessage(recipient, [
        textMsg(`【${title}】`),
        textMsg(message)
      ] as any);
      return { statusCode: 200, body: '{"ok":true}' };
    }

    return { statusCode: 400, body: 'Unknown "kind"' };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: '{"ok":false}' };
  }
};



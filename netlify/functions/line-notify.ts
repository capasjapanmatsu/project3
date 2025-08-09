import type { Handler } from '@netlify/functions';
import { pushReservation, pushText } from './_linePush';

/**
 * POST /line/notify
 * { to?: string, kind?: 'text' | 'reservation', message?: string, payload?: {...} }
 *  - to: 指定が無ければ LINE_TEST_USER_ID を使う
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const to = body.to || process.env.LINE_TEST_USER_ID;
    const kind = (body.kind || 'text') as 'text' | 'reservation';

    if (!to) {
      return { statusCode: 400, body: 'Missing recipient (to)' };
    }

    if (kind === 'reservation') {
      await pushReservation(to, body.payload || {});
    } else {
      await pushText(to, body.message || '通知テスト');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    console.error('line-notify error', e);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};



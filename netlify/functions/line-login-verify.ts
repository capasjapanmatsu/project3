import type { Handler } from '@netlify/functions';

const LOGIN_CHANNEL_ID = process.env.LOGIN_CHANNEL_ID as string; // LINEログインのChannel ID（Bot用ではない）

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { idToken, lineUserId } = JSON.parse(event.body || '{}') as {
      idToken?: string;
      lineUserId?: string;
    };

    if (!LOGIN_CHANNEL_ID) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Missing LOGIN_CHANNEL_ID' }) };
    }

    if (!idToken || !lineUserId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'Missing idToken or lineUserId' }),
      };
    }

    // LINEの検証API
    const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: LOGIN_CHANNEL_ID,
      }),
    });

    const verify = (await verifyRes.json()) as any;
    if (!verifyRes.ok) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: verify.error_description || 'verify failed', detail: verify }),
      };
    }

    // 一致チェック（通常 verify.sub は LIFFの userId と同じ）
    if (verify.sub && verify.sub !== lineUserId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: 'userId mismatch', detail: { sub: verify.sub, lineUserId } }),
      };
    }

    console.log('[line-login] verified', {
      lineUserId,
      name: verify.name,
      email: verify.email,
      expires_in: verify.expires_in,
      amr: verify.amr,
    });

    // TODO: DB UPSERT（Supabaseなど）／自前JWT発行
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, user: { lineUserId, name: verify.name ?? null, email: verify.email ?? null } }),
    };
  } catch (err: any) {
    console.error('[line-login] error', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};

export default handler;



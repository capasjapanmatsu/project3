import type { Handler } from '@netlify/functions';
import { lineClient } from './_lineClient';

const TEST_USER_ID = process.env.LINE_TEST_USER_ID || 'Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const messageText = (() => {
      if (event.httpMethod === 'GET') return 'テストメッセージ（GET）';
      try {
        const body = event.body ? JSON.parse(event.body) : {};
        return body.message || 'テストメッセージ（POST）';
      } catch {
        return 'テストメッセージ（POST）';
      }
    })();

    await lineClient.pushMessage(TEST_USER_ID, {
      type: 'text',
      text: messageText,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Push error:', err);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};



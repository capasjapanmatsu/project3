import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { statusCode: 500, headers: cors, body: 'OPENAI_API_KEY not set' };
    const client = new OpenAI({ apiKey });

    const { message } = JSON.parse(event.body || '{}') as { message?: string };
    if (!message) return { statusCode: 400, headers: cors, body: 'message required' };

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for a dog park web app.' },
        { role: 'user', content: message }
      ],
      temperature: 0.3,
      max_tokens: 400
    });

    const text = completion.choices[0]?.message?.content ?? '';
    return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ reply: text }) };
  } catch (e: any) {
    return { statusCode: 500, headers: cors, body: e.message };
  }
};

export default handler;



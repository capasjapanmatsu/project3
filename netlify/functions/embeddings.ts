import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { statusCode: 500, headers: cors, body: 'OPENAI_API_KEY not set' };
    const client = new OpenAI({ apiKey });

    const { texts } = JSON.parse(event.body || '{}') as { texts?: string[] };
    if (!texts || texts.length === 0) return { statusCode: 400, headers: cors, body: 'texts required' };

    const res = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts
    });

    return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(res.data.map(d => d.embedding)) };
  } catch (e: any) {
    return { statusCode: 500, headers: cors, body: e.message };
  }
};

export default handler;



import type { Handler } from '@netlify/functions';
import { buildClearCookie } from './_lib/session';

export const handler: Handler = async () => {
  const cookie = buildClearCookie();
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    multiValueHeaders: { 'Set-Cookie': [cookie] },
    body: JSON.stringify({ ok: true })
  };
};

export default handler;



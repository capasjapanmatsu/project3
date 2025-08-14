import type { Handler } from '@netlify/functions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  try {
    const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string | undefined;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, headers: corsHeaders, body: 'Server not configured' };
    }

    const body = event.body || '{}';
    const res = await fetch(`${SUPABASE_URL}/functions/v1/convert-to-webp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body,
    });

    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { ...corsHeaders, 'Content-Type': res.headers.get('content-type') || 'application/json' },
      body: text,
    };
  } catch (e: any) {
    return { statusCode: 500, headers: corsHeaders, body: e.message };
  }
};

export default handler;



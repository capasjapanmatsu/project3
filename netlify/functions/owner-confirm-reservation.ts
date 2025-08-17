import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  } as const;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL as string;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, headers: cors, body: 'Supabase env not set' };
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { reservationId } = JSON.parse(event.body || '{}');
    if (!reservationId) return { statusCode: 400, headers: cors, body: 'reservationId required' };

    const { data, error } = await supabase
      .from('facility_reservations')
      .update({ status: 'confirmed' })
      .eq('id', reservationId)
      .select('id,status')
      .maybeSingle();
    if (error) throw error;
    if (!data) return { statusCode: 404, headers: cors, body: 'Reservation not found' };

    return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, reservation: data }) };
  } catch (e: any) {
    return { statusCode: 500, headers: cors, body: e?.message || 'Internal Error' };
  }
};



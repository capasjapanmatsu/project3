/* eslint-disable */
// Deno Edge Function: handle invite info and unlock
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;
const FACILITY_AUTH_TOKEN = Deno.env.get('FACILITY_AUTH_TOKEN') || 'demo_auth_token';

// Basic CORS
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function getInviteByToken(token: string) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/reservation_invites?select=*&token=eq.${encodeURIComponent(token)}`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : null;
}

async function resolveEntryLockIdByPark(parkId: string): Promise<string | null> {
  // 1st: entry purpose, 2nd: any with pin_enabled, 3rd: any lock
  const baseHeaders = { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } as const;
  // entry lock preferred
  let resp = await fetch(`${SUPABASE_URL}/rest/v1/smart_locks?select=lock_id,purpose&park_id=eq.${encodeURIComponent(parkId)}&purpose=eq.entry&status=eq.active&limit=1`, { headers: baseHeaders });
  let data = await resp.json();
  if (Array.isArray(data) && data.length > 0) return data[0].lock_id as string;

  // any pin-enabled lock
  resp = await fetch(`${SUPABASE_URL}/rest/v1/smart_locks?select=lock_id,purpose&park_id=eq.${encodeURIComponent(parkId)}&pin_enabled=eq.true&status=eq.active&limit=1`, { headers: baseHeaders });
  data = await resp.json();
  if (Array.isArray(data) && data.length > 0) return data[0].lock_id as string;

  // any lock as fallback
  resp = await fetch(`${SUPABASE_URL}/rest/v1/smart_locks?select=lock_id&park_id=eq.${encodeURIComponent(parkId)}&status=eq.active&limit=1`, { headers: baseHeaders });
  data = await resp.json();
  if (Array.isArray(data) && data.length > 0) return data[0].lock_id as string;
  return null;
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    const { pathname, searchParams } = new URL(req.url);
    if (req.method === 'GET') {
      const token = searchParams.get('token') || pathname.split('/').pop() || '';
      if (!token) return new Response(JSON.stringify({ error: 'token required' }), { status: 400 });
      const invite = await getInviteByToken(token);
      if (!invite) return new Response(JSON.stringify({ error: 'invite not found' }), { status: 404 });
      return new Response(JSON.stringify({ invite }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const token = body.token as string;
      const userId = body.userId as string;
      if (!token || !userId) return new Response(JSON.stringify({ error: 'token and userId required' }), { status: 400 });

      const invite = await getInviteByToken(token);
      if (!invite) return new Response(JSON.stringify({ error: 'invite not found' }), { status: 404 });

      const now = Date.now();
      if (invite.revoked) return new Response(JSON.stringify({ error: 'invite revoked' }), { status: 403 });
      if (now < Date.parse(invite.start_time) || now > Date.parse(invite.end_time)) {
        return new Response(JSON.stringify({ error: 'outside allowed time window' }), { status: 403 });
      }
      if (invite.max_uses && invite.used_count >= invite.max_uses) {
        return new Response(JSON.stringify({ error: 'invite uses exceeded' }), { status: 403 });
      }

      // Resolve lock_id by park
      const lockId = await resolveEntryLockIdByPark(invite.park_id);
      if (!lockId) return new Response(JSON.stringify({ error: 'no active lock configured for this park' }), { status: 400 });

      // Call secure open-door-lock (performs RPC access check)
      const unlockResp = await fetch(`${SUPABASE_URL}/functions/v1/open-door-lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // forward user auth for supabase.auth.getUser validation inside open-door-lock
          Authorization: req.headers.get('Authorization') || '',
        },
        body: JSON.stringify({ lock_id: lockId, user_id: userId, auth_token: FACILITY_AUTH_TOKEN, invite_token: token, purpose: (body?.purpose ?? 'entry') })
      });
      const unlockBody = await unlockResp.json().catch(() => ({}));
      if (!unlockResp.ok) {
        const msg = (unlockBody && (unlockBody.error || unlockBody.message)) || 'unlock failed';
        return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
      }

      // Record usage (after successful unlock attempt)
      await fetch(`${SUPABASE_URL}/rest/v1/invite_uses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ invite_id: invite.id, user_id: userId }),
      });
      await fetch(`${SUPABASE_URL}/rest/v1/reservation_invites?id=eq.${invite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ used_count: (invite.used_count || 0) + 1 }),
      });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});



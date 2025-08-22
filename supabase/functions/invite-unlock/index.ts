// Deno Edge Function: handle invite info and unlock
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getInviteByToken(token: string) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/reservation_invites?select=*&token=eq.${encodeURIComponent(token)}`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  const data = await resp.json();
  return Array.isArray(data) ? data[0] : null;
}

serve(async (req) => {
  try {
    const { pathname, searchParams } = new URL(req.url);
    if (req.method === 'GET') {
      const token = searchParams.get('token') || pathname.split('/').pop() || '';
      if (!token) return new Response(JSON.stringify({ error: 'token required' }), { status: 400 });
      const invite = await getInviteByToken(token);
      if (!invite) return new Response(JSON.stringify({ error: 'invite not found' }), { status: 404 });
      return new Response(JSON.stringify({ invite }), { headers: { 'Content-Type': 'application/json' } });
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

      // Record usage
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

      // Unlock via existing ttlock-unlock
      const unlockResp = await fetch(`${SUPABASE_URL}/functions/v1/ttlock-unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: req.headers.get('Authorization') || '' },
        body: JSON.stringify({ parkId: invite.park_id, purpose: 'entry' }),
      });
      const unlockBody = await unlockResp.json().catch(() => ({}));
      if (!unlockResp.ok) return new Response(JSON.stringify({ error: unlockBody?.error || 'unlock failed' }), { status: 500 });
      return new Response(JSON.stringify({ success: true }));
    }

    return new Response('Method Not Allowed', { status: 405 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});



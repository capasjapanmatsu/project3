import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export const handler: Handler = async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 500, body: 'Supabase env missing' };
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  try {
    const { data: rows, error } = await admin.from('v_reservation_reminders').select('id, facility_id, user_id, reserved_date, start_time');
    if (error) throw error;

    for (const row of rows || []) {
      try {
        const linkUser = `https://dogparkjp.com/my-reservations`;
        const linkOwner = `https://dogparkjp.com/facilities/${row.facility_id}/reservations`;

        // fetch profiles for line send
        const { data: profUser } = await admin.from('profiles').select('line_user_id, notify_opt_in').eq('id', row.user_id).maybeSingle();
        const { data: facility } = await admin.from('pet_facilities').select('name, owner_id').eq('id', row.facility_id).maybeSingle();
        const { data: profOwner } = facility?.owner_id ? await admin.from('profiles').select('line_user_id, notify_opt_in').eq('id', facility.owner_id).maybeSingle() : { data: null } as any;

        const timeLabel = `${row.reserved_date} ${row.start_time}`;

        if (profUser?.notify_opt_in && profUser?.line_user_id) {
          await fetch('https://dogparkjp.com/.netlify/functions/line-notify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind: 'alert', lineUserId: profUser.line_user_id, title: '本日のご予約', message: timeLabel, linkUrl: linkUser })
          });
        }
        if (profOwner?.notify_opt_in && profOwner?.line_user_id) {
          await fetch('https://dogparkjp.com/.netlify/functions/line-notify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind: 'alert', lineUserId: profOwner.line_user_id, title: '本日のご予約', message: timeLabel, linkUrl: linkOwner })
          });
        }
      } catch {}
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, count: rows?.length || 0 }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'error' };
  }
};

export default handler;



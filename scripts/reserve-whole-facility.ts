/*
  Usage:
    npx tsx scripts/reserve-whole-facility.ts --park <PARK_ID> --email <USER_EMAIL> [--start <HH>] [--end <HH>]

  Notes:
    - Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
*/
import { createClient } from '@supabase/supabase-js';

type Args = { park: string; email: string; start?: number; end?: number };

function parseArgs(argv: string[]): Args {
  const args: any = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--park') args.park = argv[++i];
    else if (a === '--email') args.email = argv[++i];
    else if (a === '--start') args.start = parseInt(argv[++i], 10);
    else if (a === '--end') args.end = parseInt(argv[++i], 10);
  }
  if (!args.park || !args.email) {
    console.error('Usage: --park <PARK_ID> --email <USER_EMAIL> [--start <HH>] [--end <HH>]');
    process.exit(1);
  }
  return args as Args;
}

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in environment');
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { park, email, start, end } = parseArgs(process.argv);

  // Resolve user by email (auth)
  const { data: userByEmail, error: getUserErr } = await supabase.auth.admin.getUserByEmail(email);
  if (getUserErr || !userByEmail?.user) throw new Error(`User not found for ${email}`);
  const userId = userByEmail.user.id;

  // Pick one dog for reservation (owner_id or user_id)
  let dogId: string | null = null;
  {
    const { data: d1 } = await supabase.from('dogs').select('id').eq('owner_id', userId).limit(1);
    if (d1 && d1.length > 0) dogId = d1[0].id as any;
  }
  if (!dogId) {
    const { data: d2 } = await supabase.from('dogs').select('id').eq('user_id', userId).limit(1);
    if (d2 && d2.length > 0) dogId = d2[0].id as any;
  }
  if (!dogId) throw new Error('No dog found for the user; please register at least one dog');

  // Compute time window: today from nowHour to endHour (default 23)
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const startHour = typeof start === 'number' && start >= 0 && start <= 23 ? start : now.getHours();
  const endHour = typeof end === 'number' && end >= 0 && end <= 23 ? end : 23;
  const safeStart = Math.min(startHour, endHour - 1);
  const duration = Math.max(1, endHour - safeStart);
  const startTime = `${String(safeStart).padStart(2, '0')}:00:00`;

  // Insert reservation as whole_facility, confirmed
  const { error: insertErr } = await supabase.from('reservations').insert({
    park_id: park,
    user_id: userId,
    dog_id: dogId,
    date: dateStr,
    start_time: startTime,
    duration,
    status: 'confirmed',
    total_amount: 0,
    access_code: '',
    reservation_type: 'whole_facility',
  });
  if (insertErr) throw insertErr;
  console.log(`Inserted reservation for ${email} at park ${park} on ${dateStr} ${startTime} (+${duration}h)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});



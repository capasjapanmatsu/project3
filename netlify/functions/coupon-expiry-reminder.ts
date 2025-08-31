import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string | undefined;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || process.env.VITE_PUBLIC_BASE_URL || 'https://dogparkjp.com';

export const handler: Handler = async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: 'Supabase env missing' };
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  try {
    // 3日後が期限のクーポンを取得（まだ使用していないもの）
    const today = new Date();
    const in3 = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const yyyy = in3.getFullYear();
    const mm = String(in3.getMonth() + 1).padStart(2, '0');
    const dd = String(in3.getDate()).padStart(2, '0');
    const targetDate = `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD

    // user_coupons と facility_coupons をJOIN
    const { data: rows, error } = await admin
      .from('user_coupons')
      .select(`
        id, user_id, is_used,
        coupon:facility_coupons(id, title, end_date, facility_id)
      `)
      .eq('is_used', false)
      .eq('coupon.end_date', targetDate);

    if (error) throw error;

    for (const row of rows || []) {
      try {
        const userId = row.user_id as string;
        const coupon = (row as any).coupon as { id: string; title: string; end_date: string; facility_id: string };
        const { data: fac } = await admin.from('pet_facilities').select('name').eq('id', coupon.facility_id).maybeSingle();
        const title = 'クーポンの有効期限が近づいています';
        const message = `${fac?.name || '施設'}の「${coupon.title}」は3日後（${coupon.end_date}）に期限切れになります。お早めにご利用ください。`;

        // アプリ内通知
        await admin.from('notifications').insert({
          user_id: userId,
          type: 'order',
          title,
          message,
          link_url: `${PUBLIC_BASE}/my-coupons`,
          data: { coupon_id: coupon.id },
          read: false,
        });

        // LINE通知
        try {
          await fetch(`${PUBLIC_BASE}/.netlify/functions/line-notify`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, kind: 'alert', title, message, linkUrl: `${PUBLIC_BASE}/my-coupons` })
          });
        } catch (e) {
          console.error('LINE notify failed (coupon-expiry):', e);
        }
      } catch (e) {
        console.error('coupon expiry notify failed for row:', row?.id, e);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, count: rows?.length || 0 }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'error' };
  }
};

export default handler;

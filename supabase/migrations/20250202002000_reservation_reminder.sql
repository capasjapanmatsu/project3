-- 簡易リマインダ用スケジュール定義（SQLレベルでは下準備のみ）
-- 1) リマインド対象ビュー（当日7時に送る対象を抽出）
create or replace view public.v_reservation_reminders as
  select r.id, r.facility_id, r.user_id, r.reserved_date, r.start_time
  from public.facility_reservations r
  where r.status = 'confirmed' and r.reserved_date = (current_date);

-- Netlify/Supabase Edgeのスケジュールジョブからこのビューを読み、
-- line-notify に { kind: 'alert', title: '本日のご予約', message: '本日はご予約があります …' } をPOSTする想定。



-- get_admin_stats関数からお問い合わせ機能を除外する
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  current_month_start date := date_trunc('month', current_date)::date;
  last_month_start date := date_trunc('month', current_date - interval '1 month')::date;
  last_month_end date := date_trunc('month', current_date) - interval '1 day';
BEGIN
  -- Check if user is admin using new function
  IF NOT is_admin_user() THEN
    RETURN jsonb_build_object('error', 'Unauthorized access');
  END IF;

  -- Gather statistics (お問い合わせ機能を除外)
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_parks', (SELECT COUNT(*) FROM dog_parks),
    'pending_parks', (SELECT COUNT(*) FROM dog_parks WHERE status = 'pending'),
    'pending_vaccines', (SELECT COUNT(*) FROM vaccine_certifications WHERE status = 'pending'),
    'total_reservations', (SELECT COUNT(*) FROM reservations WHERE date >= current_month_start),
    'monthly_revenue', COALESCE((SELECT SUM(total_amount) FROM reservations WHERE date >= current_month_start), 0),
    'last_month_revenue', COALESCE((SELECT SUM(total_amount) FROM reservations WHERE date >= last_month_start AND date <= last_month_end), 0),
    'total_subscriptions', (SELECT COUNT(*) FROM subscriptions),
    'active_subscriptions', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND end_date >= current_date),
    'new_users_this_month', (SELECT COUNT(*) FROM profiles WHERE created_at >= current_month_start),
    'unread_messages', 0
  ) INTO result;

  RETURN result;
END;
$$; 
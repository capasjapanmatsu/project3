-- 管理者統計の修正マイグレーション
-- 問題：予約数とサブスクリプション数の取得ロジックが正しくない

-- 修正版のget_admin_stats関数
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
  total_stripe_subscriptions int := 0;
  active_stripe_subscriptions int := 0;
  total_legacy_subscriptions int := 0;
  active_legacy_subscriptions int := 0;
BEGIN
  -- Check if user is admin using new function
  IF NOT is_admin_user() THEN
    RETURN jsonb_build_object('error', 'Unauthorized access');
  END IF;

  -- サブスクリプション数を取得（stripe_subscriptionsテーブルを優先）
  BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'active')
    INTO total_stripe_subscriptions, active_stripe_subscriptions
    FROM stripe_subscriptions 
    WHERE deleted_at IS NULL;
  EXCEPTION
    WHEN others THEN
      total_stripe_subscriptions := 0;
      active_stripe_subscriptions := 0;
  END;

  -- 従来のsubscriptionsテーブルも確認
  BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'active' AND end_date >= current_date)
    INTO total_legacy_subscriptions, active_legacy_subscriptions
    FROM subscriptions;
  EXCEPTION
    WHEN others THEN
      total_legacy_subscriptions := 0;
      active_legacy_subscriptions := 0;
  END;

  -- Gather statistics
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_parks', (SELECT COUNT(*) FROM dog_parks),
    'pending_parks', (SELECT COUNT(*) FROM dog_parks WHERE status = 'pending'),
    'pending_vaccines', (SELECT COUNT(*) FROM vaccine_certifications WHERE status = 'pending'),
    -- 今月の予約数（created_atベース）
    'total_reservations', (SELECT COUNT(*) FROM reservations WHERE created_at >= current_month_start),
    -- 今月の売上（created_atベース）
    'monthly_revenue', COALESCE((SELECT SUM(total_amount) FROM reservations WHERE created_at >= current_month_start), 0),
    -- 先月の売上（created_atベース）
    'last_month_revenue', COALESCE((SELECT SUM(total_amount) FROM reservations WHERE created_at >= last_month_start AND created_at <= (last_month_end + interval '1 day')), 0),
    -- サブスクリプション数（stripe_subscriptionsを優先）
    'total_subscriptions', GREATEST(total_stripe_subscriptions, total_legacy_subscriptions),
    'active_subscriptions', GREATEST(active_stripe_subscriptions, active_legacy_subscriptions),
    -- 今月の新規ユーザー数
    'new_users_this_month', (SELECT COUNT(*) FROM profiles WHERE created_at >= current_month_start),
    'unread_messages', 0
  ) INTO result;

  RETURN result;
END;
$$;

-- 関数にコメントを追加
COMMENT ON FUNCTION get_admin_stats() IS 'Fixed admin statistics function - uses created_at for reservations and supports both subscription tables'; 
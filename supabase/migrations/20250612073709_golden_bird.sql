/*
  # Update admin stats function

  1. Changes
    - Drop and recreate the get_admin_stats function with updated return values
  
  2. Details
    - This migration fixes an error with the previous function definition
    - The function now returns additional statistics for the admin dashboard
*/

-- Drop the existing function first to avoid the "cannot change return type" error
DROP FUNCTION IF EXISTS get_admin_stats();

-- Recreate the function with the updated return values
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_users bigint,
  total_parks bigint,
  pending_parks bigint,
  pending_vaccines bigint,
  total_reservations bigint,
  monthly_revenue bigint,
  last_month_revenue bigint,
  total_subscriptions bigint,
  active_subscriptions bigint,
  new_users_this_month bigint,
  unread_messages bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles) as total_users,
    (SELECT COUNT(*) FROM dog_parks) as total_parks,
    (SELECT COUNT(*) FROM dog_parks WHERE status IN ('pending', 'first_stage_passed', 'second_stage_review')) as pending_parks,
    (SELECT COUNT(*) FROM vaccine_certifications WHERE status = 'pending') as pending_vaccines,
    (SELECT COUNT(*) FROM reservations WHERE date >= date_trunc('month', now())) as total_reservations,
    (SELECT COALESCE(SUM(total_amount), 0) FROM reservations WHERE date >= date_trunc('month', now())) as monthly_revenue,
    (SELECT COALESCE(SUM(total_amount), 0) FROM reservations WHERE date >= date_trunc('month', now() - interval '1 month') AND date < date_trunc('month', now())) as last_month_revenue,
    (SELECT COUNT(*) FROM stripe_subscriptions WHERE deleted_at IS NULL) as total_subscriptions,
    (SELECT COUNT(*) FROM stripe_subscriptions WHERE status = 'active' AND deleted_at IS NULL) as active_subscriptions,
    (SELECT COUNT(*) FROM profiles WHERE created_at >= date_trunc('month', now())) as new_users_this_month,
    (SELECT COUNT(*) FROM contact_messages WHERE status = 'new') as unread_messages;
END;
$$;
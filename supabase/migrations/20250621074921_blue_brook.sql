/*
  # Fix notifications RLS policy

  1. Changes
    - Add RLS policy for admin to insert notifications
    - Fix issue with vaccine approval notifications
*/

-- Add policy for admin to insert notifications
CREATE POLICY "Admins can insert notifications for any user"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text);

-- Add policy for admin to view all notifications
CREATE POLICY "Admins can view all notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text);

-- Add comment to explain the policies
COMMENT ON TABLE public.notifications IS 'User notifications with RLS policies for user access and admin management';
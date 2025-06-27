/*
  # Admin System Setup

  1. New Tables
    - `contact_messages` - For storing user inquiries and contact messages
    - `admin_notifications` - For system notifications to administrators
  
  2. Functions
    - `get_admin_stats` - Retrieves dashboard statistics for administrators
    - `handle_admin_notification` - Creates notifications for admin users
  
  3. Security
    - RLS policies for admin access
    - Special permissions for capasjapan@gmail.com admin account
*/

-- Contact messages table for user inquiries
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('park_approval', 'vaccine_approval', 'user_report', 'system_alert', 'revenue_alert')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Only admins can access contact messages"
  ON contact_messages
  USING (auth.jwt() ->> 'email' = 'capasjapan@gmail.com');

CREATE POLICY "Only admins can access admin notifications"
  ON admin_notifications
  USING (auth.jwt() ->> 'email' = 'capasjapan@gmail.com');

-- Function to get admin dashboard statistics
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
  -- Check if user is admin
  IF auth.jwt() ->> 'email' != 'capasjapan@gmail.com' THEN
    RETURN jsonb_build_object('error', 'Unauthorized access');
  END IF;

  -- Gather statistics
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
    'unread_messages', (SELECT COUNT(*) FROM contact_messages WHERE status = 'new')
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to handle admin notifications
CREATE OR REPLACE FUNCTION handle_admin_notification(
  notification_type text,
  notification_title text,
  notification_message text,
  notification_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id uuid;
BEGIN
  -- Insert notification
  INSERT INTO admin_notifications (
    type,
    title,
    message,
    data
  ) VALUES (
    notification_type,
    notification_title,
    notification_message,
    notification_data
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Trigger function to notify admins of new park registrations
CREATE OR REPLACE FUNCTION notify_admin_new_park()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM handle_admin_notification(
    'park_approval',
    '新しいドッグラン登録',
    format('新しいドッグラン「%s」が登録され、承認待ちです', NEW.name),
    jsonb_build_object(
      'park_id', NEW.id,
      'park_name', NEW.name,
      'owner_id', NEW.owner_id
    )
  );
  
  RETURN NEW;
END;
$$;

-- Trigger function to notify admins of new vaccine certifications
CREATE OR REPLACE FUNCTION notify_admin_new_vaccine()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dog_name text;
  owner_name text;
BEGIN
  -- Get dog and owner information
  SELECT d.name, p.name
  INTO dog_name, owner_name
  FROM dogs d
  JOIN profiles p ON d.owner_id = p.id
  WHERE d.id = NEW.dog_id;
  
  PERFORM handle_admin_notification(
    'vaccine_approval',
    'ワクチン証明書承認待ち',
    format('%sさんの犬「%s」のワクチン証明書が承認待ちです', owner_name, dog_name),
    jsonb_build_object(
      'vaccine_id', NEW.id,
      'dog_id', NEW.dog_id,
      'dog_name', dog_name,
      'owner_name', owner_name
    )
  );
  
  RETURN NEW;
END;
$$;

-- Function to set admin status for capasjapan@gmail.com
CREATE OR REPLACE FUNCTION set_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get user ID for capasjapan@gmail.com
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'capasjapan@gmail.com';
  
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Admin user not found. Please ensure capasjapan@gmail.com is registered.';
    RETURN;
  END IF;
  
  -- Update profile to admin type
  UPDATE profiles
  SET user_type = 'admin'
  WHERE id = admin_user_id;
  
  RAISE NOTICE 'Admin status set for capasjapan@gmail.com';
END;
$$;

-- Execute admin user setup
SELECT set_admin_user();

-- Create sample contact messages for testing
INSERT INTO contact_messages (name, email, subject, message, status, created_at)
VALUES
  ('山田太郎', 'yamada@example.com', 'サブスクリプションについて', 'サブスクリプションの解約方法を教えてください。', 'new', now() - interval '2 hours'),
  ('佐藤花子', 'sato@example.com', 'ドッグランの予約について', '予約をキャンセルしたいのですが、どうすればよいですか？', 'new', now() - interval '5 hours'),
  ('鈴木一郎', 'suzuki@example.com', 'ワクチン証明書について', 'ワクチン証明書の承認に時間がかかっていますが、状況を確認できますか？', 'read', now() - interval '1 day'),
  ('田中美咲', 'tanaka@example.com', '施設貸し切りについて', '友達と一緒に施設を貸し切りたいのですが、可能でしょうか？', 'replied', now() - interval '2 days'),
  ('高橋健太', 'takahashi@example.com', 'アプリの不具合について', 'QRコードが表示されない問題が発生しています。', 'new', now() - interval '3 hours')
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_stats TO authenticated;
GRANT EXECUTE ON FUNCTION handle_admin_notification TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '=== 管理者システム構築完了 ===';
  RAISE NOTICE '✓ 問い合わせ管理システム';
  RAISE NOTICE '✓ 管理者通知システム';
  RAISE NOTICE '✓ 統計情報取得機能';
  RAISE NOTICE '✓ capasjapan@gmail.com を管理者に設定';
  RAISE NOTICE '✓ サンプルデータ追加完了';
END $$;
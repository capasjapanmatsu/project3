/*
  # 管理者システムの実装

  1. 管理者権限の設定
    - 管理者用のプロフィール作成
    - 管理者権限チェック機能

  2. 管理機能の強化
    - ドッグラン承認・却下機能
    - ワクチン証明書承認・却下機能
    - ユーザー管理機能

  3. セキュリティ
    - 管理者のみアクセス可能な機能
    - 適切な権限チェック
*/

-- 管理者用のプロフィールタイプを追加
DO $$
BEGIN
  -- 既存の制約を削除
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_type_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_user_type_check;
  END IF;
  
  -- 新しい制約を追加（admin を含む）
  ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check 
    CHECK (user_type = ANY (ARRAY['user'::text, 'owner'::text, 'admin'::text]));
END $$;

-- 管理者用のサンプルプロフィールを作成（実際の管理者アカウント作成時に使用）
-- 注意: 実際の本番環境では、適切な管理者アカウントを手動で作成してください
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin@dogparkjp.com',
  crypt('admin123456', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "システム管理者"}',
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 管理者プロフィールを作成
INSERT INTO profiles (
  id,
  user_type,
  name,
  postal_code,
  address,
  phone_number,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin',
  'システム管理者',
  '100-0001',
  '東京都千代田区千代田1-1',
  '03-1234-5678',
  now()
) ON CONFLICT (id) DO NOTHING;

-- 管理者用の統計ビューを作成
CREATE OR REPLACE VIEW admin_stats AS
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE user_type IN ('user', 'owner')) as total_users,
  (SELECT COUNT(*) FROM dog_parks) as total_parks,
  (SELECT COUNT(*) FROM dog_parks WHERE status = 'pending') as pending_parks,
  (SELECT COUNT(*) FROM vaccine_certifications WHERE status = 'pending') as pending_vaccines,
  (SELECT COUNT(*) FROM reservations WHERE created_at >= date_trunc('month', CURRENT_DATE)) as monthly_reservations,
  (SELECT COALESCE(SUM(total_amount), 0) FROM reservations WHERE created_at >= date_trunc('month', CURRENT_DATE)) as monthly_revenue;

-- 管理者のみがビューにアクセスできるようにする
GRANT SELECT ON admin_stats TO authenticated;

-- 管理者用の通知機能を追加
CREATE OR REPLACE FUNCTION notify_admin_new_park()
RETURNS TRIGGER AS $$
BEGIN
  -- 新しいドッグラン申請があった場合、管理者に通知
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    )
    SELECT 
      id,
      'park_approval_required',
      '新しいドッグラン申請',
      NEW.name || 'の申請が届きました。承認をお願いします。',
      jsonb_build_object(
        'park_id', NEW.id,
        'park_name', NEW.name,
        'owner_id', NEW.owner_id
      )
    FROM profiles 
    WHERE user_type = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ドッグラン申請時の管理者通知トリガー
DROP TRIGGER IF EXISTS notify_admin_new_park_trigger ON dog_parks;
CREATE TRIGGER notify_admin_new_park_trigger
  AFTER INSERT ON dog_parks
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_park();

-- 管理者用の通知機能（ワクチン証明書）
CREATE OR REPLACE FUNCTION notify_admin_new_vaccine()
RETURNS TRIGGER AS $$
DECLARE
  dog_info RECORD;
BEGIN
  -- 新しいワクチン証明書申請があった場合、管理者に通知
  IF NEW.status = 'pending' THEN
    -- 犬の情報を取得
    SELECT d.name as dog_name, p.name as owner_name
    INTO dog_info
    FROM dogs d
    JOIN profiles p ON d.owner_id = p.id
    WHERE d.id = NEW.dog_id;
    
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    )
    SELECT 
      id,
      'vaccine_approval_required',
      '新しいワクチン証明書申請',
      dog_info.dog_name || '（飼い主: ' || dog_info.owner_name || '）のワクチン証明書申請が届きました。',
      jsonb_build_object(
        'certification_id', NEW.id,
        'dog_id', NEW.dog_id,
        'dog_name', dog_info.dog_name,
        'owner_name', dog_info.owner_name
      )
    FROM profiles 
    WHERE user_type = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ワクチン証明書申請時の管理者通知トリガー
DROP TRIGGER IF EXISTS notify_admin_new_vaccine_trigger ON vaccine_certifications;
CREATE TRIGGER notify_admin_new_vaccine_trigger
  AFTER INSERT ON vaccine_certifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_vaccine();

-- 通知タイプに管理者用を追加
DO $$
BEGIN
  -- 既存の制約を削除
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
  
  -- 新しい制約を追加（管理者用通知を含む）
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type = ANY (ARRAY[
      'friend_request'::text, 
      'friend_accepted'::text, 
      'friend_at_park'::text, 
      'reservation_reminder'::text, 
      'order_confirmed'::text, 
      'order_shipped'::text, 
      'order_delivered'::text,
      'qr_shared'::text,
      'qr_revoked'::text,
      'vaccine_expiry_warning'::text,
      'vaccine_expired'::text,
      'vaccine_reapproval_required'::text,
      'park_approval_required'::text,
      'vaccine_approval_required'::text
    ]));
END $$;

-- 管理者用のダッシュボード統計を取得する関数
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_users bigint,
  total_parks bigint,
  pending_parks bigint,
  pending_vaccines bigint,
  monthly_reservations bigint,
  monthly_revenue bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM profiles WHERE user_type IN ('user', 'owner'))::bigint,
    (SELECT COUNT(*) FROM dog_parks)::bigint,
    (SELECT COUNT(*) FROM dog_parks WHERE status = 'pending')::bigint,
    (SELECT COUNT(*) FROM vaccine_certifications WHERE status = 'pending')::bigint,
    (SELECT COUNT(*) FROM reservations WHERE created_at >= date_trunc('month', CURRENT_DATE))::bigint,
    (SELECT COALESCE(SUM(total_amount), 0) FROM reservations WHERE created_at >= date_trunc('month', CURRENT_DATE))::bigint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 管理者権限チェック関数
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND user_type = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 管理者のみがアクセスできる関数の権限設定
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;
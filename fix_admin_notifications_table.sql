-- admin_notificationsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "Allow admins to view notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow system to insert notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow admins to update notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow anyone to insert admin notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow authenticated users to view admin notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow authenticated users to update admin notifications" ON admin_notifications;

-- RLSを有効化
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- 新しいポリシーを作成（すべてのユーザーがアクセス可能）
CREATE POLICY "Allow all users to insert admin notifications" ON admin_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to view admin notifications" ON admin_notifications
  FOR SELECT USING (true);

CREATE POLICY "Allow all users to update admin notifications" ON admin_notifications
  FOR UPDATE USING (true);

-- 権限を設定
GRANT ALL ON admin_notifications TO authenticated;
GRANT ALL ON admin_notifications TO anon;
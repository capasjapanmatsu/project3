-- admin_notificationsテーブルの完全な修正

-- 既存のテーブルを削除（データも削除されます）
DROP TABLE IF EXISTS admin_notifications CASCADE;

-- admin_notificationsテーブルを新規作成
CREATE TABLE admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created_at ON admin_notifications(created_at);

-- RLSを有効化
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシーを作成（すべてのユーザーがアクセス可能）
CREATE POLICY "admin_notifications_select_policy" ON admin_notifications
  FOR SELECT USING (true);

CREATE POLICY "admin_notifications_insert_policy" ON admin_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_notifications_update_policy" ON admin_notifications
  FOR UPDATE USING (true);

CREATE POLICY "admin_notifications_delete_policy" ON admin_notifications
  FOR DELETE USING (true);

-- 権限を設定
GRANT ALL ON admin_notifications TO authenticated;
GRANT ALL ON admin_notifications TO anon;
GRANT ALL ON admin_notifications TO service_role;

-- 確認用クエリ
SELECT 'admin_notifications table created successfully' as status;
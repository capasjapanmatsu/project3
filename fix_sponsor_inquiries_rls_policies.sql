-- sponsor_inquiriesテーブルのRLSポリシーを修正

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Allow authenticated users to insert sponsor inquiries" ON sponsor_inquiries;
DROP POLICY IF EXISTS "Allow admins to view all sponsor inquiries" ON sponsor_inquiries;
DROP POLICY IF EXISTS "Allow admins to update sponsor inquiries" ON sponsor_inquiries;

-- 新しいポリシーを作成（より緩い条件で）
CREATE POLICY "Allow anyone to insert sponsor inquiries" ON sponsor_inquiries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view sponsor inquiries" ON sponsor_inquiries
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update sponsor inquiries" ON sponsor_inquiries
  FOR UPDATE USING (true);

-- admin_notificationsテーブルのRLSポリシーも修正
DROP POLICY IF EXISTS "Allow admins to view notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow system to insert notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow admins to update notifications" ON admin_notifications;

CREATE POLICY "Allow anyone to insert admin notifications" ON admin_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view admin notifications" ON admin_notifications
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update admin notifications" ON admin_notifications
  FOR UPDATE USING (true);
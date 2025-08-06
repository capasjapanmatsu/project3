-- sponsor_inquiriesテーブルのRLSポリシーを修正（v2）

-- sponsor_inquiriesテーブルの既存ポリシーを削除
DROP POLICY IF EXISTS "Allow authenticated users to insert sponsor inquiries" ON sponsor_inquiries;
DROP POLICY IF EXISTS "Allow admins to view all sponsor inquiries" ON sponsor_inquiries;
DROP POLICY IF EXISTS "Allow admins to update sponsor inquiries" ON sponsor_inquiries;
DROP POLICY IF EXISTS "Allow anyone to insert sponsor inquiries" ON sponsor_inquiries;
DROP POLICY IF EXISTS "Allow authenticated users to view sponsor inquiries" ON sponsor_inquiries;
DROP POLICY IF EXISTS "Allow authenticated users to update sponsor inquiries" ON sponsor_inquiries;

-- sponsor_inquiriesテーブルの新しいポリシーを作成
CREATE POLICY "sponsor_inquiries_insert_policy" ON sponsor_inquiries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "sponsor_inquiries_select_policy" ON sponsor_inquiries
  FOR SELECT USING (true);

CREATE POLICY "sponsor_inquiries_update_policy" ON sponsor_inquiries
  FOR UPDATE USING (true);

-- admin_notificationsテーブルの既存ポリシーを削除
DROP POLICY IF EXISTS "Allow admins to view notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow system to insert notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow admins to update notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow anyone to insert admin notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow authenticated users to view admin notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow authenticated users to update admin notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow all users to insert admin notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow all users to view admin notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Allow all users to update admin notifications" ON admin_notifications;

-- admin_notificationsテーブルの新しいポリシーを作成
CREATE POLICY "admin_notifications_insert_policy" ON admin_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_notifications_select_policy" ON admin_notifications
  FOR SELECT USING (true);

CREATE POLICY "admin_notifications_update_policy" ON admin_notifications
  FOR UPDATE USING (true);
-- 管理者によるワクチン証明書承認・却下のRLSポリシーを修正

-- 1. vaccine_certifications テーブルのポリシーを確認・修正
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "管理者はワクチン証明書を更新可能" ON vaccine_certifications;
DROP POLICY IF EXISTS "Admin can update vaccine certifications" ON vaccine_certifications;
DROP POLICY IF EXISTS "Admins can update all vaccine certifications" ON vaccine_certifications;

-- 管理者用の更新ポリシーを作成
CREATE POLICY "管理者はワクチン証明書を更新可能"
ON vaccine_certifications FOR UPDATE
TO authenticated
USING (
  -- 管理者かどうかをチェック
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  )
  OR
  -- 管理者メールアドレスの場合
  auth.email() = 'capasjapan@gmail.com'
)
WITH CHECK (true);

-- 2. notifications テーブルのポリシーを確認・修正
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "管理者は通知を作成可能" ON notifications;
DROP POLICY IF EXISTS "Admin can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;

-- 管理者用の挿入ポリシーを作成
CREATE POLICY "管理者は通知を作成可能"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  -- 管理者かどうかをチェック
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  )
  OR
  -- 管理者メールアドレスの場合
  auth.email() = 'capasjapan@gmail.com'
);

-- 3. 管理者用の全般的な権限を確認
-- profilesテーブルの管理者データを確認
SELECT id, user_type, created_at 
FROM profiles 
WHERE user_type = 'admin' OR id = auth.uid();

-- 4. 現在のユーザーIDと権限を確認
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_email,
  (
    SELECT user_type FROM profiles 
    WHERE id = auth.uid()
  ) as user_type_from_profile;

-- 5. 既存のポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('vaccine_certifications', 'notifications')
ORDER BY tablename, policyname;

-- 6. テーブルのRLS状態を確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('vaccine_certifications', 'notifications'); 
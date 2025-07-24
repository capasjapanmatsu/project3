-- profilesテーブルのRLSポリシーを修正

-- 既存の問題のあるポリシーを削除
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- 新しい安全なポリシーを作成
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
  auth.uid() = id OR 
  auth.role() = 'authenticated'
);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- パスワードリセット時のアクセスを許可
CREATE POLICY "profiles_reset_access" ON profiles
FOR SELECT USING (true);

-- 確認クエリ
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
WHERE tablename = 'profiles'; 
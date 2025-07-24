-- 施設登録のRLSポリシー修正
-- pet_facilitiesテーブルのポリシーを確認・修正

-- 既存のポリシーを確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'pet_facilities';

-- 必要に応じて既存のポリシーを削除
DROP POLICY IF EXISTS "pet_facilities_insert_own" ON pet_facilities;
DROP POLICY IF EXISTS "pet_facilities_select_all" ON pet_facilities;
DROP POLICY IF EXISTS "pet_facilities_update_own" ON pet_facilities;

-- 新しいポリシーを作成
-- 1. 認証済みユーザーは自分の施設を登録可能
CREATE POLICY "authenticated_users_can_insert_own_facilities"
  ON pet_facilities
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- 2. 全員が承認済み施設を参照可能
CREATE POLICY "public_can_view_approved_facilities"
  ON pet_facilities
  FOR SELECT
  TO public
  USING (status = 'approved');

-- 3. 認証済みユーザーは全ての施設を参照可能（フィルタリング用）
CREATE POLICY "authenticated_users_can_view_all_facilities"
  ON pet_facilities
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. 施設所有者は自分の施設を更新可能
CREATE POLICY "facility_owners_can_update_own_facilities"
  ON pet_facilities
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 5. 管理者は全ての施設を管理可能
CREATE POLICY "admins_can_manage_all_facilities"
  ON pet_facilities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type IN ('admin', 'superadmin')
    )
  );

-- RLSが有効になっているか確認
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'pet_facilities';

-- 必要に応じてRLSを有効化
ALTER TABLE pet_facilities ENABLE ROW LEVEL SECURITY;

-- 確認メッセージ
SELECT 'Pet facilities RLS policies updated successfully' as message; 
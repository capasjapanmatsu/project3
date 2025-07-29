-- 施設削除のRLSポリシー修正
-- 管理者が施設を削除できるようにする

-- 現在のRLSポリシーを確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'pet_facilities';

-- 管理者用の削除ポリシーを作成/更新
DROP POLICY IF EXISTS \
admin_can_delete_facilities\ ON pet_facilities;

CREATE POLICY \admin_can_delete_facilities\ ON pet_facilities
FOR DELETE 
TO authenticated
USING (
  -- 管理者チェック（capasjapan@gmail.comまたはuser_type = 'admin'）
  (auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND user_type = 'admin'
  )
);

-- 既存の削除ポリシーも確認・更新
DROP POLICY IF EXISTS \Users
can
delete
own
facilities\ ON pet_facilities;

CREATE POLICY \Users
can
delete
own
facilities\ ON pet_facilities
FOR DELETE 
TO authenticated
USING (
  owner_id = auth.uid()
  OR
  -- 管理者は全ての施設を削除可能
  (auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND user_type = 'admin'
  )
);

-- pet_facility_images テーブル
DROP POLICY IF EXISTS \admin_can_delete_facility_images\ ON pet_facility_images;

CREATE POLICY \admin_can_delete_facility_images\ ON pet_facility_images
FOR DELETE 
TO authenticated
USING (
  -- 管理者チェック
  (auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND user_type = 'admin'
  )
  OR
  -- 施設オーナー
  EXISTS (
    SELECT 1 FROM pet_facilities 
    WHERE id = facility_id 
    AND owner_id = auth.uid()
  )
);

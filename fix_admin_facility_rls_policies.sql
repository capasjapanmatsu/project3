-- 管理者向けペット施設管理のRLSポリシー修正

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Admins can view all facilities" ON pet_facilities;
DROP POLICY IF EXISTS "Admins can view all facility images" ON facility_images;

-- 管理者が全ての施設を閲覧できるポリシー
CREATE POLICY "Admins can view all facilities" ON pet_facilities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

-- 管理者が施設を更新（承認・拒否）できるポリシー
CREATE POLICY "Admins can update all facilities" ON pet_facilities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

-- 管理者が施設を削除できるポリシー
CREATE POLICY "Admins can delete all facilities" ON pet_facilities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

-- 管理者が全ての施設画像を閲覧できるポリシー
CREATE POLICY "Admins can view all facility images" ON facility_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

-- 管理者が施設画像を削除できるポリシー（施設削除時に必要）
CREATE POLICY "Admins can delete facility images" ON facility_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

-- pet_facilitiesテーブルに足りないカラムを追加（もし存在しない場合）
ALTER TABLE pet_facilities 
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id);

-- category_idをcategoryに統一するためのカラム確認・修正
-- 既存データがある場合は注意が必要
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'pet_facilities' AND column_name = 'category_id') THEN
        -- category_idカラムが存在する場合、categoryカラムに移行
        UPDATE pet_facilities SET category = category_id WHERE category IS NULL;
        ALTER TABLE pet_facilities DROP COLUMN IF EXISTS category_id;
    END IF;
END $$;

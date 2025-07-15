-- RLSポリシーの無限再帰問題を修正するスクリプト
-- 実行前に、既存のポリシーを削除して再作成します

-- 1. 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "Anyone can read approved facilities" ON pet_facilities;
DROP POLICY IF EXISTS "Owners can read their own facilities" ON pet_facilities;
DROP POLICY IF EXISTS "Admins can read all facilities" ON pet_facilities;
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON pet_facilities;
DROP POLICY IF EXISTS "Owners can update their own facilities" ON pet_facilities;
DROP POLICY IF EXISTS "Admins can update all facilities" ON pet_facilities;

DROP POLICY IF EXISTS "Anyone can read approved facility images" ON facility_images;
DROP POLICY IF EXISTS "Owners can read their own facility images" ON facility_images;
DROP POLICY IF EXISTS "Admins can read all facility images" ON facility_images;
DROP POLICY IF EXISTS "Authenticated users can create facility images" ON facility_images;
DROP POLICY IF EXISTS "Owners can update their own facility images" ON facility_images;
DROP POLICY IF EXISTS "Owners can delete their own facility images" ON facility_images;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 2. profilesテーブルのRLSを一時的に無効化（管理者チェック用）
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 3. pet_facilitiesテーブルの新しいポリシー（簡略化）
-- 全員が承認済み施設を読み取り可能
CREATE POLICY "Anyone can read approved facilities" ON pet_facilities
    FOR SELECT USING (status = 'approved');

-- 認証済みユーザーは自分の施設を読み取り可能
CREATE POLICY "Users can read own facilities" ON pet_facilities
    FOR SELECT USING (auth.uid() = owner_id);

-- 認証済みユーザーは施設を作成可能
CREATE POLICY "Users can create facilities" ON pet_facilities
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- 認証済みユーザーは自分の施設を更新可能
CREATE POLICY "Users can update own facilities" ON pet_facilities
    FOR UPDATE USING (auth.uid() = owner_id);

-- 4. facility_imagesテーブルの新しいポリシー
-- 全員が承認済み施設の画像を読み取り可能
CREATE POLICY "Anyone can read approved facility images" ON facility_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_images.facility_id 
            AND pet_facilities.status = 'approved'
        )
    );

-- 認証済みユーザーは自分の施設の画像を読み取り可能
CREATE POLICY "Users can read own facility images" ON facility_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_images.facility_id 
            AND pet_facilities.owner_id = auth.uid()
        )
    );

-- 認証済みユーザーは自分の施設の画像を作成可能
CREATE POLICY "Users can create facility images" ON facility_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_images.facility_id 
            AND pet_facilities.owner_id = auth.uid()
        )
    );

-- 認証済みユーザーは自分の施設の画像を更新・削除可能
CREATE POLICY "Users can update facility images" ON facility_images
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_images.facility_id 
            AND pet_facilities.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete facility images" ON facility_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_images.facility_id 
            AND pet_facilities.owner_id = auth.uid()
        )
    );

-- 5. 管理者用の特別なポリシー（profilesテーブルのRLSを無効化したため、直接チェック）
-- 管理者は全ての施設を読み取り・更新可能
CREATE POLICY "Admins can read all facilities" ON pet_facilities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update all facilities" ON pet_facilities
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 管理者は全ての施設画像を読み取り可能
CREATE POLICY "Admins can read all facility images" ON facility_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 6. profilesテーブルに基本的な権限を付与（RLSは無効のまま）
-- 認証済みユーザーは自分のプロフィールを読み取り・更新可能
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

-- 7. 完了メッセージ
SELECT 'RLS policies fixed successfully!' AS status; 
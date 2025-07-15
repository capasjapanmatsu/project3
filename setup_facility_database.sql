-- 施設管理システム用データベース設定
-- RLSポリシー問題を解決し、完全なシステムを構築

-- 1. 既存のテーブルを削除（もし存在する場合）
DROP TABLE IF EXISTS facility_images CASCADE;
DROP TABLE IF EXISTS pet_facilities CASCADE;

-- 2. 施設テーブルを作成
CREATE TABLE pet_facilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    website VARCHAR(255),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id)
);

-- 3. 施設画像テーブルを作成
CREATE TABLE facility_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES pet_facilities(id) ON DELETE CASCADE,
    image_data TEXT NOT NULL, -- Base64エンコードされた画像データ
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. インデックスを作成
CREATE INDEX idx_pet_facilities_owner_id ON pet_facilities(owner_id);
CREATE INDEX idx_pet_facilities_status ON pet_facilities(status);
CREATE INDEX idx_pet_facilities_category_id ON pet_facilities(category_id);
CREATE INDEX idx_facility_images_facility_id ON facility_images(facility_id);
CREATE INDEX idx_facility_images_is_primary ON facility_images(is_primary);

-- 5. RLSを有効化
ALTER TABLE pet_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_images ENABLE ROW LEVEL SECURITY;

-- 6. pet_facilitiesテーブルのRLSポリシー
-- 全員が読み取り可能（承認された施設のみ）
CREATE POLICY "Anyone can read approved facilities" ON pet_facilities
    FOR SELECT USING (status = 'approved');

-- オーナーは自分の施設を読み取り可能
CREATE POLICY "Owners can read their own facilities" ON pet_facilities
    FOR SELECT USING (auth.uid() = owner_id);

-- 管理者は全ての施設を読み取り可能
CREATE POLICY "Admins can read all facilities" ON pet_facilities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 認証済みユーザーは施設を作成可能
CREATE POLICY "Authenticated users can create facilities" ON pet_facilities
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- オーナーは自分の施設を更新可能
CREATE POLICY "Owners can update their own facilities" ON pet_facilities
    FOR UPDATE USING (auth.uid() = owner_id);

-- 管理者は全ての施設を更新可能
CREATE POLICY "Admins can update all facilities" ON pet_facilities
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 7. facility_imagesテーブルのRLSポリシー
-- 全員が承認された施設の画像を読み取り可能
CREATE POLICY "Anyone can read approved facility images" ON facility_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_images.facility_id 
            AND pet_facilities.status = 'approved'
        )
    );

-- オーナーは自分の施設の画像を読み取り可能
CREATE POLICY "Owners can read their own facility images" ON facility_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_images.facility_id 
            AND pet_facilities.owner_id = auth.uid()
        )
    );

-- 管理者は全ての施設の画像を読み取り可能
CREATE POLICY "Admins can read all facility images" ON facility_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 認証済みユーザーは自分の施設の画像を作成可能
CREATE POLICY "Authenticated users can create facility images" ON facility_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_images.facility_id 
            AND pet_facilities.owner_id = auth.uid()
        )
    );

-- オーナーは自分の施設の画像を更新可能
CREATE POLICY "Owners can update their own facility images" ON facility_images
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_images.facility_id 
            AND pet_facilities.owner_id = auth.uid()
        )
    );

-- オーナーは自分の施設の画像を削除可能
CREATE POLICY "Owners can delete their own facility images" ON facility_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_images.facility_id 
            AND pet_facilities.owner_id = auth.uid()
        )
    );

-- 8. profilesテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- profilesテーブルのRLS設定
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- profilesテーブルのポリシー（無限再帰を避けるため、シンプルに）
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 9. トリガー関数を作成（updated_atの自動更新）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. トリガーを作成
CREATE TRIGGER update_pet_facilities_updated_at 
    BEFORE UPDATE ON pet_facilities 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 11. 管理者ユーザーを作成する関数
CREATE OR REPLACE FUNCTION create_admin_user(user_email VARCHAR, user_name VARCHAR)
RETURNS VOID AS $$
BEGIN
    -- 既存の管理者を更新または新規作成
    INSERT INTO profiles (id, email, name, role) 
    VALUES (
        (SELECT id FROM auth.users WHERE email = user_email LIMIT 1),
        user_email,
        user_name,
        'admin'
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
        role = 'admin',
        name = user_name,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 12. サンプルデータを挿入（テスト用）
-- 注意: この部分は実際のユーザーIDが必要なため、手動で調整してください
-- SELECT create_admin_user('admin@example.com', 'Admin User');

-- 13. 完了メッセージ
SELECT 'Facility management system database setup completed successfully!' AS status; 
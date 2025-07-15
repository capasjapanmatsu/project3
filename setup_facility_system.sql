-- ペット関連施設システムのデータベース設定

-- 1. pet_facilitiesテーブルの作成
CREATE TABLE IF NOT EXISTS pet_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20),
  website VARCHAR(255),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES auth.users(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. facility_imagesテーブルの作成（画像をBase64でDBに保存）
CREATE TABLE IF NOT EXISTS facility_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES pet_facilities(id) ON DELETE CASCADE,
  image_data TEXT NOT NULL, -- Base64エンコードされた画像データ
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. RLS（Row Level Security）ポリシーの設定

-- pet_facilitiesテーブルのRLS
ALTER TABLE pet_facilities ENABLE ROW LEVEL SECURITY;

-- オーナーは自分の施設のみ表示・編集可能
CREATE POLICY "Users can view their own facilities" ON pet_facilities
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own facilities" ON pet_facilities
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own facilities" ON pet_facilities
  FOR UPDATE USING (auth.uid() = owner_id);

-- 承認された施設は全員が閲覧可能
CREATE POLICY "Approved facilities are visible to all" ON pet_facilities
  FOR SELECT USING (status = 'approved');

-- 管理者は全ての施設を表示・編集可能
CREATE POLICY "Admins can view all facilities" ON pet_facilities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

-- facility_imagesテーブルのRLS
ALTER TABLE facility_images ENABLE ROW LEVEL SECURITY;

-- オーナーは自分の施設の画像のみ表示・編集可能
CREATE POLICY "Users can view their own facility images" ON facility_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pet_facilities 
      WHERE pet_facilities.id = facility_images.facility_id 
      AND pet_facilities.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own facility images" ON facility_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pet_facilities 
      WHERE pet_facilities.id = facility_images.facility_id 
      AND pet_facilities.owner_id = auth.uid()
    )
  );

-- 承認された施設の画像は全員が閲覧可能
CREATE POLICY "Approved facility images are visible to all" ON facility_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pet_facilities 
      WHERE pet_facilities.id = facility_images.facility_id 
      AND pet_facilities.status = 'approved'
    )
  );

-- 管理者は全ての画像を表示・編集可能
CREATE POLICY "Admins can view all facility images" ON facility_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

-- 4. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_pet_facilities_owner_id ON pet_facilities(owner_id);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_status ON pet_facilities(status);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_category ON pet_facilities(category);
CREATE INDEX IF NOT EXISTS idx_facility_images_facility_id ON facility_images(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_images_is_primary ON facility_images(is_primary);

-- 5. 更新時刻の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pet_facilities_updated_at 
  BEFORE UPDATE ON pet_facilities 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 住所から緯度経度を取得する関数（Google Maps API用）
CREATE OR REPLACE FUNCTION geocode_address(address TEXT)
RETURNS TABLE(lat DECIMAL, lng DECIMAL) AS $$
BEGIN
  -- 実際の実装では、Google Maps Geocoding APIを呼び出す
  -- ここでは簡単な例として固定値を返す
  RETURN QUERY SELECT 35.6762::DECIMAL, 139.6503::DECIMAL;
END;
$$ LANGUAGE plpgsql;

-- 7. 施設承認時の処理関数
CREATE OR REPLACE FUNCTION approve_facility(
  facility_id UUID,
  admin_id UUID
) RETURNS VOID AS $$
BEGIN
  -- 管理者権限チェック
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = admin_id 
    AND profiles.user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  -- 施設を承認
  UPDATE pet_facilities 
  SET 
    status = 'approved',
    approved_at = NOW(),
    approved_by = admin_id,
    rejection_reason = NULL
  WHERE id = facility_id;
  
  -- 住所から緯度経度を取得してGoogle Maps表示用に更新
  UPDATE pet_facilities 
  SET 
    latitude = 35.6762,  -- 実際の実装では geocode_address 関数を使用
    longitude = 139.6503
  WHERE id = facility_id;
END;
$$ LANGUAGE plpgsql;

-- 8. 施設却下時の処理関数
CREATE OR REPLACE FUNCTION reject_facility(
  facility_id UUID,
  admin_id UUID,
  reason TEXT
) RETURNS VOID AS $$
BEGIN
  -- 管理者権限チェック
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = admin_id 
    AND profiles.user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;

  -- 施設を却下
  UPDATE pet_facilities 
  SET 
    status = 'rejected',
    rejection_reason = reason,
    approved_at = NULL,
    approved_by = NULL
  WHERE id = facility_id;
END;
$$ LANGUAGE plpgsql;

-- 9. サンプルデータの挿入（テスト用）
INSERT INTO pet_facilities (
  owner_id,
  name,
  category,
  address,
  phone,
  website,
  description,
  status,
  latitude,
  longitude
) VALUES (
  'your-user-id-here',  -- 実際のユーザーIDに置き換えてください
  'サンプルペットカフェ',
  'pet_cafe',
  '東京都渋谷区渋谷1-1-1',
  '03-1234-5678',
  'https://example.com',
  'ペットと一緒に楽しめるカフェです。',
  'approved',
  35.6598,
  139.7036
) ON CONFLICT DO NOTHING;

COMMIT; 
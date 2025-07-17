-- facility_categoriesテーブルを作成し、初期データを挿入

-- 1. テーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS facility_categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_ja VARCHAR(100) NOT NULL,
  description TEXT,
  is_free BOOLEAN DEFAULT true,
  monthly_fee INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 初期データを挿入
INSERT INTO facility_categories (id, name, name_ja, description, is_free, monthly_fee)
VALUES 
  ('pet_hotel', 'Pet Hotel', 'ペットホテル', 'Pet boarding and accommodation services', true, 0),
  ('pet_salon', 'Pet Salon', 'ペットサロン', 'Pet grooming and beauty services', true, 0),
  ('veterinary', 'Veterinary', '動物病院', 'Veterinary medical services', true, 0),
  ('pet_cafe', 'Pet Cafe', 'ペットカフェ', 'Pet-friendly cafe and restaurant', true, 0),
  ('pet_restaurant', 'Pet Restaurant', 'ペット同伴レストラン', 'Pet-friendly dining establishments', true, 0),
  ('pet_shop', 'Pet Shop', 'ペットショップ', 'Pet supplies and accessories', true, 0),
  ('pet_accommodation', 'Pet Accommodation', 'ペット同伴宿泊', 'Pet-friendly hotels and accommodations', true, 0)
ON CONFLICT (id) DO NOTHING;

-- 3. RLSを有効化
ALTER TABLE facility_categories ENABLE ROW LEVEL SECURITY;

-- 4. 全員が読み取り可能にする
CREATE POLICY IF NOT EXISTS "Anyone can view facility categories"
  ON facility_categories FOR SELECT
  USING (true);

-- 5. データを確認
SELECT * FROM facility_categories ORDER BY id; 
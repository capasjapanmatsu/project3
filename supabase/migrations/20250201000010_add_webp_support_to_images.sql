-- WebP画像サポートを追加するためのマイグレーション

-- dogsテーブルにサムネイルURLカラムを追加
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS webp_url TEXT;

-- dog_parksテーブルにWebP画像URLカラムを追加
ALTER TABLE dog_parks
ADD COLUMN IF NOT EXISTS webp_image_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- dog_park_facility_imagesテーブルにWebP画像URLカラムを追加
ALTER TABLE dog_park_facility_images
ADD COLUMN IF NOT EXISTS webp_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- pet_facilitiesテーブルにWebP画像URLカラムを追加
ALTER TABLE pet_facilities
ADD COLUMN IF NOT EXISTS webp_image_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- vaccine_certificationsテーブルにWebP画像URLカラムを追加
ALTER TABLE vaccine_certifications
ADD COLUMN IF NOT EXISTS rabies_vaccine_webp TEXT,
ADD COLUMN IF NOT EXISTS rabies_vaccine_thumbnail TEXT,
ADD COLUMN IF NOT EXISTS combo_vaccine_webp TEXT,
ADD COLUMN IF NOT EXISTS combo_vaccine_thumbnail TEXT;

-- facility_imagesテーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS facility_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID REFERENCES pet_facilities(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  webp_url TEXT,
  thumbnail_url TEXT,
  image_type VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_dogs_webp_url ON dogs(webp_url);
CREATE INDEX IF NOT EXISTS idx_dog_parks_webp_image_url ON dog_parks(webp_image_url);
CREATE INDEX IF NOT EXISTS idx_facility_images_facility_id ON facility_images(facility_id);

-- コメントの追加
COMMENT ON COLUMN dogs.thumbnail_url IS 'WebP形式のサムネイル画像URL (300x300px)';
COMMENT ON COLUMN dogs.webp_url IS 'WebP形式のプロフィール画像URL';
COMMENT ON COLUMN dog_parks.webp_image_url IS 'WebP形式のメイン画像URL';
COMMENT ON COLUMN dog_parks.thumbnail_url IS 'WebP形式のサムネイル画像URL';
COMMENT ON COLUMN vaccine_certifications.rabies_vaccine_webp IS '狂犬病ワクチン証明書のWebP画像URL';
COMMENT ON COLUMN vaccine_certifications.combo_vaccine_webp IS '混合ワクチン証明書のWebP画像URL';

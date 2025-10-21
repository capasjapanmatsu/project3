-- 施設画像管理システムの作成
-- pet_facilities用の画像テーブルとStorageバケットを設定

-- 1. 施設画像テーブルを作成
CREATE TABLE IF NOT EXISTS pet_facility_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES pet_facilities(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_type text NOT NULL DEFAULT 'additional' CHECK (image_type IN ('main', 'additional')),
  display_order integer NOT NULL DEFAULT 0,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_pet_facility_images_facility_id ON pet_facility_images(facility_id);
CREATE INDEX IF NOT EXISTS idx_pet_facility_images_display_order ON pet_facility_images(facility_id, display_order);
CREATE INDEX IF NOT EXISTS idx_pet_facility_images_type ON pet_facility_images(image_type);

-- 3. RLSを有効化
ALTER TABLE pet_facility_images ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシーを作成
-- 施設所有者は自分の施設画像を管理可能
CREATE POLICY "facility_owners_can_manage_images"
  ON pet_facility_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pet_facilities
      WHERE pet_facilities.id = pet_facility_images.facility_id
      AND pet_facilities.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pet_facilities
      WHERE pet_facilities.id = pet_facility_images.facility_id
      AND pet_facilities.owner_id = auth.uid()
    )
  );

-- 一般投稿者は自身が投稿した仮掲載施設の画像を管理可能
CREATE POLICY "submitters_can_manage_images"
  ON pet_facility_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pet_facilities
      WHERE pet_facilities.id = pet_facility_images.facility_id
      AND pet_facilities.is_user_submitted = true
      AND pet_facilities.submitted_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pet_facilities
      WHERE pet_facilities.id = pet_facility_images.facility_id
      AND pet_facilities.is_user_submitted = true
      AND pet_facilities.submitted_by = auth.uid()
    )
  );

-- 認証済みユーザーは承認済み施設の画像を参照可能
CREATE POLICY "users_can_view_approved_facility_images"
  ON pet_facility_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pet_facilities
      WHERE pet_facilities.id = pet_facility_images.facility_id
      AND pet_facilities.status = 'approved'
    )
  );

-- 管理者は全ての施設画像を管理可能
CREATE POLICY "admins_can_manage_all_facility_images"
  ON pet_facility_images
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

-- 5. Storageバケットを作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-facility-images',
  'pet-facility-images',
  true,
  5242880, -- 5MB制限
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 6. Storageポリシーを作成
-- 施設所有者は自分の施設画像をアップロード可能
CREATE POLICY "facility_owners_can_upload_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pet-facility-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM pet_facilities
    WHERE owner_id = auth.uid()
  )
);

-- 一般投稿者は自身の仮掲載施設にアップロード可能
CREATE POLICY "submitters_can_upload_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pet-facility-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM pet_facilities
    WHERE is_user_submitted = true AND submitted_by = auth.uid()
  )
);

-- 施設所有者は自分の施設画像を更新可能
CREATE POLICY "facility_owners_can_update_images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pet-facility-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM pet_facilities
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "submitters_can_update_images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pet-facility-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM pet_facilities
    WHERE is_user_submitted = true AND submitted_by = auth.uid()
  )
);

-- 施設所有者は自分の施設画像を削除可能
CREATE POLICY "facility_owners_can_delete_images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pet-facility-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM pet_facilities
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "submitters_can_delete_images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pet-facility-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM pet_facilities
    WHERE is_user_submitted = true AND submitted_by = auth.uid()
  )
);

-- 全員が承認済み施設画像を参照可能
CREATE POLICY "public_can_view_facility_images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'pet-facility-images');

-- 7. 更新時刻自動更新のトリガー
CREATE OR REPLACE FUNCTION update_pet_facility_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pet_facility_images_updated_at
    BEFORE UPDATE ON pet_facility_images
    FOR EACH ROW
    EXECUTE FUNCTION update_pet_facility_images_updated_at();

-- 8. 確認メッセージ
SELECT 'Pet facility images table and storage bucket created successfully' as message; 
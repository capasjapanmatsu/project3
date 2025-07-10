-- Supabase Storage の dog-images バケット用アップロードポリシー

-- 1. 既存のポリシーを確認・削除
DROP POLICY IF EXISTS "Users can upload dog images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to dog-images" ON storage.objects;

-- 2. 認証されたユーザーがdog-imagesバケットにアップロードできるポリシーを作成
CREATE POLICY "Allow authenticated dog image uploads"
ON storage.objects
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' 
  AND bucket_id = 'dog-images'
);

-- 3. 認証されたユーザーが自分のdog画像を更新できるポリシーを作成
CREATE POLICY "Allow authenticated dog image updates"
ON storage.objects
FOR UPDATE
USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'dog-images'
)
WITH CHECK (
  auth.role() = 'authenticated' 
  AND bucket_id = 'dog-images'
);

-- 4. 認証されたユーザーがdog画像を読み取れるポリシーを作成
CREATE POLICY "Allow authenticated dog image reads"
ON storage.objects
FOR SELECT
USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'dog-images'
);

-- 5. 認証されたユーザーが自分のdog画像を削除できるポリシーを作成
CREATE POLICY "Allow authenticated dog image deletes"
ON storage.objects
FOR DELETE
USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'dog-images'
);

-- 6. バケットが存在することを確認・作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('dog-images', 'dog-images', true)
ON CONFLICT (id) DO NOTHING; 
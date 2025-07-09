-- 完全なストレージポリシーの修正
-- すべてのストレージ関連の問題を解決する

-- 1. 既存のバケットを確認・作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('dog-images', 'dog-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('vaccine-certificates', 'vaccine-certificates', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. 既存のポリシーを全て削除
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみアップロード可能" ON storage.objects;
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみ参照可能" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload dog images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view dog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update dog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete dog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload dog images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view dog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update dog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete dog images" ON storage.objects;

-- 3. 犬の画像用ポリシー（パブリック読み取り、認証済みユーザーのみアップロード）
CREATE POLICY "Anyone can view dog images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'dog-images');

CREATE POLICY "Authenticated users can upload dog images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dog-images');

CREATE POLICY "Authenticated users can update dog images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'dog-images');

CREATE POLICY "Authenticated users can delete dog images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'dog-images');

-- 4. ワクチン証明書用ポリシー（認証済みユーザーのみアクセス）
CREATE POLICY "Authenticated users can upload vaccine certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vaccine-certificates');

CREATE POLICY "Authenticated users can view vaccine certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vaccine-certificates');

CREATE POLICY "Authenticated users can update vaccine certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vaccine-certificates');

CREATE POLICY "Authenticated users can delete vaccine certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vaccine-certificates');

-- 5. 確認用クエリ
SELECT 'Storage policies updated successfully' as status;

-- 6. バケット情報の確認
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id IN ('dog-images', 'vaccine-certificates');

-- 7. ポリシー一覧の確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname; 
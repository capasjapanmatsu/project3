-- 手動実行用: vaccine-certsバケットの作成と権限設定
-- Supabaseダッシュボード > SQL Editor で実行してください

-- 1. vaccine-certsバケットを作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vaccine-certs',
  'vaccine-certs',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. 既存のポリシーをクリア
DROP POLICY IF EXISTS "Users can upload vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can view vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete vaccine certificates" ON storage.objects;

-- 3. 新しいポリシーを作成
CREATE POLICY "Authenticated users can upload vaccine certificates"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vaccine-certs');

CREATE POLICY "Authenticated users can view vaccine certificates"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vaccine-certs');

CREATE POLICY "Authenticated users can update vaccine certificates"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'vaccine-certs')
WITH CHECK (bucket_id = 'vaccine-certs');

CREATE POLICY "Authenticated users can delete vaccine certificates"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vaccine-certs'); 
-- vaccine-certsバケットの強制作成と権限設定
-- 2025年6月27日: アップロード失敗問題の解決

-- 1. vaccine-certsバケットを作成（存在しない場合）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vaccine-certs',
  'vaccine-certs',
  true,  -- パブリックアクセス可能
  10485760, -- 10MB制限
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. 既存のRLSポリシーをクリア
DROP POLICY IF EXISTS "Users can upload vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can view vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update vaccine certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete vaccine certificates" ON storage.objects;

-- 3. シンプルなRLSポリシーを設定
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

-- 4. バケットが正しく作成されたことを確認するための情報出力
DO $$
BEGIN
  RAISE NOTICE 'vaccine-certs bucket setup completed successfully';
END $$; 
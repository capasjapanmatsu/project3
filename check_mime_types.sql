-- vaccine-certsバケットのMIMEタイプ制限を確認・修正

-- 現在のMIMEタイプ制限を確認
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'vaccine-certs';

-- 必要に応じて、MIMEタイプ制限を修正
-- 以下のSQLを実行してMIMEタイプを追加
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',      -- ← 重要: image/jpg を追加
  'image/png',
  'image/gif',
  'image/webp'
]
WHERE id = 'vaccine-certs';

-- 修正後の確認
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'vaccine-certs'; 
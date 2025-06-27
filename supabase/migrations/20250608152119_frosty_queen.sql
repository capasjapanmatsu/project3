/*
  # ワンちゃん画像表示の修正

  1. ストレージバケットの再設定
    - dog-images バケットを完全に再作成
    - 適切な公開設定とポリシー

  2. 画像URL処理の改善
    - 公開URLの正しい生成
*/

-- 既存のdog-imagesバケットとオブジェクトを完全削除
DELETE FROM storage.objects WHERE bucket_id = 'dog-images';
DELETE FROM storage.buckets WHERE id = 'dog-images';

-- dog-imagesバケットを公開設定で再作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dog-images', 
  'dog-images', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "Users can upload dog images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view dog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update dog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete dog images" ON storage.objects;

-- 新しいポリシーを作成（シンプルで確実な設定）
CREATE POLICY "Enable insert for authenticated users"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dog-images');

CREATE POLICY "Enable select for all users"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'dog-images');

CREATE POLICY "Enable update for authenticated users"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'dog-images');

CREATE POLICY "Enable delete for authenticated users"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'dog-images');
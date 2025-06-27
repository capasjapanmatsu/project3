/*
  # ワンちゃん画像アップロード機能の完全修正

  1. ストレージバケットの再設定
    - dog-images バケットを完全に再作成
    - 適切な設定とポリシー

  2. セキュリティポリシーの簡素化
    - 認証ユーザーは自由にアップロード・更新・削除可能
    - 全ユーザーが画像を閲覧可能
*/

-- 既存のdog-imagesバケットとオブジェクトを完全削除
DELETE FROM storage.objects WHERE bucket_id = 'dog-images';
DELETE FROM storage.buckets WHERE id = 'dog-images';

-- 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable select for all users" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload dog images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view dog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update dog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete dog images" ON storage.objects;

-- dog-imagesバケットを公開設定で再作成
INSERT INTO storage.buckets (
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types
) VALUES (
  'dog-images', 
  'dog-images', 
  true, 
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
);

-- シンプルで確実なポリシーを作成
CREATE POLICY "Allow authenticated users to upload dog images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dog-images');

CREATE POLICY "Allow everyone to view dog images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'dog-images');

CREATE POLICY "Allow authenticated users to update dog images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'dog-images');

CREATE POLICY "Allow authenticated users to delete dog images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'dog-images');
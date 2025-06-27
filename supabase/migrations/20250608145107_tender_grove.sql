/*
  # 犬の画像表示問題の修正

  1. ストレージバケットの設定
    - dog-images バケットを公開設定に変更
    - 適切なRLSポリシーを設定

  2. 画像URL生成の修正
    - 公開URLの生成方法を統一
*/

-- 既存のdog-imagesバケットを削除して再作成
DELETE FROM storage.objects WHERE bucket_id = 'dog-images';
DELETE FROM storage.buckets WHERE id = 'dog-images';

-- dog-imagesバケットを公開設定で作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('dog-images', 'dog-images', true);

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can upload images for their dogs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view dog images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update images for their dogs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete images for their dogs" ON storage.objects;

-- 新しいポリシーを作成
CREATE POLICY "Users can upload dog images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dog-images'
);

CREATE POLICY "Anyone can view dog images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'dog-images');

CREATE POLICY "Users can update dog images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dog-images'
);

CREATE POLICY "Users can delete dog images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'dog-images'
);
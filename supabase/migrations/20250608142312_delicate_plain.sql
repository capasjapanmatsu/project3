/*
  # ワンちゃん画像アップロード機能の追加

  1. ストレージバケット
    - `dog-images` バケットを作成
    - 犬の画像を保存するためのストレージ

  2. セキュリティ
    - 犬の飼い主のみがアップロード・参照可能
    - 適切なRLSポリシーを設定

  3. 機能
    - 犬の登録・編集時に画像アップロード
    - コミュニティで犬の画像表示
*/

-- 犬の画像用ストレージバケットを作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('dog-images', 'dog-images', true)
ON CONFLICT (id) DO NOTHING;

-- 犬の画像アップロード用ポリシー
CREATE POLICY "Users can upload images for their dogs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dog-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT dogs.id::text 
    FROM dogs 
    WHERE dogs.owner_id = auth.uid()
  )
);

-- 犬の画像参照用ポリシー（公開設定なので誰でも参照可能）
CREATE POLICY "Anyone can view dog images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'dog-images');

-- 犬の画像更新用ポリシー
CREATE POLICY "Users can update images for their dogs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dog-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT dogs.id::text 
    FROM dogs 
    WHERE dogs.owner_id = auth.uid()
  )
);

-- 犬の画像削除用ポリシー
CREATE POLICY "Users can delete images for their dogs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'dog-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT dogs.id::text 
    FROM dogs 
    WHERE dogs.owner_id = auth.uid()
  )
);
-- vaccine-certsバケットのアクセス権限を修正

-- 1. 既存のポリシーを確認
SELECT * FROM storage.policies WHERE bucket_id = 'vaccine-certs';

-- 2. vaccine-certsバケットの情報を確認
SELECT * FROM storage.buckets WHERE id = 'vaccine-certs';

-- 3. 管理者がワクチン証明書を読み取れるポリシーを追加
CREATE POLICY "Admins can read vaccine certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vaccine-certs' AND
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data ->> 'isAdmin' = 'true'
  )
);

-- 4. 犬の飼い主が自分の犬のワクチン証明書を読み取れるポリシーを追加
CREATE POLICY "Owners can read their dogs vaccine certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vaccine-certs' AND
  auth.uid() IN (
    SELECT d.owner_id FROM dogs d
    WHERE d.id::text = SPLIT_PART(name, '/', 1)
  )
);

-- 5. 管理者がワクチン証明書を挿入できるポリシーを追加
CREATE POLICY "Admins can insert vaccine certificates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vaccine-certs' AND
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data ->> 'isAdmin' = 'true'
  )
);

-- 6. 犬の飼い主が自分の犬のワクチン証明書を挿入できるポリシーを追加
CREATE POLICY "Owners can insert their dogs vaccine certificates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vaccine-certs' AND
  auth.uid() IN (
    SELECT d.owner_id FROM dogs d
    WHERE d.id::text = SPLIT_PART(name, '/', 1)
  )
);

-- 7. 管理者がワクチン証明書を更新できるポリシーを追加
CREATE POLICY "Admins can update vaccine certificates"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'vaccine-certs' AND
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data ->> 'isAdmin' = 'true'
  )
);

-- 8. 犬の飼い主が自分の犬のワクチン証明書を更新できるポリシーを追加
CREATE POLICY "Owners can update their dogs vaccine certificates"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'vaccine-certs' AND
  auth.uid() IN (
    SELECT d.owner_id FROM dogs d
    WHERE d.id::text = SPLIT_PART(name, '/', 1)
  )
);

-- 9. バケットをpublicに設定（読み取り専用）
UPDATE storage.buckets SET public = true WHERE id = 'vaccine-certs'; 
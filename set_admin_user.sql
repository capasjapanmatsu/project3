-- 現在のユーザーを管理者として設定
-- まず現在のユーザーIDを確認
SELECT auth.uid() as current_user_id;

-- profilesテーブルに現在のユーザーのレコードが存在するかチェック
SELECT * FROM profiles WHERE id = auth.uid();

-- レコードが存在しない場合は作成、存在する場合は管理者に更新
INSERT INTO profiles (id, user_type, name, created_at) 
VALUES (
  auth.uid(), 
  'admin', 
  'Admin User', 
  NOW()
) 
ON CONFLICT (id) 
DO UPDATE SET 
  user_type = 'admin',
  updated_at = NOW()
WHERE profiles.id = auth.uid();

-- 結果確認
SELECT id, user_type, name FROM profiles WHERE id = auth.uid(); 
-- 現在のユーザーにadmin権限を付与するスクリプト

-- 現在のユーザーIDを確認
SELECT auth.uid() as current_user_id;

-- 現在のユーザーのプロフィール情報を確認
SELECT id, email, user_type, name FROM profiles WHERE id = auth.uid();

-- 現在のユーザーにadmin権限を付与
UPDATE profiles 
SET user_type = 'admin' 
WHERE id = auth.uid();

-- 更新後のプロフィール情報を確認
SELECT id, email, user_type, name FROM profiles WHERE id = auth.uid();

-- プロフィールが存在しない場合は作成
INSERT INTO profiles (id, email, user_type, name)
SELECT auth.uid(), auth.email(), 'admin', 'Admin User'
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid());

-- 確認
SELECT 'Admin権限を付与しました' as result; 
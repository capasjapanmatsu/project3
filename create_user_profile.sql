-- 現在のユーザーのプロフィールを作成し、管理者権限を付与するスクリプト
-- fix_rls_policies.sql を実行した後に実行してください

-- 1. 現在のユーザーの情報を取得
SELECT 
    auth.uid() as user_id,
    auth.email() as user_email;

-- 2. 現在のユーザーのプロフィールを作成（管理者権限付き）
INSERT INTO profiles (id, email, name, role, created_at, updated_at)
VALUES (
    auth.uid(),
    COALESCE(auth.email(), 'admin@example.com'),
    'Admin User',
    'admin',
    NOW(),
    NOW()
)
ON CONFLICT (id) 
DO UPDATE SET 
    role = 'admin',
    name = 'Admin User',
    updated_at = NOW();

-- 3. 作成されたプロフィールを確認
SELECT 
    id,
    email,
    name,
    role,
    created_at,
    updated_at
FROM profiles 
WHERE id = auth.uid();

-- 4. 管理者権限を持つユーザーを全て表示
SELECT 
    id,
    email,
    name,
    role,
    created_at
FROM profiles 
WHERE role = 'admin';

-- 5. 完了メッセージ
SELECT 'User profile created with admin role successfully!' AS status; 
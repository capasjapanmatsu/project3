-- 管理者ユーザー設定スクリプト
-- このスクリプトは setup_facility_database.sql を実行した後に実行してください

-- 1. 現在のユーザーを管理者として設定
-- 注意: 'your-email@example.com' を実際のメールアドレスに変更してください
INSERT INTO profiles (id, email, name, role) 
VALUES (
    auth.uid(),
    'your-email@example.com',
    'Admin User',
    'admin'
)
ON CONFLICT (id) 
DO UPDATE SET 
    role = 'admin',
    name = 'Admin User',
    updated_at = NOW();

-- 2. 管理者権限の確認
SELECT 
    p.id,
    p.email,
    p.name,
    p.role,
    p.created_at
FROM profiles p
WHERE p.role = 'admin';

-- 3. 完了メッセージ
SELECT 'Admin user setup completed successfully!' AS status; 
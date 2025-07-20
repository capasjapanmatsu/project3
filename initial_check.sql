-- 現在のテーブル構造と管理者アカウントの確認
-- 管理者アカウントの存在確認
SELECT id, email, name, user_type, created_at 
FROM profiles 
WHERE email = 'capasjapan@gmail.com';

-- 各テーブルのレコード数確認
SELECT 
    'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'dogs', COUNT(*) FROM dogs
UNION ALL
SELECT 'friend_requests', COUNT(*) FROM friend_requests
UNION ALL
SELECT 'friendships', COUNT(*) FROM friendships
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'encounters', COUNT(*) FROM encounters;

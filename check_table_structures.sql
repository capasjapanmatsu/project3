-- 現在のテーブル構造を確認するSQL
-- 各テーブルの列構造を確認してからデータを挿入
-- 1. profilesテーブルの構造確認
SELECT column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
-- 2. dogsテーブルの構造確認
SELECT column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'dogs'
ORDER BY ordinal_position;
-- 3. friend_requestsテーブルの構造確認
SELECT column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'friend_requests'
ORDER BY ordinal_position;
-- 4. friendshipsテーブルの構造確認
SELECT column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'friendships'
ORDER BY ordinal_position;
-- 5. messagesテーブルの構造確認
SELECT column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;
-- 6. notificationsテーブルの構造確認
SELECT column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
-- 7. encountersテーブルの構造確認
SELECT column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'encounters'
ORDER BY ordinal_position;
-- 8. 管理者アカウントの確認
SELECT id,
    email,
    name,
    user_type,
    created_at
FROM profiles
WHERE email = 'capasjapan@gmail.com';
-- 9. 既存のデータ数を確認
SELECT 'profiles' as table_name,
    COUNT(*) as count
FROM profiles
UNION ALL
SELECT 'dogs',
    COUNT(*)
FROM dogs
UNION ALL
SELECT 'friend_requests',
    COUNT(*)
FROM friend_requests
UNION ALL
SELECT 'friendships',
    COUNT(*)
FROM friendships
UNION ALL
SELECT 'messages',
    COUNT(*)
FROM messages
UNION ALL
SELECT 'notifications',
    COUNT(*)
FROM notifications
UNION ALL
SELECT 'encounters',
    COUNT(*)
FROM encounters;
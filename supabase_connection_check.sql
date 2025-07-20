-- Supabase接続確認とデータ状況チェック
-- PostgreSQL拡張機能で実行してください
-- 1. まず、主要なテーブルが存在するかを確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- 2. usersテーブルの構造確認
SELECT column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
    AND table_schema = 'public'
ORDER BY ordinal_position;
-- 3. 現在のユーザー数を確認
SELECT COUNT(*) as total_users
FROM users;
-- 4. 管理者アカウントの存在確認
SELECT id,
    email,
    username,
    created_at,
    updated_at
FROM users
WHERE email = 'capasjapan@gmail.com';
-- 5. dogsテーブルの構造確認
SELECT column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'dogs'
    AND table_schema = 'public'
ORDER BY ordinal_position;
-- 6. 犬の登録数確認
SELECT COUNT(*) as total_dogs
FROM dogs;
-- 7. 管理者の犬がいるかチェック
SELECT d.id,
    d.name,
    d.breed,
    d.owner_id,
    u.email
FROM dogs d
    JOIN users u ON d.owner_id = u.id
WHERE u.email = 'capasjapan@gmail.com';
-- 8. friendshipsテーブルの確認
SELECT COUNT(*) as total_friendships
FROM friendships;
-- 9. friend_requestsテーブルの確認
SELECT COUNT(*) as total_friend_requests
FROM friend_requests;
-- 10. messagesテーブルの確認
SELECT COUNT(*) as total_messages
FROM messages;
-- 11. notificationsテーブルの確認
SELECT COUNT(*) as total_notifications
FROM notifications;
-- 12. encountersテーブルの確認
SELECT COUNT(*) as total_encounters
FROM encounters;
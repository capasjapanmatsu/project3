-- 簡単にテストデータを挿入するためのSQL
-- Supabase SQLエディターで実行してください
-- 注意: UUIDは自動生成されるため、実際のIDは異なります

-- ステップ1: まず現在のデータを確認
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM profiles
UNION ALL
SELECT 'dogs', COUNT(*) FROM dogs
UNION ALL  
SELECT 'friend_requests', COUNT(*) FROM friend_requests
UNION ALL
SELECT 'dog_encounters', COUNT(*) FROM dog_encounters
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;

-- ステップ2: 既存のユーザーがいる場合は確認
SELECT id, email, full_name, nickname, created_at FROM profiles ORDER BY created_at DESC LIMIT 5;

-- シンプルなテストデータ挿入SQL（手動実行用）
-- 注意: 既存のユーザーIDがある場合は、そのIDを使用して犬データを追加してください

-- まず、既存のユーザーを確認（このクエリを先に実行してユーザーIDを確認）
SELECT id, email, full_name, created_at FROM profiles ORDER BY created_at DESC LIMIT 10;

-- 以下のスクリプトでは、上記で確認したユーザーIDを使用してください
-- 例: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' のような実際のUUIDに置き換えてください

-- 犬のデータを挿入（実際のuser_idに置き換えてください）
-- INSERT INTO dogs (user_id, name, breed, gender, birth_date, weight, color, personality, created_at) VALUES
-- ('実際のユーザーID1', 'ポチ', '柴犬', 'オス', '2022-03-15', 8.5, '茶色', '元気で人懐っこい', NOW()),
-- ('実際のユーザーID2', 'ココ', 'トイプードル', 'メス', '2023-01-20', 3.2, '白', '甘えん坊で賢い', NOW()),
-- ('実際のユーザーID3', 'チョコ', 'ゴールデンレトリバー', 'オス', '2021-08-10', 28.5, 'ゴールド', '優しくて大人しい', NOW());

-- 友達リクエストを挿入（実際のユーザーIDに置き換えてください）
-- INSERT INTO friend_requests (requester_id, requested_id, status, created_at) VALUES
-- ('実際のユーザーID1', '実際のユーザーID2', 'pending', NOW()),
-- ('実際のユーザーID3', '実際のユーザーID1', 'pending', NOW()),
-- ('実際のユーザーID2', '実際のユーザーID3', 'accepted', NOW() - INTERVAL '1 day');

-- 友達関係を挿入（承認済みの場合）
-- INSERT INTO friendships (user_id, friend_id, created_at) VALUES
-- ('実際のユーザーID2', '実際のユーザーID3', NOW()),
-- ('実際のユーザーID3', '実際のユーザーID2', NOW());

-- メッセージを挿入（実際のユーザーIDに置き換えてください）
-- INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES
-- ('実際のユーザーID1', '実際のユーザーID2', 'こんにちは！一緒に散歩しませんか？', NOW() - INTERVAL '1 hour'),
-- ('実際のユーザーID2', '実際のユーザーID1', 'ぜひお願いします！', NOW() - INTERVAL '30 minutes');

-- 通知を挿入（実際のユーザーIDに置き換えてください）
-- INSERT INTO notifications (user_id, type, title, message, read, created_at) VALUES
-- ('実際のユーザーID2', 'friend_request', '友達リクエスト', 'ユーザー1さんから友達リクエストが届きました', false, NOW()),
-- ('実際のユーザーID1', 'friend_request', '友達リクエスト', 'ユーザー3さんから友達リクエストが届きました', false, NOW());

-- 挿入後の確認
-- SELECT 'dogs' as table_name, COUNT(*) as count FROM dogs
-- UNION ALL
-- SELECT 'friend_requests', COUNT(*) FROM friend_requests  
-- UNION ALL
-- SELECT 'messages', COUNT(*) FROM messages
-- UNION ALL
-- SELECT 'notifications', COUNT(*) FROM notifications;

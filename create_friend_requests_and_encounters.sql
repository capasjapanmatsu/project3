-- 友達リクエストのテストデータを作成
-- 注意: このスクリプトは create_test_users_and_dogs.sql の後に実行してください

-- 現在のユーザーを確認
SELECT id, full_name, nickname FROM profiles WHERE full_name IS NOT NULL ORDER BY created_at;

-- 友達リクエストを作成
DO $$
DECLARE
    user1_id UUID;
    user2_id UUID;
    user3_id UUID;
BEGIN
    -- ユーザーIDを取得
    SELECT id INTO user1_id FROM profiles WHERE full_name = '田中太郎';
    SELECT id INTO user2_id FROM profiles WHERE full_name = '佐藤花子';
    SELECT id INTO user3_id FROM profiles WHERE full_name = '山田次郎';
    
    -- 友達リクエスト1: 田中 → 佐藤
    IF user1_id IS NOT NULL AND user2_id IS NOT NULL THEN
        INSERT INTO friend_requests (requester_id, requested_id, status, created_at)
        VALUES (user1_id, user2_id, 'pending', NOW())
        ON CONFLICT (requester_id, requested_id) DO NOTHING;
        
        RAISE NOTICE '友達リクエスト作成: 田中太郎 → 佐藤花子';
    END IF;
    
    -- 友達リクエスト2: 山田 → 田中
    IF user3_id IS NOT NULL AND user1_id IS NOT NULL THEN
        INSERT INTO friend_requests (requester_id, requested_id, status, created_at)
        VALUES (user3_id, user1_id, 'pending', NOW())
        ON CONFLICT (requester_id, requested_id) DO NOTHING;
        
        RAISE NOTICE '友達リクエスト作成: 山田次郎 → 田中太郎';
    END IF;
    
    -- 承認済みの友達関係: 佐藤 ↔ 山田
    IF user2_id IS NOT NULL AND user3_id IS NOT NULL THEN
        -- 友達リクエストを承認済みにする
        INSERT INTO friend_requests (requester_id, requested_id, status, created_at, updated_at)
        VALUES (user2_id, user3_id, 'accepted', NOW() - INTERVAL '1 day', NOW())
        ON CONFLICT (requester_id, requested_id) DO UPDATE SET
            status = 'accepted',
            updated_at = NOW();
        
        -- 友達関係を作成
        INSERT INTO friendships (user_id, friend_id, created_at)
        VALUES 
            (user2_id, user3_id, NOW()),
            (user3_id, user2_id, NOW())
        ON CONFLICT (user_id, friend_id) DO NOTHING;
        
        RAISE NOTICE '友達関係作成: 佐藤花子 ↔ 山田次郎';
    END IF;
END $$;

-- 犬の出会いデータを作成
DO $$
DECLARE
    dog1_id UUID;
    dog2_id UUID;
    dog3_id UUID;
    user1_id UUID;
    user2_id UUID;
    user3_id UUID;
BEGIN
    -- ユーザーIDを取得
    SELECT id INTO user1_id FROM profiles WHERE full_name = '田中太郎';
    SELECT id INTO user2_id FROM profiles WHERE full_name = '佐藤花子';
    SELECT id INTO user3_id FROM profiles WHERE full_name = '山田次郎';
    
    -- 犬のIDを取得
    SELECT id INTO dog1_id FROM dogs WHERE user_id = user1_id;
    SELECT id INTO dog2_id FROM dogs WHERE user_id = user2_id;
    SELECT id INTO dog3_id FROM dogs WHERE user_id = user3_id;
    
    -- 出会いデータを作成
    IF dog1_id IS NOT NULL AND dog2_id IS NOT NULL THEN
        INSERT INTO dog_encounters (
            user_id, dog_id, encountered_dog_id, encountered_at, location, notes, created_at
        ) VALUES (
            user1_id, dog1_id, dog2_id, NOW() - INTERVAL '2 hours', 
            '渋谷ドッグパーク', 'とても仲良く遊んでいました', NOW()
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '出会いデータ作成: ポチ と ココ';
    END IF;
    
    IF dog2_id IS NOT NULL AND dog3_id IS NOT NULL THEN
        INSERT INTO dog_encounters (
            user_id, dog_id, encountered_dog_id, encountered_at, location, notes, created_at
        ) VALUES (
            user2_id, dog2_id, dog3_id, NOW() - INTERVAL '1 day', 
            '代々木公園', '初対面でしたが、すぐに仲良くなりました', NOW()
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '出会いデータ作成: ココ と チョコ';
    END IF;
END $$;

-- 通知データを作成
DO $$
DECLARE
    user1_id UUID;
    user2_id UUID;
    user3_id UUID;
BEGIN
    -- ユーザーIDを取得
    SELECT id INTO user1_id FROM profiles WHERE full_name = '田中太郎';
    SELECT id INTO user2_id FROM profiles WHERE full_name = '佐藤花子';
    SELECT id INTO user3_id FROM profiles WHERE full_name = '山田次郎';
    
    -- 通知を作成
    IF user1_id IS NOT NULL AND user2_id IS NOT NULL THEN
        INSERT INTO notifications (
            user_id, type, title, message, read, created_at
        ) VALUES (
            user2_id, 'friend_request', '友達リクエスト', 
            '田中太郎さんから友達リクエストが届きました', false, NOW()
        );
        
        RAISE NOTICE '通知作成: 佐藤花子宛ての友達リクエスト通知';
    END IF;
    
    IF user1_id IS NOT NULL AND user3_id IS NOT NULL THEN
        INSERT INTO notifications (
            user_id, type, title, message, read, created_at
        ) VALUES (
            user1_id, 'friend_request', '友達リクエスト', 
            '山田次郎さんから友達リクエストが届きました', false, NOW()
        );
        
        RAISE NOTICE '通知作成: 田中太郎宛ての友達リクエスト通知';
    END IF;
END $$;

-- 結果を確認
SELECT 
    'ユーザー' as table_name,
    COUNT(*) as count
FROM profiles
WHERE full_name IS NOT NULL

UNION ALL

SELECT 
    '犬',
    COUNT(*)
FROM dogs

UNION ALL

SELECT 
    '友達リクエスト',
    COUNT(*)
FROM friend_requests

UNION ALL

SELECT 
    '友達関係',
    COUNT(*)
FROM friendships

UNION ALL

SELECT 
    '出会い',
    COUNT(*)
FROM dog_encounters

UNION ALL

SELECT 
    '通知',
    COUNT(*)
FROM notifications;

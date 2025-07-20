-- テスト用の実ユーザーデータを作成
-- 注意: このスクリプトは開発環境でのみ実行してください

-- 既存のユーザーを確認
SELECT id, email, full_name, nickname FROM profiles ORDER BY created_at DESC LIMIT 5;

-- サンプルユーザーを作成（auth.usersテーブルには手動で追加する必要があります）
-- ここでは既存のユーザーIDを使用してプロファイルを更新

-- ユーザー1: 田中さんとその犬
DO $$
DECLARE
    user1_id UUID;
    dog1_id UUID;
BEGIN
    -- 既存のユーザーIDを取得（最初のユーザー）
    SELECT id INTO user1_id FROM profiles ORDER BY created_at LIMIT 1;
    
    IF user1_id IS NOT NULL THEN
        -- プロファイルを更新
        UPDATE profiles SET
            full_name = '田中太郎',
            nickname = 'たなか',
            updated_at = NOW()
        WHERE id = user1_id;
        
        -- 犬のデータを更新または作成
        INSERT INTO dogs (user_id, name, breed, gender, birth_date, weight, color, personality, image_url, created_at, updated_at)
        VALUES (
            user1_id,
            'ポチ',
            '柴犬',
            'オス',
            '2022-03-15',
            8.5,
            '茶色',
            '元気で人懐っこい',
            'https://example.com/dog1.jpg',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            name = EXCLUDED.name,
            breed = EXCLUDED.breed,
            gender = EXCLUDED.gender,
            birth_date = EXCLUDED.birth_date,
            weight = EXCLUDED.weight,
            color = EXCLUDED.color,
            personality = EXCLUDED.personality,
            updated_at = NOW();
            
        RAISE NOTICE 'User 1 (田中太郎) and dog (ポチ) updated/created with ID: %', user1_id;
    END IF;
END $$;

-- ユーザー2: 佐藤さんとその犬
DO $$
DECLARE
    user2_id UUID;
    dog2_id UUID;
BEGIN
    -- 2番目のユーザーIDを取得
    SELECT id INTO user2_id FROM profiles ORDER BY created_at LIMIT 1 OFFSET 1;
    
    IF user2_id IS NOT NULL THEN
        -- プロファイルを更新
        UPDATE profiles SET
            full_name = '佐藤花子',
            nickname = 'さとう',
            updated_at = NOW()
        WHERE id = user2_id;
        
        -- 犬のデータを更新または作成
        INSERT INTO dogs (user_id, name, breed, gender, birth_date, weight, color, personality, image_url, created_at, updated_at)
        VALUES (
            user2_id,
            'ココ',
            'トイプードル',
            'メス',
            '2023-01-20',
            3.2,
            '白',
            '甘えん坊で賢い',
            'https://example.com/dog2.jpg',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            name = EXCLUDED.name,
            breed = EXCLUDED.breed,
            gender = EXCLUDED.gender,
            birth_date = EXCLUDED.birth_date,
            weight = EXCLUDED.weight,
            color = EXCLUDED.color,
            personality = EXCLUDED.personality,
            updated_at = NOW();
            
        RAISE NOTICE 'User 2 (佐藤花子) and dog (ココ) updated/created with ID: %', user2_id;
    END IF;
END $$;

-- ユーザー3: 山田さんとその犬
DO $$
DECLARE
    user3_id UUID;
    dog3_id UUID;
BEGIN
    -- 3番目のユーザーIDを取得
    SELECT id INTO user3_id FROM profiles ORDER BY created_at LIMIT 1 OFFSET 2;
    
    IF user3_id IS NOT NULL THEN
        -- プロファイルを更新
        UPDATE profiles SET
            full_name = '山田次郎',
            nickname = 'やまだ',
            updated_at = NOW()
        WHERE id = user3_id;
        
        -- 犬のデータを更新または作成
        INSERT INTO dogs (user_id, name, breed, gender, birth_date, weight, color, personality, image_url, created_at, updated_at)
        VALUES (
            user3_id,
            'チョコ',
            'ゴールデンレトリバー',
            'オス',
            '2021-08-10',
            28.5,
            'ゴールド',
            '優しくて大人しい',
            'https://example.com/dog3.jpg',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            name = EXCLUDED.name,
            breed = EXCLUDED.breed,
            gender = EXCLUDED.gender,
            birth_date = EXCLUDED.birth_date,
            weight = EXCLUDED.weight,
            color = EXCLUDED.color,
            personality = EXCLUDED.personality,
            updated_at = NOW();
            
        RAISE NOTICE 'User 3 (山田次郎) and dog (チョコ) updated/created with ID: %', user3_id;
    END IF;
END $$;

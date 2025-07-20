-- 管理者アカウント用の実際のテストデータを作成
-- capasjapan@gmail.com の管理者で友達一覧と最近の出会いを確認
-- 1. まず現在の管理者アカウントのIDを確認
SELECT id,
    email,
    name,
    user_type
FROM profiles
WHERE email = 'capasjapan@gmail.com';
-- 2. 他のテストユーザーを作成（友達になるユーザー）
-- 注意: auth.usersテーブルには実際のユーザーが必要ですが、profilesテーブルにダミーデータを作成
INSERT INTO profiles (id, email, name, user_type, created_at)
VALUES -- UUID生成は実際のauth.usersのIDを使用する必要がありますが、テスト用にランダムUUIDを使用
    (
        '550e8400-e29b-41d4-a716-446655440001',
        'tanaka@example.com',
        '田中太郎',
        'user',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440002',
        'sato@example.com',
        '佐藤花子',
        'user',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440003',
        'yamada@example.com',
        '山田次郎',
        'user',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440004',
        'suzuki@example.com',
        '鈴木美咲',
        'user',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440005',
        'takahashi@example.com',
        '高橋健太',
        'user',
        NOW()
    ) ON CONFLICT (id) DO
UPDATE
SET name = EXCLUDED.name,
    updated_at = NOW();
-- 3. 各ユーザーの犬を作成
INSERT INTO dogs (
        owner_id,
        name,
        breed,
        age,
        weight,
        gender,
        personality,
        photo_url,
        created_at
    )
VALUES (
        '550e8400-e29b-41d4-a716-446655440001',
        'ポチ',
        '柴犬',
        3,
        12.5,
        'male',
        '人懐っこい性格で、散歩が大好きです',
        'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440002',
        'ハナ',
        'トイプードル',
        2,
        3.2,
        'female',
        '元気いっぱいで遊ぶのが大好き',
        'https://images.unsplash.com/photo-1616190260687-b8ebf74aa3df?w=400',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440003',
        'チョコ',
        'ゴールデンレトリバー',
        5,
        28.0,
        'male',
        '温厚で子供が大好きな優しい性格',
        'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440004',
        'さくら',
        'コーギー',
        1,
        10.8,
        'female',
        '活発でフリスビーが得意',
        'https://images.unsplash.com/photo-1546975490-e8b92a360b24?w=400',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440005',
        'レオン',
        'フレンチブルドッグ',
        4,
        11.2,
        'male',
        'マイペースで寝るのが好き',
        'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400',
        NOW()
    ) ON CONFLICT (owner_id) DO
UPDATE
SET name = EXCLUDED.name,
    breed = EXCLUDED.breed,
    updated_at = NOW();
-- 4. 管理者アカウントのIDを取得して友達リクエストを作成
DO $$
DECLARE admin_id UUID;
BEGIN -- 管理者アカウントのIDを取得
SELECT id INTO admin_id
FROM profiles
WHERE email = 'capasjapan@gmail.com';
IF admin_id IS NOT NULL THEN -- 友達リクエスト: 田中さんから管理者へ
INSERT INTO friend_requests (sender_id, receiver_id, status, created_at)
VALUES (
        '550e8400-e29b-41d4-a716-446655440001',
        admin_id,
        'pending',
        NOW() - INTERVAL '2 hours'
    ) ON CONFLICT (sender_id, receiver_id) DO
UPDATE
SET status = EXCLUDED.status,
    updated_at = NOW();
-- 友達リクエスト: 管理者から佐藤さんへ（承認済み）
INSERT INTO friend_requests (
        sender_id,
        receiver_id,
        status,
        created_at,
        updated_at
    )
VALUES (
        admin_id,
        '550e8400-e29b-41d4-a716-446655440002',
        'accepted',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '12 hours'
    ) ON CONFLICT (sender_id, receiver_id) DO
UPDATE
SET status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;
-- 友達リクエスト: 管理者から山田さんへ（承認済み）
INSERT INTO friend_requests (
        sender_id,
        receiver_id,
        status,
        created_at,
        updated_at
    )
VALUES (
        admin_id,
        '550e8400-e29b-41d4-a716-446655440003',
        'accepted',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '2 days'
    ) ON CONFLICT (sender_id, receiver_id) DO
UPDATE
SET status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;
-- 友達関係を作成（双方向）
INSERT INTO friendships (user_id, friend_id, created_at)
VALUES (
        admin_id,
        '550e8400-e29b-41d4-a716-446655440002',
        NOW() - INTERVAL '12 hours'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440002',
        admin_id,
        NOW() - INTERVAL '12 hours'
    ),
    (
        admin_id,
        '550e8400-e29b-41d4-a716-446655440003',
        NOW() - INTERVAL '2 days'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440003',
        admin_id,
        NOW() - INTERVAL '2 days'
    ) ON CONFLICT (user_id, friend_id) DO NOTHING;
RAISE NOTICE '管理者アカウント % の友達関係を作成しました',
admin_id;
ELSE RAISE NOTICE '管理者アカウントが見つかりません';
END IF;
END $$;
-- 管理者アカウント用の追加データ: メッセージ、通知、出会い記録
-- 5. メッセージデータを作成
DO $$
DECLARE admin_id UUID;
BEGIN -- 管理者アカウントのIDを取得
SELECT id INTO admin_id
FROM profiles
WHERE email = 'capasjapan@gmail.com';
IF admin_id IS NOT NULL THEN -- メッセージ: 佐藤さんから管理者へ
INSERT INTO messages (
        sender_id,
        receiver_id,
        content,
        created_at,
        read
    )
VALUES (
        '550e8400-e29b-41d4-a716-446655440002',
        admin_id,
        'こんにちは！今度一緒にドッグランに行きませんか？',
        NOW() - INTERVAL '2 hours',
        false
    ),
    (
        admin_id,
        '550e8400-e29b-41d4-a716-446655440002',
        'いいですね！今度の週末はいかがですか？',
        NOW() - INTERVAL '1 hour',
        true
    ),
    (
        '550e8400-e29b-41d4-a716-446655440002',
        admin_id,
        '週末いいですね！土曜日の午前中はどうでしょう？',
        NOW() - INTERVAL '30 minutes',
        false
    ),
    -- メッセージ: 山田さんとのやり取り
    (
        '550e8400-e29b-41d4-a716-446655440003',
        admin_id,
        'チョコがとても元気です！また一緒に遊ばせましょう',
        NOW() - INTERVAL '1 day',
        false
    ),
    (
        admin_id,
        '550e8400-e29b-41d4-a716-446655440003',
        'ぜひお願いします！チョコちゃんは優しい子ですね',
        NOW() - INTERVAL '20 hours',
        true
    ) ON CONFLICT (sender_id, receiver_id, created_at) DO NOTHING;
-- 6. 通知データを作成
INSERT INTO notifications (
        user_id,
        type,
        title,
        content,
        is_read,
        created_at
    )
VALUES (
        admin_id,
        'friend_request',
        '新しいフレンドリクエスト',
        '田中太郎さんからフレンドリクエストが届きました',
        false,
        NOW() - INTERVAL '2 hours'
    ),
    (
        admin_id,
        'message',
        '新しいメッセージ',
        '佐藤花子さんからメッセージが届きました',
        false,
        NOW() - INTERVAL '30 minutes'
    ),
    (
        admin_id,
        'message',
        '新しいメッセージ',
        '山田次郎さんからメッセージが届きました',
        false,
        NOW() - INTERVAL '1 day'
    ),
    (
        admin_id,
        'friend_accepted',
        'フレンドリクエスト承認',
        '佐藤花子さんがフレンドリクエストを承認しました',
        true,
        NOW() - INTERVAL '12 hours'
    ),
    (
        admin_id,
        'encounter',
        '新しい出会い',
        'あなたの犬が新しい友達と出会いました',
        true,
        NOW() - INTERVAL '6 hours'
    ) ON CONFLICT (user_id, type, created_at) DO NOTHING;
RAISE NOTICE '管理者アカウント % のメッセージと通知を作成しました',
admin_id;
END IF;
END $$;
-- 7. 犬の出会い記録を作成
DO $$
DECLARE admin_id UUID;
admin_dog_id UUID;
sato_dog_id UUID;
yamada_dog_id UUID;
tanaka_dog_id UUID;
BEGIN -- 管理者アカウントのIDを取得
SELECT id INTO admin_id
FROM profiles
WHERE email = 'capasjapan@gmail.com';
-- 管理者の犬のIDを取得（存在しない場合は作成）
SELECT id INTO admin_dog_id
FROM dogs
WHERE owner_id = admin_id
LIMIT 1;
IF admin_dog_id IS NULL THEN
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
        admin_id,
        'アッシュ',
        '雑種',
        4,
        15.0,
        'male',
        '賢くて人懐っこい性格',
        'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
        NOW()
    )
RETURNING id INTO admin_dog_id;
END IF;
-- 他の犬のIDを取得
SELECT id INTO sato_dog_id
FROM dogs
WHERE owner_id = '550e8400-e29b-41d4-a716-446655440002'
LIMIT 1;
SELECT id INTO yamada_dog_id
FROM dogs
WHERE owner_id = '550e8400-e29b-41d4-a716-446655440003'
LIMIT 1;
SELECT id INTO tanaka_dog_id
FROM dogs
WHERE owner_id = '550e8400-e29b-41d4-a716-446655440001'
LIMIT 1;
IF admin_id IS NOT NULL
AND admin_dog_id IS NOT NULL THEN -- 出会い記録: 管理者の犬と佐藤さんの犬
IF sato_dog_id IS NOT NULL THEN
INSERT INTO encounters (
        user1_id,
        user2_id,
        dog1_id,
        dog2_id,
        location,
        notes,
        created_at
    )
VALUES (
        admin_id,
        '550e8400-e29b-41d4-a716-446655440002',
        admin_dog_id,
        sato_dog_id,
        '中央公園ドッグラン',
        'アッシュとハナちゃんがとても仲良く遊んでいました',
        NOW() - INTERVAL '6 hours'
    ),
    (
        admin_id,
        '550e8400-e29b-41d4-a716-446655440002',
        admin_dog_id,
        sato_dog_id,
        '代々木公園',
        '散歩中に偶然会いました',
        NOW() - INTERVAL '2 days'
    ) ON CONFLICT (user1_id, user2_id, created_at) DO NOTHING;
END IF;
-- 出会い記録: 管理者の犬と山田さんの犬
IF yamada_dog_id IS NOT NULL THEN
INSERT INTO encounters (
        user1_id,
        user2_id,
        dog1_id,
        dog2_id,
        location,
        notes,
        created_at
    )
VALUES (
        admin_id,
        '550e8400-e29b-41d4-a716-446655440003',
        admin_dog_id,
        yamada_dog_id,
        '井の頭公園',
        'チョコちゃんとアッシュが一緒にボール遊びをしました',
        NOW() - INTERVAL '1 day'
    ),
    (
        admin_id,
        '550e8400-e29b-41d4-a716-446655440003',
        admin_dog_id,
        yamada_dog_id,
        '渋谷ドッグラン',
        '初対面でしたが、すぐに仲良くなりました',
        NOW() - INTERVAL '4 days'
    ) ON CONFLICT (user1_id, user2_id, created_at) DO NOTHING;
END IF;
-- 出会い記録: 管理者の犬と田中さんの犬（まだ友達ではないが出会いはある）
IF tanaka_dog_id IS NOT NULL THEN
INSERT INTO encounters (
        user1_id,
        user2_id,
        dog1_id,
        dog2_id,
        location,
        notes,
        created_at
    )
VALUES (
        admin_id,
        '550e8400-e29b-41d4-a716-446655440001',
        admin_dog_id,
        tanaka_dog_id,
        '荒川河川敷',
        'ポチくんとアッシュが朝の散歩で会いました',
        NOW() - INTERVAL '3 hours'
    ) ON CONFLICT (user1_id, user2_id, created_at) DO NOTHING;
END IF;
RAISE NOTICE '管理者アカウント % の出会い記録を作成しました',
admin_id;
END IF;
END $$;
-- 8. データ確認クエリ
SELECT '=== 管理者の友達一覧 ===' as info;
SELECT p.name as friend_name,
    p.email as friend_email,
    fr.status,
    fr.created_at as friend_since
FROM profiles admin
    JOIN friend_requests fr ON (
        admin.id = fr.sender_id
        OR admin.id = fr.receiver_id
    )
    JOIN profiles p ON (
        p.id = CASE
            WHEN admin.id = fr.sender_id THEN fr.receiver_id
            ELSE fr.sender_id
        END
    )
WHERE admin.email = 'capasjapan@gmail.com'
    AND fr.status = 'accepted'
ORDER BY fr.created_at DESC;
SELECT '=== 管理者への友達リクエスト ===' as info;
SELECT p.name as requester_name,
    p.email as requester_email,
    fr.status,
    fr.created_at as requested_at
FROM profiles admin
    JOIN friend_requests fr ON admin.id = fr.receiver_id
    JOIN profiles p ON p.id = fr.sender_id
WHERE admin.email = 'capasjapan@gmail.com'
    AND fr.status = 'pending'
ORDER BY fr.created_at DESC;
SELECT '=== 管理者の最近の出会い ===' as info;
SELECT p.name as met_user,
    d1.name as admin_dog,
    d2.name as other_dog,
    e.location,
    e.notes,
    e.created_at as met_at
FROM profiles admin
    JOIN encounters e ON admin.id = e.user1_id
    OR admin.id = e.user2_id
    JOIN profiles p ON p.id = CASE
        WHEN admin.id = e.user1_id THEN e.user2_id
        ELSE e.user1_id
    END
    LEFT JOIN dogs d1 ON d1.id = CASE
        WHEN admin.id = e.user1_id THEN e.dog1_id
        ELSE e.dog2_id
    END
    LEFT JOIN dogs d2 ON d2.id = CASE
        WHEN admin.id = e.user1_id THEN e.dog2_id
        ELSE e.dog1_id
    END
WHERE admin.email = 'capasjapan@gmail.com'
ORDER BY e.created_at DESC
LIMIT 10;
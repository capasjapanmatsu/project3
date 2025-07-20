-- ステップ7: 友達リクエストと友達関係を作成
-- 管理者アカウントとテストユーザー間の友達関係を構築
DO $$
DECLARE admin_id UUID;
tanaka_id UUID;
sato_id UUID;
yamada_id UUID;
suzuki_id UUID;
BEGIN -- ユーザーIDを取得
SELECT id INTO admin_id
FROM profiles
WHERE email = 'capasjapan@gmail.com';
SELECT id INTO tanaka_id
FROM profiles
WHERE email = 'tanaka.taro@example.com';
SELECT id INTO sato_id
FROM profiles
WHERE email = 'sato.hanako@example.com';
SELECT id INTO yamada_id
FROM profiles
WHERE email = 'yamada.jiro@example.com';
SELECT id INTO suzuki_id
FROM profiles
WHERE email = 'suzuki.misaki@example.com';
-- 友達リクエストの作成
IF admin_id IS NOT NULL THEN -- 1. 田中さんから管理者へのフレンドリクエスト（保留中）
IF tanaka_id IS NOT NULL THEN
INSERT INTO friend_requests (sender_id, receiver_id, status, created_at)
VALUES (
        tanaka_id,
        admin_id,
        'pending',
        NOW() - INTERVAL '3 hours'
    ) ON CONFLICT (sender_id, receiver_id) DO
UPDATE
SET status = EXCLUDED.status,
    updated_at = NOW();
END IF;
-- 2. 管理者から佐藤さんへのフレンドリクエスト（承認済み）
IF sato_id IS NOT NULL THEN
INSERT INTO friend_requests (
        sender_id,
        receiver_id,
        status,
        created_at,
        updated_at
    )
VALUES (
        admin_id,
        sato_id,
        'accepted',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '1 day'
    ) ON CONFLICT (sender_id, receiver_id) DO
UPDATE
SET status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;
-- 友達関係を作成（双方向）
INSERT INTO friendships (user_id, friend_id, created_at)
VALUES (admin_id, sato_id, NOW() - INTERVAL '1 day'),
    (sato_id, admin_id, NOW() - INTERVAL '1 day') ON CONFLICT (user_id, friend_id) DO NOTHING;
END IF;
-- 3. 山田さんから管理者へのフレンドリクエスト（承認済み）
IF yamada_id IS NOT NULL THEN
INSERT INTO friend_requests (
        sender_id,
        receiver_id,
        status,
        created_at,
        updated_at
    )
VALUES (
        yamada_id,
        admin_id,
        'accepted',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '3 days'
    ) ON CONFLICT (sender_id, receiver_id) DO
UPDATE
SET status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;
-- 友達関係を作成（双方向）
INSERT INTO friendships (user_id, friend_id, created_at)
VALUES (admin_id, yamada_id, NOW() - INTERVAL '3 days'),
    (yamada_id, admin_id, NOW() - INTERVAL '3 days') ON CONFLICT (user_id, friend_id) DO NOTHING;
END IF;
-- 4. 鈴木さんから管理者へのフレンドリクエスト（拒否済み）
IF suzuki_id IS NOT NULL THEN
INSERT INTO friend_requests (
        sender_id,
        receiver_id,
        status,
        created_at,
        updated_at
    )
VALUES (
        suzuki_id,
        admin_id,
        'rejected',
        NOW() - INTERVAL '1 week',
        NOW() - INTERVAL '6 days'
    ) ON CONFLICT (sender_id, receiver_id) DO
UPDATE
SET status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;
END IF;
RAISE NOTICE '管理者アカウントの友達関係を作成しました';
ELSE RAISE NOTICE '管理者アカウントが見つかりません';
END IF;
END $$;
-- ステップ8: 友達関係の確認
SELECT '=== 管理者の友達一覧 ===' as info;
SELECT p.name as friend_name,
    p.email as friend_email,
    fr.status,
    fr.created_at as friend_since,
    fr.updated_at as status_updated
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
ORDER BY fr.created_at DESC;
SELECT '=== 保留中のフレンドリクエスト ===' as info;
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
SELECT '=== 友達関係（双方向）===' as info;
SELECT p1.name as user_name,
    p2.name as friend_name,
    f.created_at as friendship_created
FROM friendships f
    JOIN profiles p1 ON f.user_id = p1.id
    JOIN profiles p2 ON f.friend_id = p2.id
WHERE p1.email = 'capasjapan@gmail.com'
    OR p2.email = 'capasjapan@gmail.com'
ORDER BY f.created_at DESC;
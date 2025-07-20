-- ステップ9: メッセージと通知を作成
-- 管理者アカウント用のリアルなメッセージと通知データ
DO $$
DECLARE admin_id UUID;
tanaka_id UUID;
sato_id UUID;
yamada_id UUID;
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
IF admin_id IS NOT NULL THEN -- メッセージの作成
-- 1. 佐藤さんとの会話（友達同士）
IF sato_id IS NOT NULL THEN
INSERT INTO messages (
        sender_id,
        receiver_id,
        content,
        created_at,
        is_read
    )
VALUES (
        sato_id,
        admin_id,
        'こんにちは！今度一緒にドッグランに行きませんか？ハナが他の犬と遊ぶのが大好きなんです🐕',
        NOW() - INTERVAL '4 hours',
        false
    ),
    (
        admin_id,
        sato_id,
        'いいですね！アッシュも他の犬と遊ぶのが好きなので、ぜひお願いします。今度の週末はいかがですか？',
        NOW() - INTERVAL '3 hours',
        true
    ),
    (
        sato_id,
        admin_id,
        '週末いいですね！土曜日の午前中、中央公園のドッグランはどうでしょう？',
        NOW() - INTERVAL '2 hours',
        false
    ),
    (
        admin_id,
        sato_id,
        '中央公園、いいですね！10時頃に入口で待ち合わせしましょうか？',
        NOW() - INTERVAL '1 hour',
        true
    ),
    (
        sato_id,
        admin_id,
        '10時、了解しました！楽しみにしています😊',
        NOW() - INTERVAL '30 minutes',
        false
    ) ON CONFLICT (sender_id, receiver_id, created_at) DO NOTHING;
END IF;
-- 2. 山田さんとの会話（友達同士）
IF yamada_id IS NOT NULL THEN
INSERT INTO messages (
        sender_id,
        receiver_id,
        content,
        created_at,
        is_read
    )
VALUES (
        yamada_id,
        admin_id,
        'チョコがとても元気です！この前はありがとうございました',
        NOW() - INTERVAL '1 day',
        false
    ),
    (
        admin_id,
        yamada_id,
        'こちらこそ！チョコちゃんは本当に優しい子ですね。アッシュもとても楽しそうでした',
        NOW() - INTERVAL '20 hours',
        true
    ),
    (
        yamada_id,
        admin_id,
        'また機会があれば一緒に遊ばせてください🎾',
        NOW() - INTERVAL '18 hours',
        false
    ) ON CONFLICT (sender_id, receiver_id, created_at) DO NOTHING;
END IF;
-- 通知の作成
-- 1. フレンドリクエスト通知
IF tanaka_id IS NOT NULL THEN
INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        is_read,
        created_at
    )
VALUES (
        admin_id,
        'friend_request',
        '新しいフレンドリクエスト',
        '田中太郎さんからフレンドリクエストが届きました',
        false,
        NOW() - INTERVAL '3 hours'
    ) ON CONFLICT (user_id, type, created_at) DO NOTHING;
END IF;
-- 2. メッセージ通知
IF sato_id IS NOT NULL THEN
INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        is_read,
        created_at
    )
VALUES (
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
        '佐藤花子さんからメッセージが届きました',
        false,
        NOW() - INTERVAL '2 hours'
    ) ON CONFLICT (user_id, type, created_at) DO NOTHING;
END IF;
IF yamada_id IS NOT NULL THEN
INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        is_read,
        created_at
    )
VALUES (
        admin_id,
        'message',
        '新しいメッセージ',
        '山田次郎さんからメッセージが届きました',
        false,
        NOW() - INTERVAL '1 day'
    ),
    (
        admin_id,
        'message',
        '新しいメッセージ',
        '山田次郎さんからメッセージが届きました',
        false,
        NOW() - INTERVAL '18 hours'
    ) ON CONFLICT (user_id, type, created_at) DO NOTHING;
END IF;
-- 3. 友達承認通知
IF sato_id IS NOT NULL THEN
INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        is_read,
        created_at
    )
VALUES (
        admin_id,
        'friend_accepted',
        'フレンドリクエスト承認',
        '佐藤花子さんがフレンドリクエストを承認しました',
        true,
        NOW() - INTERVAL '1 day'
    ) ON CONFLICT (user_id, type, created_at) DO NOTHING;
END IF;
IF yamada_id IS NOT NULL THEN
INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        is_read,
        created_at
    )
VALUES (
        admin_id,
        'friend_accepted',
        'フレンドリクエスト承認',
        '山田次郎さんのフレンドリクエストを承認しました',
        true,
        NOW() - INTERVAL '3 days'
    ) ON CONFLICT (user_id, type, created_at) DO NOTHING;
END IF;
-- 4. 出会い通知
INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        is_read,
        created_at
    )
VALUES (
        admin_id,
        'encounter',
        '新しい出会い',
        'あなたの犬が新しい友達と出会いました',
        true,
        NOW() - INTERVAL '6 hours'
    ),
    (
        admin_id,
        'encounter',
        '新しい出会い',
        'アッシュが公園で新しい友達と遊びました',
        true,
        NOW() - INTERVAL '2 days'
    ) ON CONFLICT (user_id, type, created_at) DO NOTHING;
RAISE NOTICE '管理者アカウントのメッセージと通知を作成しました';
END IF;
END $$;
-- ステップ10: メッセージと通知の確認
SELECT '=== 管理者の最新メッセージ ===' as info;
SELECT CASE
        WHEN m.sender_id = admin.id THEN '送信'
        ELSE '受信'
    END as direction,
    p.name as other_user,
    m.content,
    m.is_read,
    m.created_at
FROM profiles admin
    JOIN messages m ON (
        admin.id = m.sender_id
        OR admin.id = m.receiver_id
    )
    JOIN profiles p ON (
        p.id = CASE
            WHEN admin.id = m.sender_id THEN m.receiver_id
            ELSE m.sender_id
        END
    )
WHERE admin.email = 'capasjapan@gmail.com'
ORDER BY m.created_at DESC
LIMIT 10;
SELECT '=== 管理者の通知 ===' as info;
SELECT n.type,
    n.title,
    n.message,
    n.is_read,
    n.created_at
FROM profiles admin
    JOIN notifications n ON admin.id = n.user_id
WHERE admin.email = 'capasjapan@gmail.com'
ORDER BY n.created_at DESC
LIMIT 10;
-- ステップ1: テストユーザーを作成
-- capasjapan@gmail.com の管理者アカウント用の友達データ
-- まず管理者アカウントのIDを確認
SELECT id as admin_id,
    email,
    name,
    user_type,
    created_at
FROM profiles
WHERE email = 'capasjapan@gmail.com';
-- テストユーザーを作成（実際のUUIDを生成）
INSERT INTO profiles (id, email, name, user_type, created_at)
VALUES (
        gen_random_uuid(),
        'tanaka.taro@example.com',
        '田中太郎',
        'user',
        NOW() - INTERVAL '5 days'
    ),
    (
        gen_random_uuid(),
        'sato.hanako@example.com',
        '佐藤花子',
        'user',
        NOW() - INTERVAL '4 days'
    ),
    (
        gen_random_uuid(),
        'yamada.jiro@example.com',
        '山田次郎',
        'user',
        NOW() - INTERVAL '3 days'
    ),
    (
        gen_random_uuid(),
        'suzuki.misaki@example.com',
        '鈴木美咲',
        'user',
        NOW() - INTERVAL '2 days'
    ) ON CONFLICT (email) DO
UPDATE
SET name = EXCLUDED.name,
    updated_at = NOW()
RETURNING id,
    email,
    name;
-- 作成されたユーザーの確認
SELECT id,
    email,
    name,
    user_type,
    created_at
FROM profiles
WHERE email IN (
        'capasjapan@gmail.com',
        'tanaka.taro@example.com',
        'sato.hanako@example.com',
        'yamada.jiro@example.com',
        'suzuki.misaki@example.com'
    )
ORDER BY created_at;
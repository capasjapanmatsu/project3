-- 管理者アカウント用の実際のデータ作成（段階的実行）
-- capasjapan@gmail.com で友達一覧と最近の出会いを確認するため
-- ステップ1: 管理者アカウントの確認
-- まずこのクエリを実行して管理者のIDを確認してください
SELECT id as admin_id,
    email,
    name,
    user_type,
    created_at
FROM profiles
WHERE email = 'capasjapan@gmail.com';
-- ！重要！上記で取得した管理者のUUIDを以下の変数に設定してください
-- 例: a1b2c3d4-e5f6-7890-abcd-ef1234567890
-- ステップ2: テストユーザーを作成
-- 実際のUUIDを生成して挿入（注意: 実際のauth.usersには存在しないため、RLSでエラーが出る可能性があります）
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
-- ステップ3: 作成されたユーザーの確認
SELECT id,
    email,
    name,
    created_at
FROM profiles
WHERE email IN (
        'tanaka.taro@example.com',
        'sato.hanako@example.com',
        'yamada.jiro@example.com',
        'suzuki.misaki@example.com'
    )
ORDER BY created_at DESC;
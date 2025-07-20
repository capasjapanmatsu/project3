-- ステップ2: 管理者と各ユーザーの犬を作成
-- 管理者の犬を作成（存在しない場合）
DO $$
DECLARE admin_id UUID;
existing_dog_count INTEGER;
BEGIN -- 管理者アカウントのIDを取得
SELECT id INTO admin_id
FROM profiles
WHERE email = 'capasjapan@gmail.com';
IF admin_id IS NOT NULL THEN -- 既存の犬がいるかチェック
SELECT COUNT(*) INTO existing_dog_count
FROM dogs
WHERE owner_id = admin_id;
IF existing_dog_count = 0 THEN -- 管理者の犬を作成
INSERT INTO dogs (
        owner_id,
        name,
        breed,
        age,
        weight,
        gender,
        personality,
        created_at
    )
VALUES (
        admin_id,
        'アッシュ',
        'ミックス犬',
        4,
        15.0,
        'オス',
        '賢くて人懐っこい性格です。他の犬とも仲良くできて、散歩が大好きです。',
        NOW() - INTERVAL '1 year'
    );
RAISE NOTICE '管理者の犬「アッシュ」を作成しました';
ELSE RAISE NOTICE '管理者にはすでに % 匹の犬が登録されています',
existing_dog_count;
END IF;
ELSE RAISE NOTICE '管理者アカウントが見つかりません';
END IF;
END $$;
-- テストユーザーの犬データを作成
INSERT INTO dogs (
        owner_id,
        name,
        breed,
        age,
        weight,
        gender,
        personality,
        created_at
    )
SELECT p.id as owner_id,
    CASE
        WHEN p.email = 'tanaka.taro@example.com' THEN 'ポチ'
        WHEN p.email = 'sato.hanako@example.com' THEN 'ハナ'
        WHEN p.email = 'yamada.jiro@example.com' THEN 'チョコ'
        WHEN p.email = 'suzuki.misaki@example.com' THEN 'さくら'
    END as name,
    CASE
        WHEN p.email = 'tanaka.taro@example.com' THEN '柴犬'
        WHEN p.email = 'sato.hanako@example.com' THEN 'トイプードル'
        WHEN p.email = 'yamada.jiro@example.com' THEN 'ゴールデンレトリバー'
        WHEN p.email = 'suzuki.misaki@example.com' THEN 'コーギー'
    END as breed,
    CASE
        WHEN p.email = 'tanaka.taro@example.com' THEN 3
        WHEN p.email = 'sato.hanako@example.com' THEN 2
        WHEN p.email = 'yamada.jiro@example.com' THEN 5
        WHEN p.email = 'suzuki.misaki@example.com' THEN 1
    END as age,
    CASE
        WHEN p.email = 'tanaka.taro@example.com' THEN 12.5
        WHEN p.email = 'sato.hanako@example.com' THEN 3.2
        WHEN p.email = 'yamada.jiro@example.com' THEN 28.0
        WHEN p.email = 'suzuki.misaki@example.com' THEN 10.8
    END as weight,
    CASE
        WHEN p.email = 'tanaka.taro@example.com' THEN 'オス'
        WHEN p.email = 'sato.hanako@example.com' THEN 'メス'
        WHEN p.email = 'yamada.jiro@example.com' THEN 'オス'
        WHEN p.email = 'suzuki.misaki@example.com' THEN 'メス'
    END as gender,
    CASE
        WHEN p.email = 'tanaka.taro@example.com' THEN '人懐っこい性格で、散歩が大好きです。元気いっぱいで他の犬とも仲良く遊べます。'
        WHEN p.email = 'sato.hanako@example.com' THEN 'とても活発で遊ぶのが大好き。賢くて芸を覚えるのも早いです。'
        WHEN p.email = 'yamada.jiro@example.com' THEN '温厚で子供が大好きな優しい性格。大型犬ですが とても穏やかです。'
        WHEN p.email = 'suzuki.misaki@example.com' THEN '活発でフリスビーが得意。運動能力が高く、アジリティも得意です。'
    END as personality,
    NOW() - INTERVAL '6 months' as created_at
FROM profiles p
WHERE p.email IN (
        'tanaka.taro@example.com',
        'sato.hanako@example.com',
        'yamada.jiro@example.com',
        'suzuki.misaki@example.com'
    ) ON CONFLICT (owner_id) DO
UPDATE
SET name = EXCLUDED.name,
    breed = EXCLUDED.breed,
    updated_at = NOW();
-- 作成されたデータの確認
SELECT p.name as owner_name,
    p.email as owner_email,
    d.name as dog_name,
    d.breed,
    d.age,
    d.gender,
    d.personality,
    d.created_at
FROM profiles p
    LEFT JOIN dogs d ON p.id = d.owner_id
WHERE p.email IN (
        'capasjapan@gmail.com',
        'tanaka.taro@example.com',
        'sato.hanako@example.com',
        'yamada.jiro@example.com',
        'suzuki.misaki@example.com'
    )
ORDER BY p.created_at;
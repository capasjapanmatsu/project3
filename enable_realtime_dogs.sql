-- dogsテーブルとnews_announcementsテーブルのリアルタイム機能を有効化

-- 1. リアルタイム機能の有効化
ALTER TABLE dogs REPLICA IDENTITY FULL;
ALTER TABLE news_announcements REPLICA IDENTITY FULL;

-- 2. リアルタイム購読への追加（既に存在する場合はエラーを無視）
DO $$
BEGIN
    -- dogsテーブルをリアルタイム購読に追加
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE dogs;
    EXCEPTION 
        WHEN duplicate_object THEN 
            RAISE NOTICE 'dogs table is already in supabase_realtime publication';
    END;
    
    -- news_announcementsテーブルをリアルタイム購読に追加
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE news_announcements;
    EXCEPTION 
        WHEN duplicate_object THEN 
            RAISE NOTICE 'news_announcements table is already in supabase_realtime publication';
    END;
END $$;

-- 3. RLSポリシーの設定（読み取り権限を全員に付与）
DROP POLICY IF EXISTS "Dogs are viewable by everyone" ON dogs;
CREATE POLICY "Dogs are viewable by everyone" ON dogs FOR SELECT USING (true);

DROP POLICY IF EXISTS "News are viewable by everyone" ON news_announcements;
CREATE POLICY "News are viewable by everyone" ON news_announcements FOR SELECT USING (true);

-- 4. テスト用データの挿入
-- 既存のprofileからowner_idを取得してテスト用の犬を追加
INSERT INTO dogs (id, name, breed, birth_date, gender, image_url, owner_id, created_at)
SELECT 
    gen_random_uuid(),
    'テスト太郎',
    'チワワ',
    '2020-05-15',
    'male',
    'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
    p.id,
    NOW()
FROM profiles p 
WHERE p.id IS NOT NULL 
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- テスト用ニュースの追加
INSERT INTO news_announcements (id, title, content, created_at)
VALUES 
    (gen_random_uuid(), '🎉 リアルタイム機能テスト', 'リアルタイム機能が正常に動作しているかのテストです。', NOW()),
    (gen_random_uuid(), '📢 新機能のお知らせ', 'ドッグパークJPに新しい機能が追加されました！', NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

-- 5. 確認クエリ
SELECT 'Dogs count: ' || count(*) as status FROM dogs;
SELECT 'News count: ' || count(*) as status FROM news_announcements;

-- 6. リアルタイム購読の確認
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('dogs', 'news_announcements');

-- 7. テスト用の新しいワンちゃんを追加する関数
CREATE OR REPLACE FUNCTION insert_test_dog()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    random_owner_id uuid;
    dog_names text[] := ARRAY['ポチ', 'タロウ', 'ハナ', 'モモ', 'ココ', 'ルル', 'ミミ'];
    dog_breeds text[] := ARRAY['柴犬', 'トイプードル', 'チワワ', 'ダックスフンド', 'ゴールデンレトリバー'];
    dog_genders text[] := ARRAY['male', 'female'];
BEGIN
    -- ランダムなowner_idを取得
    SELECT id INTO random_owner_id FROM profiles ORDER BY RANDOM() LIMIT 1;
    
    IF random_owner_id IS NOT NULL THEN
        INSERT INTO dogs (id, name, breed, birth_date, gender, image_url, owner_id, created_at)
        VALUES (
            gen_random_uuid(),
            dog_names[1 + floor(random() * array_length(dog_names, 1))::int],
            dog_breeds[1 + floor(random() * array_length(dog_breeds, 1))::int],
            CURRENT_DATE - (random() * 2000)::int,
            dog_genders[1 + floor(random() * array_length(dog_genders, 1))::int],
            'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
            random_owner_id,
            NOW()
        );
        RAISE NOTICE 'テスト用ワンちゃんを追加しました';
    ELSE
        RAISE NOTICE 'profilesテーブルにデータがありません';
    END IF;
END;
$$;

-- 8. テスト用のニュースを追加する関数
CREATE OR REPLACE FUNCTION insert_test_news()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    news_titles text[] := ARRAY['🎉 新しい仲間が増えました', '📢 メンテナンスのお知らせ', '🌟 キャンペーン開始', '📝 利用規約更新'];
    news_contents text[] := ARRAY['新しいワンちゃんが仲間入りしました！', 'システムメンテナンスを実施します。', 'お得なキャンペーンを開始しました。', '利用規約を更新いたしました。'];
BEGIN
    INSERT INTO news_announcements (id, title, content, created_at)
    VALUES (
        gen_random_uuid(),
        news_titles[1 + floor(random() * array_length(news_titles, 1))::int],
        news_contents[1 + floor(random() * array_length(news_contents, 1))::int],
        NOW()
    );
    RAISE NOTICE 'テスト用ニュースを追加しました';
END;
$$;

-- テスト実行の例:
-- SELECT insert_test_dog();
-- SELECT insert_test_news(); 
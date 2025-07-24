-- Supabaseリアルタイム機能の有効化
-- このスクリプトはSupabase DashboardのSQL Editorで実行してください

-- 1. dogsテーブルのリアルタイム機能を有効化
ALTER TABLE dogs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE dogs;

-- 2. news_announcementsテーブルのリアルタイム機能を有効化
ALTER TABLE news_announcements REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE news_announcements;

-- 3. dogsテーブルの読み取り権限を匿名ユーザーにも付与（パブリック表示用）
CREATE POLICY "Dogs are viewable by everyone" ON dogs
FOR SELECT USING (true);

-- 4. news_announcementsテーブルの読み取り権限を匿名ユーザーにも付与
CREATE POLICY "News are viewable by everyone" ON news_announcements
FOR SELECT USING (true);

-- 5. リアルタイム機能のテスト用データ挿入関数
CREATE OR REPLACE FUNCTION insert_test_dog()
RETURNS void AS $$
BEGIN
  INSERT INTO dogs (
    owner_id, 
    name, 
    breed, 
    birth_date, 
    gender, 
    image_url
  ) VALUES (
    'test-owner-' || extract(epoch from now())::text,
    'テスト犬' || floor(random() * 1000)::text,
    CASE floor(random() * 5)::int
      WHEN 0 THEN '柴犬'
      WHEN 1 THEN 'トイプードル'
      WHEN 2 THEN 'チワワ'
      WHEN 3 THEN 'ゴールデンレトリバー'
      ELSE 'ミックス'
    END,
    (now() - interval '1 year' * random() * 3)::date,
    CASE floor(random() * 2)::int
      WHEN 0 THEN 'オス'
      ELSE 'メス'
    END,
    ''
  );
END;
$$ LANGUAGE plpgsql;

-- 6. テスト用ニュース挿入関数
CREATE OR REPLACE FUNCTION insert_test_news()
RETURNS void AS $$
BEGIN
  INSERT INTO news_announcements (
    title,
    content,
    category,
    is_important
  ) VALUES (
    'テストニュース ' || extract(epoch from now())::text,
    'これはリアルタイム機能のテスト用ニュースです。',
    'news',
    random() > 0.7
  );
END;
$$ LANGUAGE plpgsql;

-- 使用例:
-- SELECT insert_test_dog(); -- 新しいワンちゃんを追加
-- SELECT insert_test_news(); -- 新しいニュースを追加

-- 注意: 本番環境では以下のコマンドでリアルタイム機能を確認してください
-- Supabase Dashboard > Settings > API > Realtime が有効になっていることを確認
-- または以下のクエリで確認:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'; 
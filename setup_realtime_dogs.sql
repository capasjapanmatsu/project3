-- dogsテーブルのリアルタイム機能を有効化し、サンプルデータを挿入

-- 1. リアルタイム機能の有効化
ALTER TABLE dogs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE dogs;

-- 2. news_announcementsテーブルのリアルタイム機能も有効化
ALTER TABLE news_announcements REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE news_announcements;

-- 3. dogsテーブルの読み取り権限を匿名ユーザーにも付与
DROP POLICY IF EXISTS "Dogs are viewable by everyone" ON dogs;
CREATE POLICY "Dogs are viewable by everyone" ON dogs
FOR SELECT USING (true);

-- 4. news_announcementsテーブルの読み取り権限を匿名ユーザーにも付与
DROP POLICY IF EXISTS "News are viewable by everyone" ON news_announcements;
CREATE POLICY "News are viewable by everyone" ON news_announcements
FOR SELECT USING (true);

-- 5. サンプルワンちゃんデータの挿入
INSERT INTO dogs (
  owner_id, 
  name, 
  breed, 
  birth_date, 
  gender, 
  image_url,
  created_at
) VALUES 
  ('owner-1', 'ポチ', '柴犬', '2020-01-01', 'オス', '', '2024-01-01T00:00:00Z'),
  ('owner-2', 'ハナ', 'トイプードル', '2021-06-15', 'メス', '', '2024-01-02T00:00:00Z'),
  ('owner-3', 'マロン', 'ゴールデンレトリバー', '2019-09-20', 'オス', '', '2024-01-03T00:00:00Z'),
  ('owner-4', 'ココ', 'チワワ', '2022-03-10', 'メス', '', '2024-01-04T00:00:00Z'),
  ('owner-5', 'レオ', 'ボーダーコリー', '2020-08-15', 'オス', '', '2024-01-05T00:00:00Z'),
  ('owner-6', 'ミミ', 'パグ', '2021-12-01', 'メス', '', '2024-01-06T00:00:00Z'),
  ('owner-7', 'タロウ', '秋田犬', '2019-05-10', 'オス', '', '2024-01-07T00:00:00Z'),
  ('owner-8', 'サクラ', 'ビーグル', '2022-02-14', 'メス', '', '2024-01-08T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 6. サンプルニュースデータの挿入
INSERT INTO news_announcements (
  title,
  content,
  category,
  is_important,
  created_at
) VALUES 
  ('ドッグパークJPへようこそ！', '愛犬と素敵な時間をお過ごしください。新規登録キャンペーン実施中！', 'announcement', true, '2025-01-15T00:00:00Z'),
  ('新機能：リアルタイム更新', '新しいワンちゃんの登録や重要なお知らせがリアルタイムで更新されるようになりました。', 'news', false, '2025-01-14T00:00:00Z'),
  ('メンテナンスのお知らせ', '1月20日(月) 2:00-4:00にシステムメンテナンスを実施いたします。', 'maintenance', true, '2025-01-13T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 7. リアルタイム機能のテスト用関数
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
    CASE floor(random() * 8)::int
      WHEN 0 THEN '柴犬'
      WHEN 1 THEN 'トイプードル'
      WHEN 2 THEN 'チワワ'
      WHEN 3 THEN 'ゴールデンレトリバー'
      WHEN 4 THEN 'ボーダーコリー'
      WHEN 5 THEN 'パグ'
      WHEN 6 THEN '秋田犬'
      ELSE 'ビーグル'
    END,
    (now() - interval '1 year' * random() * 5)::date,
    CASE floor(random() * 2)::int
      WHEN 0 THEN 'オス'
      ELSE 'メス'
    END,
    ''
  );
  RAISE NOTICE '新しいワンちゃんが登録されました！';
END;
$$ LANGUAGE plpgsql;

-- 8. テスト用ニュース挿入関数
CREATE OR REPLACE FUNCTION insert_test_news()
RETURNS void AS $$
BEGIN
  INSERT INTO news_announcements (
    title,
    content,
    category,
    is_important
  ) VALUES (
    'テストニュース ' || to_char(now(), 'HH24:MI:SS'),
    'これはリアルタイム機能のテスト用ニュースです。投稿時刻: ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    'news',
    random() > 0.7
  );
  RAISE NOTICE '新しいニュースが投稿されました！';
END;
$$ LANGUAGE plpgsql;

-- 9. データ確認
SELECT 'Dogs count: ' || count(*) FROM dogs;
SELECT 'News count: ' || count(*) FROM news_announcements;

-- 使用例:
-- SELECT insert_test_dog(); -- 新しいワンちゃんを追加（リアルタイム更新のテスト）
-- SELECT insert_test_news(); -- 新しいニュースを追加（リアルタイム更新のテスト） 
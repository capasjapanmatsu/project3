-- ログインユーザーでもホームページデータを閲覧できるようにRLS修正
-- 問題: 未ログイン状態では成功、ログイン状態では失敗

-- ステップ1: 現在の問題のあるポリシーを削除して再作成
-- dogsテーブルのポリシー修正
DROP POLICY IF EXISTS "Dogs are viewable by everyone" ON dogs;
CREATE POLICY "Dogs are viewable by everyone" ON dogs 
FOR SELECT 
USING (true); -- 全てのユーザー（匿名・認証済み両方）が閲覧可能

-- news_announcementsテーブルのポリシー修正  
DROP POLICY IF EXISTS "News are viewable by everyone" ON news_announcements;
CREATE POLICY "News are viewable by everyone" ON news_announcements 
FOR SELECT 
USING (true); -- 全てのユーザー（匿名・認証済み両方）が閲覧可能

-- ステップ2: 他の制限的なポリシーがないか確認・削除
-- もし他のポリシーが干渉している場合は削除
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- dogsテーブルの他のSELECTポリシーをチェック
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'dogs' 
        AND cmd = 'SELECT'
        AND policyname != 'Dogs are viewable by everyone'
    LOOP
        RAISE NOTICE 'Found conflicting dogs policy: %', policy_record.policyname;
        EXECUTE format('DROP POLICY IF EXISTS %I ON dogs', policy_record.policyname);
    END LOOP;
    
    -- news_announcementsテーブルの他のSELECTポリシーをチェック
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'news_announcements' 
        AND cmd = 'SELECT'
        AND policyname != 'News are viewable by everyone'
    LOOP
        RAISE NOTICE 'Found conflicting news policy: %', policy_record.policyname;
        EXECUTE format('DROP POLICY IF EXISTS %I ON news_announcements', policy_record.policyname);
    END LOOP;
END $$;

-- ステップ3: 修正結果の確認
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('dogs', 'news_announcements')
AND cmd = 'SELECT'
ORDER BY tablename;

-- ステップ4: テスト用クエリ（匿名ユーザー権限で実行）
SET LOCAL ROLE anon;
SELECT 'Dogs accessible:' as test, COUNT(*) as count FROM dogs LIMIT 1;
SELECT 'News accessible:' as test, COUNT(*) as count FROM news_announcements LIMIT 1;
RESET ROLE;

-- 完了メッセージ
SELECT 'RLS修正完了！ログインユーザーでもデータが表示されるはずです。ブラウザをリロードしてください。' as result; 
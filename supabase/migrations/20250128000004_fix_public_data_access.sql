/*
  # Public Data Access Fix
  
  This migration adds public read access policies for:
  - dogs table (for recent dogs display)
  - news_announcements table (for news section)
  
  These policies allow anonymous users to view public data
  while keeping write operations secure.
*/

-- =============================================================================
-- STEP 1: ADD PUBLIC READ POLICIES FOR DOGS TABLE
-- =============================================================================

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "dogs_public_read" ON public.dogs;

-- 匿名ユーザーでもワンちゃんの情報を閲覧可能にする
CREATE POLICY "dogs_public_read" 
ON public.dogs 
FOR SELECT 
TO public
USING (true);

-- 認証ユーザーが自分のワンちゃんの情報を管理できるポリシーを追加
DROP POLICY IF EXISTS "dogs_owner_manage" ON public.dogs;

CREATE POLICY "dogs_owner_manage"
ON public.dogs
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- =============================================================================
-- STEP 2: ADD PUBLIC READ POLICIES FOR NEWS_ANNOUNCEMENTS TABLE
-- =============================================================================

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "news_public_read" ON public.news_announcements;

-- 匿名ユーザーでもアクティブな新着情報を閲覧可能にする
CREATE POLICY "news_public_read" 
ON public.news_announcements 
FOR SELECT 
TO public
USING (is_active = true OR is_active IS NULL);

-- 管理者が新着情報を管理できるポリシーを追加
DROP POLICY IF EXISTS "news_admin_manage" ON public.news_announcements;

CREATE POLICY "news_admin_manage"
ON public.news_announcements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- =============================================================================
-- STEP 3: ADD SAMPLE DATA IF TABLES ARE EMPTY
-- =============================================================================

-- ワンちゃんのサンプルデータを挿入（テーブルが空の場合のみ）
INSERT INTO public.dogs (name, breed, birth_date, gender, image_url, owner_id)
SELECT 
  'ポチ', 
  'ゴールデンレトリバー', 
  '2023-01-15'::date, 
  'オス', 
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=300&fit=crop',
  '00000000-0000-0000-0000-000000000000'::uuid
WHERE NOT EXISTS (SELECT 1 FROM public.dogs LIMIT 1);

INSERT INTO public.dogs (name, breed, birth_date, gender, image_url, owner_id)
SELECT 
  'ハナ', 
  '柴犬', 
  '2023-03-10'::date, 
  'メス', 
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=300&fit=crop',
  '00000000-0000-0000-0000-000000000000'::uuid
WHERE (SELECT COUNT(*) FROM public.dogs) < 2;

INSERT INTO public.dogs (name, breed, birth_date, gender, image_url, owner_id)
SELECT 
  'チョコ', 
  'ダックスフント', 
  '2023-05-20'::date, 
  'オス', 
  'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&h=300&fit=crop',
  '00000000-0000-0000-0000-000000000000'::uuid
WHERE (SELECT COUNT(*) FROM public.dogs) < 3;

-- 新着情報のサンプルデータを挿入（テーブルが空の場合のみ）
INSERT INTO public.news_announcements (title, content, priority, is_active)
SELECT 
  'ドッグパークJPサービス開始！',
  'ついにドッグパークJPのサービスが開始されました。多くのワンちゃんたちにお会いできることを楽しみにしています。',
  'high',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.news_announcements LIMIT 1);

INSERT INTO public.news_announcements (title, content, priority, is_active)
SELECT 
  '新しいパートナーパーク追加',
  '東京都内に新しいパートナーパークが3カ所追加されました。詳細は各パークのページをご確認ください。',
  'medium',
  true
WHERE (SELECT COUNT(*) FROM public.news_announcements) < 2;

INSERT INTO public.news_announcements (title, content, priority, is_active)
SELECT 
  'メンテナンスのお知らせ',
  '2025年1月20日(月) 02:00-04:00の間、システムメンテナンスを実施いたします。',
  'low',
  true
WHERE (SELECT COUNT(*) FROM public.news_announcements) < 3;

-- =============================================================================
-- STEP 4: VERIFY POLICIES ARE WORKING
-- =============================================================================

-- RLSが有効になっていることを確認
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  relname
FROM pg_tables 
JOIN pg_class ON pg_class.relname = pg_tables.tablename
WHERE schemaname = 'public' 
AND tablename IN ('dogs', 'news_announcements');

-- ポリシーが正しく作成されていることを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('dogs', 'news_announcements')
ORDER BY tablename, policyname;

-- 結果を表示
SELECT 'SUCCESS: Public data access policies have been created and sample data has been inserted.' as result; 
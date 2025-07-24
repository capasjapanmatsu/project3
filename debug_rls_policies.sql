-- RLSポリシーの現状確認と修正
-- ログイン状態での読み込み失敗問題の解決

-- ステップ1: 現在のRLSポリシー確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('dogs', 'news_announcements')
ORDER BY tablename, policyname;

-- ステップ2: テーブルのRLS状態確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('dogs', 'news_announcements');

-- ステップ3: 現在のユーザー情報確認（デバッグ用）
SELECT 
  current_user as current_db_user,
  session_user,
  current_setting('request.jwt.claims', true) as jwt_claims; 
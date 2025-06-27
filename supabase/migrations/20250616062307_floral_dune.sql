/*
  # 認証ログテーブルの作成

  1. 新規テーブル
    - `auth_logs` - 認証関連のログを保存するテーブル
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `action` (text)
      - `ip_address` (text)
      - `user_agent` (text)
      - `created_at` (timestamptz)
  2. セキュリティ
    - RLSポリシーの設定
*/

-- 認証ログテーブル
CREATE TABLE IF NOT EXISTS auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS auth_logs_user_id_idx ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS auth_logs_created_at_idx ON auth_logs(created_at);

-- RLSを有効化
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- ポリシー作成
DO $$
BEGIN
  -- ユーザー自身のログを閲覧できるポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auth_logs' 
    AND policyname = 'Users can view their own auth logs'
  ) THEN
    CREATE POLICY "Users can view their own auth logs"
      ON auth_logs
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  -- 管理者がすべてのログを閲覧できるポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auth_logs' 
    AND policyname = 'Admins can view all auth logs'
  ) THEN
    CREATE POLICY "Admins can view all auth logs"
      ON auth_logs
      FOR SELECT
      TO authenticated
      USING ((SELECT user_type FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
END $$;
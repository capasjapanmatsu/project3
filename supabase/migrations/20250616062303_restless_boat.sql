/*
  # 二要素認証コードテーブルの作成

  1. 新規テーブル
    - `two_factor_codes` - 二要素認証コードを保存するテーブル
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `code` (text)
      - `expires_at` (timestamptz)
      - `attempts` (integer)
      - `created_at` (timestamptz)
  2. セキュリティ
    - RLSポリシーの設定
*/

-- 二要素認証コードテーブル
CREATE TABLE IF NOT EXISTS two_factor_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS two_factor_codes_user_id_idx ON two_factor_codes(user_id);

-- RLSを有効化
ALTER TABLE two_factor_codes ENABLE ROW LEVEL SECURITY;

-- ポリシー作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'two_factor_codes' 
    AND policyname = 'Users can manage their own 2FA codes'
  ) THEN
    CREATE POLICY "Users can manage their own 2FA codes"
      ON two_factor_codes
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
-- 二段階認証コードテーブル
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

-- ポリシー作成（既存のポリシーがある場合はスキップ）
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
END
$$;
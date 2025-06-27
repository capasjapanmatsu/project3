/*
  # Two-factor authentication codes table

  1. New Tables
    - `two_factor_codes` - Stores 2FA verification codes for users
  2. Security
    - Enable RLS on `two_factor_codes` table
    - Add policy for authenticated users to manage their own 2FA codes
*/

-- Check if the table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'two_factor_codes') THEN
    -- 二段階認証コードテーブル
    CREATE TABLE two_factor_codes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      code text NOT NULL,
      expires_at timestamptz NOT NULL,
      attempts integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    -- インデックス作成
    CREATE INDEX two_factor_codes_user_id_idx ON two_factor_codes(user_id);

    -- RLSを有効化
    ALTER TABLE two_factor_codes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Check if the policy already exists before creating it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'two_factor_codes' 
    AND policyname = 'Users can manage their own 2FA codes'
  ) THEN
    -- ポリシー作成
    CREATE POLICY "Users can manage their own 2FA codes"
      ON two_factor_codes
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
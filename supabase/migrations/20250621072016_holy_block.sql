/*
  # オーナー契約同意テーブルの追加

  1. New Tables
    - `owner_agreements` - オーナーの契約同意情報を保存するテーブル
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `agreed_at` (timestamp)
      - `agreement_version` (text)
      - `agreement_type` (text)
  
  2. Security
    - Enable RLS on `owner_agreements` table
    - Add policy for users to view their own agreements
    - Add policy for users to insert their own agreements
*/

-- オーナー契約同意テーブルの作成
CREATE TABLE IF NOT EXISTS owner_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreed_at timestamptz NOT NULL DEFAULT now(),
  agreement_version text NOT NULL,
  agreement_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_owner_agreements_user_id ON owner_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_owner_agreements_agreement_type ON owner_agreements(agreement_type);

-- RLSの有効化
ALTER TABLE owner_agreements ENABLE ROW LEVEL SECURITY;

-- ポリシーの作成
CREATE POLICY "Users can view their own agreements"
  ON owner_agreements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agreements"
  ON owner_agreements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 既存のオーナー検証テーブルにインデックスを追加
CREATE INDEX IF NOT EXISTS idx_owner_verifications_status ON owner_verifications(status);

-- 契約同意確認関数の作成
CREATE OR REPLACE FUNCTION check_owner_agreement(p_user_id uuid, p_agreement_type text)
RETURNS boolean AS $$
DECLARE
  has_agreement boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM owner_agreements
    WHERE user_id = p_user_id
    AND agreement_type = p_agreement_type
  ) INTO has_agreement;
  
  RETURN has_agreement;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 本人確認状態確認関数の作成
CREATE OR REPLACE FUNCTION check_owner_verification(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_verified boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM owner_verifications
    WHERE user_id = p_user_id
    AND status = 'verified'
  ) INTO is_verified;
  
  RETURN is_verified;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- オーナー登録条件確認関数の作成
CREATE OR REPLACE FUNCTION can_register_as_owner(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  has_agreement boolean;
  is_verified boolean;
BEGIN
  -- 契約同意確認
  SELECT check_owner_agreement(p_user_id, 'park_owner') INTO has_agreement;
  
  -- 本人確認状態確認
  SELECT check_owner_verification(p_user_id) INTO is_verified;
  
  -- 両方の条件を満たす場合のみtrueを返す
  RETURN has_agreement AND is_verified;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_register_as_owner IS 'ユーザーがオーナーとして登録可能かどうかを確認する関数';
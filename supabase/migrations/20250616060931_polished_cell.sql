/*
  # Trusted Devices System

  1. New Tables
    - `trusted_devices` - Stores trusted device tokens for users
  2. Functions
    - `cleanup_expired_trusted_devices()` - Removes expired device tokens
    - `verify_trusted_device()` - Validates a device token
  3. Security
    - Enable RLS on trusted_devices table
    - Add policy for users to manage their own devices
*/

-- 信頼済みデバイステーブル
CREATE TABLE IF NOT EXISTS trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  device_info text,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS trusted_devices_user_id_idx ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS trusted_devices_token_idx ON trusted_devices(token);

-- RLSを有効化
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

-- ポリシー作成（既存のポリシーをチェック）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trusted_devices' 
    AND policyname = 'Users can manage their own trusted devices'
  ) THEN
    CREATE POLICY "Users can manage their own trusted devices"
      ON trusted_devices
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 既存の関数を削除してから再作成
DROP FUNCTION IF EXISTS cleanup_expired_trusted_devices();

-- 期限切れのデバイストークンを削除する関数
CREATE OR REPLACE FUNCTION cleanup_expired_trusted_devices()
RETURNS trigger AS $$
BEGIN
  -- 期限切れのトークンを削除
  DELETE FROM trusted_devices
  WHERE expires_at < now();
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成（毎日実行）
DROP TRIGGER IF EXISTS cleanup_expired_trusted_devices_trigger ON trusted_devices;
CREATE TRIGGER cleanup_expired_trusted_devices_trigger
AFTER INSERT ON trusted_devices
EXECUTE FUNCTION cleanup_expired_trusted_devices();

-- 既存の関数を削除してから再作成
DROP FUNCTION IF EXISTS verify_trusted_device(uuid, text);

-- デバイストークンを検証する関数
CREATE OR REPLACE FUNCTION verify_trusted_device(
  p_user_id uuid,
  p_token text
) RETURNS boolean AS $$
DECLARE
  v_device trusted_devices;
BEGIN
  -- トークンを検索
  SELECT * INTO v_device
  FROM trusted_devices
  WHERE user_id = p_user_id
  AND token = p_token
  AND expires_at > now();
  
  -- トークンが見つからない場合
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- 最終使用日時を更新
  UPDATE trusted_devices
  SET last_used_at = now()
  WHERE id = v_device.id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
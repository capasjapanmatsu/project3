/*
  # 信頼済みデバイス機能の修正

  1. 新規テーブル
    - `trusted_devices` - 信頼済みデバイス情報を保存するテーブル
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `token` (text)
      - `device_info` (text)
      - `last_used_at` (timestamptz)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
  2. セキュリティ
    - RLSポリシーの設定
    - 期限切れトークン自動削除機能
  3. 関数
    - デバイストークン検証関数
*/

-- 既存の関数とトリガーを削除（存在する場合）
DROP FUNCTION IF EXISTS cleanup_expired_trusted_devices() CASCADE;
DROP FUNCTION IF EXISTS verify_trusted_device(uuid, text) CASCADE;

-- 既存のテーブルをチェックして存在しない場合のみ作成
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'trusted_devices') THEN
    -- 信頼済みデバイステーブル
    CREATE TABLE trusted_devices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      token text NOT NULL,
      device_info text,
      last_used_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    -- インデックス作成
    CREATE INDEX trusted_devices_user_id_idx ON trusted_devices(user_id);
    CREATE INDEX trusted_devices_token_idx ON trusted_devices(token);

    -- RLSを有効化
    ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

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
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

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

-- トリガーを作成（既存のトリガーをチェック）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'cleanup_expired_trusted_devices_trigger'
  ) THEN
    CREATE TRIGGER cleanup_expired_trusted_devices_trigger
    AFTER INSERT ON trusted_devices
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_expired_trusted_devices();
  END IF;
END $$;

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
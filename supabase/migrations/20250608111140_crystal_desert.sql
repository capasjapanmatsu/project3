/*
  # QR共有システムの追加

  1. 新しいテーブル
    - `qr_shares` - QRコード共有管理テーブル
      - `id` (uuid, primary key)
      - `reservation_id` (uuid, 予約ID)
      - `shared_by_user_id` (uuid, 共有者ID)
      - `shared_to_user_id` (uuid, 共有先ID)
      - `status` (text, 状態: active/expired/revoked)
      - `created_at` (timestamp)
      - `expires_at` (timestamp, 有効期限)

  2. 予約テーブルの更新
    - `reservation_type` カラムを追加（regular/private_booth/whole_facility）

  3. セキュリティ
    - RLSポリシーの設定
    - 適切な外部キー制約

  4. 通知タイプの追加
    - QR共有・取り消し通知
*/

-- 予約テーブルに予約タイプカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'reservation_type'
  ) THEN
    ALTER TABLE reservations ADD COLUMN reservation_type text DEFAULT 'regular';
  END IF;
END $$;

-- 予約タイプの制約を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reservations_reservation_type_check'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_reservation_type_check 
      CHECK (reservation_type = ANY (ARRAY['regular'::text, 'private_booth'::text, 'whole_facility'::text]));
  END IF;
END $$;

-- QR共有テーブルを作成
CREATE TABLE IF NOT EXISTS qr_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL,
  shared_by_user_id uuid NOT NULL,
  shared_to_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- QR共有テーブルの制約を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'qr_shares_status_check'
  ) THEN
    ALTER TABLE qr_shares ADD CONSTRAINT qr_shares_status_check 
      CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text]));
  END IF;
END $$;

-- 外部キー制約を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'qr_shares_reservation_id_fkey'
  ) THEN
    ALTER TABLE qr_shares ADD CONSTRAINT qr_shares_reservation_id_fkey 
      FOREIGN KEY (reservation_id) REFERENCES reservations(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'qr_shares_shared_by_user_id_fkey'
  ) THEN
    ALTER TABLE qr_shares ADD CONSTRAINT qr_shares_shared_by_user_id_fkey 
      FOREIGN KEY (shared_by_user_id) REFERENCES profiles(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'qr_shares_shared_to_user_id_fkey'
  ) THEN
    ALTER TABLE qr_shares ADD CONSTRAINT qr_shares_shared_to_user_id_fkey 
      FOREIGN KEY (shared_to_user_id) REFERENCES profiles(id);
  END IF;
END $$;

-- 同じ予約に対して同じユーザーに複数回共有できないようにする制約
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'qr_shares_unique_active'
  ) THEN
    CREATE UNIQUE INDEX qr_shares_unique_active 
      ON qr_shares (reservation_id, shared_to_user_id) 
      WHERE status = 'active';
  END IF;
END $$;

-- RLSを有効化
ALTER TABLE qr_shares ENABLE ROW LEVEL SECURITY;

-- QR共有のRLSポリシー
DROP POLICY IF EXISTS "QR共有は関係者のみ参照可能" ON qr_shares;
CREATE POLICY "QR共有は関係者のみ参照可能"
  ON qr_shares
  FOR SELECT
  TO authenticated
  USING (shared_by_user_id = auth.uid() OR shared_to_user_id = auth.uid());

DROP POLICY IF EXISTS "QR共有は予約者のみ作成可能" ON qr_shares;
CREATE POLICY "QR共有は予約者のみ作成可能"
  ON qr_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    shared_by_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM reservations 
      WHERE id = reservation_id 
      AND user_id = auth.uid() 
      AND reservation_type = 'whole_facility'
      AND status = 'confirmed'
    )
  );

DROP POLICY IF EXISTS "QR共有は共有者のみ更新可能" ON qr_shares;
CREATE POLICY "QR共有は共有者のみ更新可能"
  ON qr_shares
  FOR UPDATE
  TO authenticated
  USING (shared_by_user_id = auth.uid())
  WITH CHECK (shared_by_user_id = auth.uid());

-- 通知タイプの制約を更新（QR共有関連を追加）
DO $$
BEGIN
  -- 既存の制約を削除
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
  
  -- 新しい制約を追加
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type = ANY (ARRAY[
      'friend_request'::text, 
      'friend_accepted'::text, 
      'friend_at_park'::text, 
      'reservation_reminder'::text, 
      'order_confirmed'::text, 
      'order_shipped'::text, 
      'order_delivered'::text,
      'qr_shared'::text,
      'qr_revoked'::text
    ]));
END $$;

-- QR共有の有効期限を自動で管理する関数
CREATE OR REPLACE FUNCTION expire_qr_shares()
RETURNS void AS $$
BEGIN
  UPDATE qr_shares 
  SET status = 'expired' 
  WHERE status = 'active' 
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- QR共有通知を送信する関数
CREATE OR REPLACE FUNCTION notify_qr_share()
RETURNS TRIGGER AS $$
DECLARE
  reservation_info RECORD;
  shared_by_name text;
BEGIN
  -- 予約情報を取得
  SELECT r.*, dp.name as park_name, p.name as user_name
  INTO reservation_info
  FROM reservations r
  JOIN dog_parks dp ON r.park_id = dp.id
  JOIN profiles p ON r.user_id = p.id
  WHERE r.id = NEW.reservation_id;
  
  -- 共有者の名前を取得
  SELECT name INTO shared_by_name
  FROM profiles
  WHERE id = NEW.shared_by_user_id;
  
  -- 通知を作成
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.shared_to_user_id,
    'qr_shared',
    'QRコードが共有されました',
    shared_by_name || 'さんから' || reservation_info.park_name || 'の入場QRコードが共有されました。',
    jsonb_build_object(
      'qr_share_id', NEW.id,
      'reservation_id', NEW.reservation_id,
      'shared_by_user_id', NEW.shared_by_user_id,
      'park_name', reservation_info.park_name,
      'date', reservation_info.date,
      'start_time', reservation_info.start_time
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- QR共有通知トリガー
DROP TRIGGER IF EXISTS qr_share_notification_trigger ON qr_shares;
CREATE TRIGGER qr_share_notification_trigger
  AFTER INSERT ON qr_shares
  FOR EACH ROW
  EXECUTE FUNCTION notify_qr_share();

-- QR取り消し通知を送信する関数
CREATE OR REPLACE FUNCTION notify_qr_revoke()
RETURNS TRIGGER AS $$
DECLARE
  reservation_info RECORD;
  shared_by_name text;
BEGIN
  -- 状態がrevokedに変更された場合のみ実行
  IF OLD.status != 'revoked' AND NEW.status = 'revoked' THEN
    -- 予約情報を取得
    SELECT r.*, dp.name as park_name
    INTO reservation_info
    FROM reservations r
    JOIN dog_parks dp ON r.park_id = dp.id
    WHERE r.id = NEW.reservation_id;
    
    -- 共有者の名前を取得
    SELECT name INTO shared_by_name
    FROM profiles
    WHERE id = NEW.shared_by_user_id;
    
    -- 通知を作成
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      NEW.shared_to_user_id,
      'qr_revoked',
      'QRコード共有が取り消されました',
      shared_by_name || 'さんが' || reservation_info.park_name || 'の入場QRコードの共有を取り消しました。',
      jsonb_build_object(
        'qr_share_id', NEW.id,
        'reservation_id', NEW.reservation_id,
        'shared_by_user_id', NEW.shared_by_user_id,
        'park_name', reservation_info.park_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- QR取り消し通知トリガー
DROP TRIGGER IF EXISTS qr_revoke_notification_trigger ON qr_shares;
CREATE TRIGGER qr_revoke_notification_trigger
  AFTER UPDATE ON qr_shares
  FOR EACH ROW
  EXECUTE FUNCTION notify_qr_revoke();
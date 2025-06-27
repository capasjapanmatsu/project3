/*
  # QRコード共有機能の追加

  1. 新しいテーブル
    - `qr_shares` - 施設貸し切り予約のQRコード共有情報を管理するテーブル
  
  2. セキュリティ
    - RLSポリシーの設定
    - 共有者と被共有者のみが自分のQRコードを閲覧可能
    - 予約者のみがQRコードを共有可能
  
  3. 自動処理
    - 有効期限切れのQRコードを自動的に期限切れ状態に更新
    - QRコード共有時に通知を送信
    - QRコード取り消し時に通知を送信
  
  4. 関数
    - 共有されたQRコードから入場QRコードを生成する関数
*/

-- QRコード共有テーブルの作成
CREATE TABLE IF NOT EXISTS qr_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- 同じ予約を同じユーザーに複数回共有できないようにする
  CONSTRAINT unique_reservation_share UNIQUE (reservation_id, shared_to_user_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS qr_shares_reservation_id_idx ON qr_shares(reservation_id);
CREATE INDEX IF NOT EXISTS qr_shares_shared_by_user_id_idx ON qr_shares(shared_by_user_id);
CREATE INDEX IF NOT EXISTS qr_shares_shared_to_user_id_idx ON qr_shares(shared_to_user_id);
CREATE INDEX IF NOT EXISTS qr_shares_status_idx ON qr_shares(status);
CREATE INDEX IF NOT EXISTS qr_shares_expires_at_idx ON qr_shares(expires_at);

-- RLSの有効化
ALTER TABLE qr_shares ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの設定（既存のポリシーがある場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'qr_shares' AND policyname = 'QR共有は関係者のみ参照可能'
  ) THEN
    CREATE POLICY "QR共有は関係者のみ参照可能" 
      ON qr_shares 
      FOR SELECT 
      TO authenticated 
      USING ((shared_by_user_id = auth.uid()) OR (shared_to_user_id = auth.uid()));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'qr_shares' AND policyname = 'QR共有は予約者のみ作成可能'
  ) THEN
    CREATE POLICY "QR共有は予約者のみ作成可能" 
      ON qr_shares 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (
        (shared_by_user_id = auth.uid()) AND 
        (EXISTS (
          SELECT 1 FROM reservations 
          WHERE 
            reservations.id = qr_shares.reservation_id AND 
            reservations.user_id = auth.uid() AND 
            reservations.reservation_type = 'whole_facility' AND
            reservations.status = 'confirmed'
        ))
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'qr_shares' AND policyname = 'QR共有は共有者のみ更新可能'
  ) THEN
    CREATE POLICY "QR共有は共有者のみ更新可能" 
      ON qr_shares 
      FOR UPDATE 
      TO authenticated 
      USING (shared_by_user_id = auth.uid()) 
      WITH CHECK (shared_by_user_id = auth.uid());
  END IF;
END
$$;

-- 共有QRコードの有効期限切れを自動的に処理するトリガー関数
CREATE OR REPLACE FUNCTION cleanup_expired_qr_shares()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE qr_shares
  SET status = 'expired'
  WHERE expires_at < now() AND status = 'active';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成（既存のトリガーがある場合は削除してから作成）
DROP TRIGGER IF EXISTS cleanup_expired_qr_shares_trigger ON qr_shares;
CREATE TRIGGER cleanup_expired_qr_shares_trigger
AFTER INSERT ON qr_shares
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_expired_qr_shares();

-- QR共有通知トリガー関数
CREATE OR REPLACE FUNCTION notify_qr_share()
RETURNS TRIGGER AS $$
DECLARE
  park_name TEXT;
  reservation_date DATE;
  start_time TEXT;
  duration INTEGER;
  shared_by_name TEXT;
BEGIN
  -- 予約情報を取得
  SELECT 
    dog_parks.name, 
    reservations.date, 
    reservations.start_time, 
    reservations.duration,
    profiles.name
  INTO 
    park_name, 
    reservation_date, 
    start_time, 
    duration,
    shared_by_name
  FROM 
    reservations
    JOIN dog_parks ON reservations.park_id = dog_parks.id
    JOIN profiles ON NEW.shared_by_user_id = profiles.id
  WHERE 
    reservations.id = NEW.reservation_id;

  -- 通知を作成
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    read
  ) VALUES (
    NEW.shared_to_user_id,
    'qr_shared',
    'QRコードが共有されました',
    park_name || 'の施設貸し切り予約(' || reservation_date || ' ' || start_time || ':00～' || (start_time::integer + duration) || ':00)のQRコードが' || shared_by_name || 'さんから共有されました',
    jsonb_build_object(
      'reservation_id', NEW.reservation_id,
      'shared_by_user_id', NEW.shared_by_user_id,
      'qr_share_id', NEW.id
    ),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- QR共有通知トリガーの作成（既存のトリガーがある場合は削除してから作成）
DROP TRIGGER IF EXISTS qr_share_notification_trigger ON qr_shares;
CREATE TRIGGER qr_share_notification_trigger
AFTER INSERT ON qr_shares
FOR EACH ROW
EXECUTE FUNCTION notify_qr_share();

-- QR共有取り消し通知トリガー関数
CREATE OR REPLACE FUNCTION notify_qr_revoke()
RETURNS TRIGGER AS $$
DECLARE
  park_name TEXT;
  reservation_date DATE;
  shared_by_name TEXT;
BEGIN
  -- 予約情報を取得
  SELECT 
    dog_parks.name, 
    reservations.date,
    profiles.name
  INTO 
    park_name, 
    reservation_date,
    shared_by_name
  FROM 
    reservations
    JOIN dog_parks ON reservations.park_id = dog_parks.id
    JOIN profiles ON NEW.shared_by_user_id = profiles.id
  WHERE 
    reservations.id = NEW.reservation_id;

  -- ステータスが変更された場合のみ通知
  IF OLD.status = 'active' AND NEW.status = 'revoked' THEN
    -- 通知を作成
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      read
    ) VALUES (
      NEW.shared_to_user_id,
      'qr_revoked',
      'QRコードの共有が取り消されました',
      park_name || 'の施設貸し切り予約(' || reservation_date || ')のQRコード共有が' || shared_by_name || 'さんによって取り消されました',
      jsonb_build_object(
        'reservation_id', NEW.reservation_id,
        'shared_by_user_id', NEW.shared_by_user_id
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- QR共有取り消し通知トリガーの作成（既存のトリガーがある場合は削除してから作成）
DROP TRIGGER IF EXISTS qr_revoke_notification_trigger ON qr_shares;
CREATE TRIGGER qr_revoke_notification_trigger
AFTER UPDATE ON qr_shares
FOR EACH ROW
EXECUTE FUNCTION notify_qr_revoke();

-- 共有QRコードから入場QRコードを生成する関数
CREATE OR REPLACE FUNCTION generate_shared_entrance_qr(
  p_user_id UUID,
  p_qr_share_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_qr_share RECORD;
  v_reservation RECORD;
  v_access_code TEXT;
  v_expires_at TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- 共有QRコードの情報を取得
  SELECT * INTO v_qr_share
  FROM qr_shares
  WHERE 
    id = p_qr_share_id AND 
    shared_to_user_id = p_user_id AND
    status = 'active' AND
    expires_at > now();
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'QRコードが見つからないか、有効期限が切れています';
  END IF;
  
  -- 予約情報を取得
  SELECT * INTO v_reservation
  FROM reservations
  WHERE 
    id = v_qr_share.reservation_id AND
    reservation_type = 'whole_facility' AND
    status = 'confirmed' AND
    date >= CURRENT_DATE;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION '予約が見つからないか、無効な予約です';
  END IF;
  
  -- アクセスコードを生成（ランダムな英数字8文字）
  v_access_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  
  -- 有効期限を設定（5分後）
  v_expires_at = NOW() + INTERVAL '5 minutes';
  
  -- 結果を返す
  v_result = jsonb_build_object(
    'access_code', v_access_code,
    'expires_at', v_expires_at,
    'reservation_id', v_reservation.id,
    'park_id', v_reservation.park_id,
    'is_shared', true,
    'shared_by', v_qr_share.shared_by_user_id,
    'qr_share_id', v_qr_share.id
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- アクティブな共有QRコードのみを表示するためのユニークインデックス
DROP INDEX IF EXISTS qr_shares_unique_active;
CREATE UNIQUE INDEX qr_shares_unique_active
ON qr_shares(reservation_id, shared_to_user_id)
WHERE (status = 'active');
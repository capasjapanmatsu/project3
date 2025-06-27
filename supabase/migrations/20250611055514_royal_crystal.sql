-- QRコード共有システムの構築
-- 既存のオブジェクトをチェックして重複を避ける

-- QRコード共有テーブルを作成
CREATE TABLE IF NOT EXISTS qr_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  shared_by_user_id uuid NOT NULL REFERENCES profiles(id),
  shared_to_user_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- 同じ予約に対して同じユーザーへの共有は1つまで（アクティブな状態で）
CREATE UNIQUE INDEX IF NOT EXISTS qr_shares_unique_active 
ON qr_shares(reservation_id, shared_to_user_id) 
WHERE status = 'active';

-- RLS有効化
ALTER TABLE qr_shares ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（既存チェック付き）
DO $$
BEGIN
  -- QR共有作成ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'qr_shares' 
    AND policyname = 'QR共有は予約者のみ作成可能'
  ) THEN
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
  END IF;

  -- QR共有更新ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'qr_shares' 
    AND policyname = 'QR共有は共有者のみ更新可能'
  ) THEN
    CREATE POLICY "QR共有は共有者のみ更新可能"
      ON qr_shares
      FOR UPDATE
      TO authenticated
      USING (shared_by_user_id = auth.uid())
      WITH CHECK (shared_by_user_id = auth.uid());
  END IF;

  -- QR共有参照ポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'qr_shares' 
    AND policyname = 'QR共有は関係者のみ参照可能'
  ) THEN
    CREATE POLICY "QR共有は関係者のみ参照可能"
      ON qr_shares
      FOR SELECT
      TO authenticated
      USING (shared_by_user_id = auth.uid() OR shared_to_user_id = auth.uid());
  END IF;
END $$;

-- QRコード共有機能
CREATE OR REPLACE FUNCTION share_qr_code(
  reservation_id_param uuid,
  friend_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reservation_record RECORD;
  friendship_exists boolean := false;
  share_id uuid;
  result jsonb;
BEGIN
  -- 予約情報を確認
  SELECT * INTO reservation_record
  FROM reservations
  WHERE id = reservation_id_param
    AND user_id = auth.uid()
    AND reservation_type = 'whole_facility'
    AND status = 'confirmed';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '施設貸し切り予約が見つからないか、権限がありません'
    );
  END IF;
  
  -- 友達関係を確認
  SELECT EXISTS(
    SELECT 1 FROM friendships
    WHERE (user1_id = auth.uid() AND user2_id = friend_user_id)
       OR (user1_id = friend_user_id AND user2_id = auth.uid())
  ) INTO friendship_exists;
  
  IF NOT friendship_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '友達関係が確認できません'
    );
  END IF;
  
  -- 既存の共有を確認（アクティブなもの）
  IF EXISTS (
    SELECT 1 FROM qr_shares
    WHERE reservation_id = reservation_id_param
      AND shared_to_user_id = friend_user_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'この友達には既にQRコードを共有済みです'
    );
  END IF;
  
  -- QRコード共有を作成
  INSERT INTO qr_shares (
    reservation_id,
    shared_by_user_id,
    shared_to_user_id,
    expires_at
  ) VALUES (
    reservation_id_param,
    auth.uid(),
    friend_user_id,
    (reservation_record.date + interval '1 day')::timestamptz -- 予約日の翌日まで有効
  ) RETURNING id INTO share_id;
  
  -- 通知を送信
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    friend_user_id,
    'qr_shared',
    'QRコードが共有されました',
    'ドッグランの入場QRコードが共有されました。一緒に楽しみましょう！',
    jsonb_build_object(
      'reservation_id', reservation_id_param,
      'share_id', share_id,
      'shared_by', auth.uid()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'share_id', share_id,
    'message', 'QRコードを共有しました'
  );
END;
$$;

-- QRコード共有取り消し機能
CREATE OR REPLACE FUNCTION revoke_qr_share(share_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  share_record RECORD;
BEGIN
  -- 共有情報を取得
  SELECT * INTO share_record
  FROM qr_shares
  WHERE id = share_id_param
    AND shared_by_user_id = auth.uid()
    AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '共有が見つからないか、権限がありません'
    );
  END IF;
  
  -- 共有を取り消し
  UPDATE qr_shares
  SET status = 'revoked'
  WHERE id = share_id_param;
  
  -- 取り消し通知を送信
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    share_record.shared_to_user_id,
    'qr_revoked',
    'QRコード共有が取り消されました',
    'ドッグランの入場QRコード共有が取り消されました。',
    jsonb_build_object(
      'reservation_id', share_record.reservation_id,
      'share_id', share_id_param,
      'revoked_by', auth.uid()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'QRコード共有を取り消しました'
  );
END;
$$;

-- 共有されたQRコードの取得機能
CREATE OR REPLACE FUNCTION get_shared_qr_codes(user_id_param uuid DEFAULT auth.uid())
RETURNS TABLE (
  share_id uuid,
  reservation_id uuid,
  shared_by_name text,
  park_name text,
  park_address text,
  reservation_date date,
  start_time time,
  duration integer,
  access_code text,
  status text,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qs.id as share_id,
    r.id as reservation_id,
    p.name as shared_by_name,
    dp.name as park_name,
    dp.address as park_address,
    r.date as reservation_date,
    r.start_time,
    r.duration,
    r.access_code,
    qs.status,
    qs.expires_at,
    qs.created_at
  FROM qr_shares qs
  JOIN reservations r ON qs.reservation_id = r.id
  JOIN profiles p ON qs.shared_by_user_id = p.id
  JOIN dog_parks dp ON r.park_id = dp.id
  WHERE qs.shared_to_user_id = user_id_param
    AND qs.status = 'active'
    AND qs.expires_at > now()
  ORDER BY qs.created_at DESC;
END;
$$;

-- 自分が共有したQRコードの取得機能
CREATE OR REPLACE FUNCTION get_my_qr_shares(user_id_param uuid DEFAULT auth.uid())
RETURNS TABLE (
  share_id uuid,
  reservation_id uuid,
  shared_to_name text,
  park_name text,
  reservation_date date,
  start_time time,
  duration integer,
  status text,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qs.id as share_id,
    r.id as reservation_id,
    p.name as shared_to_name,
    dp.name as park_name,
    r.date as reservation_date,
    r.start_time,
    r.duration,
    qs.status,
    qs.expires_at,
    qs.created_at
  FROM qr_shares qs
  JOIN reservations r ON qs.reservation_id = r.id
  JOIN profiles p ON qs.shared_to_user_id = p.id
  JOIN dog_parks dp ON r.park_id = dp.id
  WHERE qs.shared_by_user_id = user_id_param
  ORDER BY qs.created_at DESC;
END;
$$;

-- 期限切れQRコード共有の自動無効化
CREATE OR REPLACE FUNCTION expire_old_qr_shares()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE qr_shares
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  IF expired_count > 0 THEN
    RAISE NOTICE '期限切れQRコード共有 % 件を無効化しました', expired_count;
  END IF;
END;
$$;

-- 通知機能のトリガー関数
CREATE OR REPLACE FUNCTION notify_qr_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sharer_name text;
  park_name text;
BEGIN
  -- 共有者の名前を取得
  SELECT name INTO sharer_name
  FROM profiles
  WHERE id = NEW.shared_by_user_id;
  
  -- ドッグラン名を取得
  SELECT dp.name INTO park_name
  FROM dog_parks dp
  JOIN reservations r ON dp.id = r.park_id
  WHERE r.id = NEW.reservation_id;
  
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
    format('%sさんから%sの入場QRコードが共有されました', sharer_name, park_name),
    jsonb_build_object(
      'reservation_id', NEW.reservation_id,
      'share_id', NEW.id,
      'shared_by', NEW.shared_by_user_id,
      'park_name', park_name
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_qr_revoke()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sharer_name text;
  park_name text;
BEGIN
  -- 取り消しの場合のみ処理
  IF OLD.status = 'active' AND NEW.status = 'revoked' THEN
    -- 共有者の名前を取得
    SELECT name INTO sharer_name
    FROM profiles
    WHERE id = NEW.shared_by_user_id;
    
    -- ドッグラン名を取得
    SELECT dp.name INTO park_name
    FROM dog_parks dp
    JOIN reservations r ON dp.id = r.park_id
    WHERE r.id = NEW.reservation_id;
    
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
      format('%sさんから共有された%sの入場QRコードが取り消されました', sharer_name, park_name),
      jsonb_build_object(
        'reservation_id', NEW.reservation_id,
        'share_id', NEW.id,
        'revoked_by', NEW.shared_by_user_id,
        'park_name', park_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- トリガーを作成（既存チェック付き）
DO $$
BEGIN
  -- QR共有通知トリガー
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'qr_share_notification_trigger'
  ) THEN
    CREATE TRIGGER qr_share_notification_trigger
      AFTER INSERT ON qr_shares
      FOR EACH ROW
      EXECUTE FUNCTION notify_qr_share();
  END IF;

  -- QR取り消し通知トリガー
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'qr_revoke_notification_trigger'
  ) THEN
    CREATE TRIGGER qr_revoke_notification_trigger
      AFTER UPDATE ON qr_shares
      FOR EACH ROW
      EXECUTE FUNCTION notify_qr_revoke();
  END IF;
END $$;

-- インデックスを作成
CREATE INDEX IF NOT EXISTS qr_shares_reservation_id_idx ON qr_shares(reservation_id);
CREATE INDEX IF NOT EXISTS qr_shares_shared_by_user_id_idx ON qr_shares(shared_by_user_id);
CREATE INDEX IF NOT EXISTS qr_shares_shared_to_user_id_idx ON qr_shares(shared_to_user_id);
CREATE INDEX IF NOT EXISTS qr_shares_status_idx ON qr_shares(status);
CREATE INDEX IF NOT EXISTS qr_shares_expires_at_idx ON qr_shares(expires_at);

-- 権限設定
DO $$
BEGIN
  -- テーブル権限
  GRANT ALL ON qr_shares TO authenticated;
  
  -- 関数権限
  GRANT EXECUTE ON FUNCTION share_qr_code TO authenticated;
  GRANT EXECUTE ON FUNCTION revoke_qr_share TO authenticated;
  GRANT EXECUTE ON FUNCTION get_shared_qr_codes TO authenticated;
  GRANT EXECUTE ON FUNCTION get_my_qr_shares TO authenticated;
  GRANT EXECUTE ON FUNCTION expire_old_qr_shares TO authenticated;
EXCEPTION
  WHEN OTHERS THEN
    -- 権限設定でエラーが発生しても続行
    RAISE NOTICE '権限設定でエラーが発生しましたが続行します: %', SQLERRM;
END $$;

-- 成功メッセージ
DO $$
BEGIN
  RAISE NOTICE '=== QRコード共有システム構築完了 ===';
  RAISE NOTICE '✓ 施設貸し切り予約者のQRコード共有機能';
  RAISE NOTICE '✓ 友達関係の確認機能';
  RAISE NOTICE '✓ 共有の取り消し機能';
  RAISE NOTICE '✓ 自動期限切れ処理';
  RAISE NOTICE '✓ リアルタイム通知システム';
  RAISE NOTICE '✓ セキュリティポリシー設定';
  RAISE NOTICE '✓ 重複チェック機能付きで安全にマイグレーション完了';
END $$;
-- First drop the existing function
DROP FUNCTION IF EXISTS check_user_park_access(uuid, text);

-- Re-create the function with updated logic to support shared QR codes
CREATE OR REPLACE FUNCTION check_user_park_access(p_user_id uuid, p_lock_id text)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_park_id uuid;
  v_has_access boolean := false;
  v_reason text := 'No valid access found';
BEGIN
  -- スマートロックからパークIDを取得
  SELECT park_id INTO v_park_id
  FROM smart_locks
  WHERE lock_id = p_lock_id
  AND status = 'active';
  
  IF v_park_id IS NULL THEN
    RETURN jsonb_build_object('has_access', false, 'reason', 'Invalid lock ID');
  END IF;
  
  -- アクティブなQRコードがあるか確認
  SELECT EXISTS (
    SELECT 1
    FROM entrance_qr_codes
    WHERE user_id = p_user_id
    AND status = 'active'
    AND valid_until > now()
    AND (park_id IS NULL OR park_id = v_park_id)
  ) INTO v_has_access;
  
  IF v_has_access THEN
    RETURN jsonb_build_object('has_access', true, 'reason', 'Valid QR code');
  END IF;
  
  -- サブスクリプションがあるか確認
  SELECT EXISTS (
    SELECT 1
    FROM stripe_user_subscriptions
    WHERE status IN ('active', 'trialing')
  ) INTO v_has_access;
  
  IF v_has_access THEN
    RETURN jsonb_build_object('has_access', true, 'reason', 'Active subscription');
  END IF;
  
  -- 施設貸し切り予約があるか確認
  SELECT EXISTS (
    SELECT 1
    FROM reservations
    WHERE user_id = p_user_id
    AND park_id = v_park_id
    AND date = CURRENT_DATE
    AND status = 'confirmed'
    AND reservation_type = 'whole_facility'
    AND EXTRACT(HOUR FROM CURRENT_TIME) >= CAST(start_time AS integer)
    AND EXTRACT(HOUR FROM CURRENT_TIME) < (CAST(start_time AS integer) + duration)
  ) INTO v_has_access;
  
  IF v_has_access THEN
    RETURN jsonb_build_object('has_access', true, 'reason', 'Facility reservation');
  END IF;
  
  -- 共有されたQRコードがあるか確認
  SELECT EXISTS (
    SELECT 1
    FROM qr_shares qs
    JOIN reservations r ON qs.reservation_id = r.id
    WHERE qs.shared_to_user_id = p_user_id
    AND qs.status = 'active'
    AND qs.expires_at > now()
    AND r.park_id = v_park_id
    AND r.date = CURRENT_DATE
    AND r.status = 'confirmed'
    AND r.reservation_type = 'whole_facility'
    AND EXTRACT(HOUR FROM CURRENT_TIME) >= CAST(r.start_time AS integer)
    AND EXTRACT(HOUR FROM CURRENT_TIME) < (CAST(r.start_time AS integer) + r.duration)
  ) INTO v_has_access;
  
  IF v_has_access THEN
    RETURN jsonb_build_object('has_access', true, 'reason', 'Shared QR code');
  END IF;
  
  -- アクセス権がない場合
  RETURN jsonb_build_object('has_access', false, 'reason', v_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 友達申請可能かチェックする関数（同じドッグランで出会った場合のみ可能）
CREATE OR REPLACE FUNCTION can_send_friend_request(p_requester_id uuid, p_requested_id uuid)
RETURNS boolean AS $$
DECLARE
  v_can_send boolean;
BEGIN
  -- 同じドッグランで出会ったことがあるか確認
  SELECT EXISTS (
    SELECT 1
    FROM dog_encounters de
    JOIN dogs d1 ON de.dog1_id = d1.id
    JOIN dogs d2 ON de.dog2_id = d2.id
    WHERE (d1.owner_id = p_requester_id AND d2.owner_id = p_requested_id)
    OR (d1.owner_id = p_requested_id AND d2.owner_id = p_requester_id)
  ) INTO v_can_send;
  
  RETURN v_can_send;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のポリシーを削除（同じ名前のポリシーが既に存在する場合）
DROP POLICY IF EXISTS "友達申請は出会いがある場合のみ可能" ON friend_requests;

-- 友達リクエストのRLSポリシーを作成
CREATE POLICY "友達申請は出会いがある場合のみ可能" ON friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid() AND
    can_send_friend_request(requester_id, requested_id)
  );
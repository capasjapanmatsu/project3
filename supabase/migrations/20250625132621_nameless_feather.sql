/*
  # Add owner access to their own parks
  
  1. Changes
     - Update check_user_park_access function to allow park owners to access their own parks without payment
     - Maintain existing access methods (QR codes, subscriptions, facility rentals, shared QR codes)
     - Add specific check for park owners
*/

-- First drop the existing function
DROP FUNCTION IF EXISTS check_user_park_access(uuid, text);

-- Re-create the function with updated logic to support park owners
CREATE OR REPLACE FUNCTION check_user_park_access(p_user_id uuid, p_lock_id text)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_park_id uuid;
  v_has_access boolean := false;
  v_reason text := 'No valid access found';
  v_owner_id uuid;
BEGIN
  -- スマートロックからパークIDを取得
  SELECT park_id INTO v_park_id
  FROM smart_locks
  WHERE lock_id = p_lock_id
  AND status = 'active';
  
  IF v_park_id IS NULL THEN
    RETURN jsonb_build_object('has_access', false, 'reason', 'Invalid lock ID');
  END IF;
  
  -- パークのオーナーIDを取得
  SELECT owner_id INTO v_owner_id
  FROM dog_parks
  WHERE id = v_park_id;
  
  -- オーナー自身の場合は常にアクセス許可
  IF v_owner_id = p_user_id THEN
    RETURN jsonb_build_object('has_access', true, 'reason', 'Park owner');
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
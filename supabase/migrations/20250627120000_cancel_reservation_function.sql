-- 予約キャンセル用関数
CREATE OR REPLACE FUNCTION cancel_reservation(p_reservation_id uuid, p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_reservation RECORD;
  v_entry_count INT;
  v_now TIMESTAMPTZ := now();
  v_one_day_before TIMESTAMPTZ;
BEGIN
  -- 予約情報取得
  SELECT * INTO v_reservation FROM reservations WHERE id = p_reservation_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', '予約が見つかりません');
  END IF;

  -- 貸し切り予約の場合
  IF v_reservation.reservation_type = 'whole_facility' THEN
    v_one_day_before := v_reservation.date - INTERVAL '1 day';
    IF v_now >= v_one_day_before THEN
      RETURN jsonb_build_object('success', false, 'message', '貸し切り予約は1日前までしかキャンセルできません');
    END IF;
  ELSE
    -- 通常予約はPIN未使用時のみ
    SELECT COUNT(*) INTO v_entry_count
    FROM user_entry_exit_logs
    WHERE user_id = p_user_id
      AND park_id = v_reservation.park_id
      AND action = 'entry'
      AND timestamp >= v_reservation.date;
    IF v_entry_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'message', 'すでに入場済みのためキャンセルできません');
    END IF;
  END IF;

  -- キャンセル処理
  UPDATE reservations SET status = 'cancelled' WHERE id = p_reservation_id;

  RETURN jsonb_build_object('success', true, 'message', '予約をキャンセルしました');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
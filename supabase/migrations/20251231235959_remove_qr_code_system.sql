-- QRコードシステム完全削除
-- PINベースのスマートロックシステムを使用するため、QRコード関連機能を削除

-- 1. QRコード関連の関数を削除
DO $$
BEGIN
    DROP FUNCTION IF EXISTS generate_entrance_qr(uuid, uuid[]);
    DROP FUNCTION IF EXISTS generate_exit_qr(uuid);
    DROP FUNCTION IF EXISTS cleanup_expired_qr_codes();
    DROP FUNCTION IF EXISTS cleanup_expired_qr_shares();
EXCEPTION
    WHEN others THEN NULL;
END
$$;

-- 2. QRコード関連のテーブルを削除
DO $$
BEGIN
    DROP TABLE IF EXISTS entrance_qr_codes_temp CASCADE;
    DROP TABLE IF EXISTS entrance_qr_codes CASCADE;
    DROP TABLE IF EXISTS qr_shares CASCADE;
EXCEPTION
    WHEN others THEN NULL;
END
$$;

-- 3. check_user_park_access関数からQRコード関連のロジックを削除
CREATE OR REPLACE FUNCTION check_user_park_access(
  user_id_param uuid,
  park_id_param uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_park_record RECORD;
  v_subscription_record RECORD;
  v_reservation_record RECORD;
  v_owner_record RECORD;
BEGIN
  -- パークの存在確認
  SELECT * FROM dog_parks WHERE id = park_id_param INTO v_park_record;
  IF v_park_record IS NULL THEN
    RETURN jsonb_build_object('has_access', false, 'reason', 'Park not found');
  END IF;

  -- パークオーナーの確認
  SELECT * FROM profiles WHERE id = user_id_param AND id = v_park_record.owner_id INTO v_owner_record;
  IF v_owner_record IS NOT NULL THEN
    RETURN jsonb_build_object('has_access', true, 'reason', 'Park owner access');
  END IF;

  -- アクティブなサブスクリプションがあるか確認
  SELECT s.* FROM subscriptions s
  WHERE s.user_id = user_id_param
    AND s.status = 'active'
    AND s.park_id = park_id_param
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
  INTO v_subscription_record;

  IF v_subscription_record IS NOT NULL THEN
    RETURN jsonb_build_object('has_access', true, 'reason', 'Active subscription');
  END IF;

  -- アクティブな予約があるか確認
  SELECT r.* FROM reservations r
  WHERE r.user_id = user_id_param
    AND r.park_id = park_id_param
    AND r.status = 'confirmed'
    AND NOW() BETWEEN r.start_time AND r.end_time
  INTO v_reservation_record;

  IF v_reservation_record IS NOT NULL THEN
    RETURN jsonb_build_object('has_access', true, 'reason', 'Active reservation');
  END IF;

  -- アクセス権限なし
  RETURN jsonb_build_object('has_access', false, 'reason', 'No valid access');
END;
$$;

-- 4. reservationsテーブルからqr_codeカラムを削除（存在する場合）
DO $$
BEGIN
    ALTER TABLE reservations DROP COLUMN IF EXISTS qr_code;
EXCEPTION
    WHEN others THEN NULL;
END
$$;

-- 5. dog_parksテーブルからqr_testing関連のステータスを削除
DO $$
BEGIN
    -- qr_testingステータスをtestingに変更
    UPDATE dog_parks SET status = 'testing' WHERE status = 'qr_testing';
    
    -- qr_testing_readyステータスをtest_readyに変更  
    UPDATE dog_parks SET status = 'test_ready' WHERE status = 'qr_testing_ready';
    
    -- ステータス制約を更新
    ALTER TABLE dog_parks DROP CONSTRAINT IF EXISTS dog_parks_status_check;
    ALTER TABLE dog_parks ADD CONSTRAINT dog_parks_status_check 
    CHECK (status = ANY (ARRAY[
      'pending'::text, 
      'first_stage_passed'::text, 
      'second_stage_review'::text, 
      'test_ready'::text,
      'testing'::text, 
      'approved'::text, 
      'rejected'::text
    ]));
EXCEPTION
    WHEN others THEN NULL;
END
$$;

-- Comment in English to avoid encoding issues
COMMENT ON COLUMN dog_parks.status IS 'Park status: pending, first_stage_passed, second_stage_review, test_ready, testing, approved, rejected'; 
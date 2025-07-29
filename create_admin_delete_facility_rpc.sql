-- 管理者専用の施設削除RPC関数
-- RLSを回避して確実に削除を実行

CREATE OR REPLACE FUNCTION admin_delete_facility(facility_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  facility_record record;
  deleted_count int := 0;
  result json;
BEGIN
  -- 管理者権限チェック
  IF NOT (
    (auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- 削除対象施設の存在確認
  SELECT * INTO facility_record 
  FROM pet_facilities 
  WHERE id = facility_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Facility not found'
    );
  END IF;

  -- 関連画像を削除（pet_facility_images）
  DELETE FROM pet_facility_images 
  WHERE facility_id = facility_id_param;

  -- 関連画像を削除（facility_images - 存在する場合）
  BEGIN
    DELETE FROM facility_images 
    WHERE facility_id = facility_id_param;
  EXCEPTION
    WHEN undefined_table THEN
      -- テーブルが存在しない場合は無視
      NULL;
  END;

  -- 関連クーポンを削除（存在する場合）
  BEGIN
    DELETE FROM facility_coupons 
    WHERE facility_id = facility_id_param;
  EXCEPTION
    WHEN undefined_table THEN
      -- テーブルが存在しない場合は無視
      NULL;
  END;

  -- メイン施設データを削除
  DELETE FROM pet_facilities 
  WHERE id = facility_id_param;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- 削除確認
  IF deleted_count > 0 THEN
    result := json_build_object(
      'success', true,
      'message', format('Facility "%s" deleted successfully', facility_record.name),
      'deleted_facility', row_to_json(facility_record),
      'deleted_count', deleted_count
    );
  ELSE
    result := json_build_object(
      'success', false,
      'error', 'Failed to delete facility - no rows affected'
    );
  END IF;

  RETURN result;
END;
$$;

-- 関数にコメントを追加
COMMENT ON FUNCTION admin_delete_facility(uuid) IS 'Admin-only function to delete facilities bypassing RLS';

-- 使用例:
-- SELECT admin_delete_facility('facility-uuid-here'); 
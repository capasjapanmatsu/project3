/*
  # Fix Park Approval Process
  
  1. Create approve_second_stage_review function
  2. Fix dog_park_review_stages update logic
  3. Ensure proper status transitions
*/

-- 第二審査承認関数を作成
CREATE OR REPLACE FUNCTION approve_second_stage_review(park_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_park_id UUID;
  v_park_name TEXT;
  v_owner_id UUID;
BEGIN
  -- パークIDの存在確認
  SELECT id, name, owner_id INTO v_park_id, v_park_name, v_owner_id
  FROM dog_parks
  WHERE id = park_id_param
  AND status = 'second_stage_review';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '対象のドッグランが見つからないか、第二審査中ではありません';
  END IF;
  
  -- ドッグランのステータスを承認済みに更新
  UPDATE dog_parks
  SET status = 'approved',
      is_public = false, -- デフォルトで非公開
      updated_at = now()
  WHERE id = park_id_param;
  
  -- 審査ステージを承認済みに更新
  UPDATE dog_park_review_stages
  SET approved_at = now(),
      updated_at = now()
  WHERE park_id = park_id_param;
  
  -- レビューステージが存在しない場合は作成
  INSERT INTO dog_park_review_stages (
    park_id,
    first_stage_passed_at,
    second_stage_submitted_at,
    approved_at
  ) 
  SELECT 
    park_id_param,
    now(),
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM dog_park_review_stages WHERE park_id = park_id_param
  );
  
  -- オーナーに通知を作成
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_owner_id,
    'park_approval_required',
    'ドッグラン第二審査承認',
    v_park_name || 'の第二審査が承認されました。公開設定を行ってください。',
    jsonb_build_object('park_id', park_id_param)
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Second stage approval failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 第二審査却下関数を作成
CREATE OR REPLACE FUNCTION reject_second_stage_review(
  park_id_param UUID,
  rejection_reason_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_park_id UUID;
  v_park_name TEXT;
  v_owner_id UUID;
BEGIN
  -- パークIDの存在確認
  SELECT id, name, owner_id INTO v_park_id, v_park_name, v_owner_id
  FROM dog_parks
  WHERE id = park_id_param
  AND status = 'second_stage_review';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '対象のドッグランが見つからないか、第二審査中ではありません';
  END IF;
  
  -- ドッグランのステータスを却下に更新
  UPDATE dog_parks
  SET status = 'rejected',
      updated_at = now()
  WHERE id = park_id_param;
  
  -- 審査ステージを却下に更新
  UPDATE dog_park_review_stages
  SET rejected_at = now(),
      rejection_reason = rejection_reason_param,
      updated_at = now()
  WHERE park_id = park_id_param;
  
  -- レビューステージが存在しない場合は作成
  INSERT INTO dog_park_review_stages (
    park_id,
    first_stage_passed_at,
    second_stage_submitted_at,
    rejected_at,
    rejection_reason
  ) 
  SELECT 
    park_id_param,
    now(),
    now(),
    now(),
    rejection_reason_param
  WHERE NOT EXISTS (
    SELECT 1 FROM dog_park_review_stages WHERE park_id = park_id_param
  );
  
  -- オーナーに通知を作成
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_owner_id,
    'park_approval_required',
    'ドッグラン第二審査却下',
    v_park_name || 'の第二審査が却下されました。理由: ' || rejection_reason_param,
    jsonb_build_object('park_id', park_id_param, 'rejection_reason', rejection_reason_param)
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Second stage rejection failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の実行権限を設定
GRANT EXECUTE ON FUNCTION approve_second_stage_review(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_second_stage_review(UUID, TEXT) TO authenticated;

-- コメントを追加
COMMENT ON FUNCTION approve_second_stage_review IS 'ドッグランの第二審査を承認するための関数';
COMMENT ON FUNCTION reject_second_stage_review IS 'ドッグランの第二審査を却下するための関数'; 
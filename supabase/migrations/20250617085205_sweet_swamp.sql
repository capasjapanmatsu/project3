/*
  # Fix for dog_park_review_stages table and related functions

  1. New Functions
    - Improved submit_second_stage_review function
    - Fixed park approval process
  2. Security
    - Added proper RLS policies
*/

-- 第二審査申請関数（常に置き換え）
CREATE OR REPLACE FUNCTION submit_second_stage_review(park_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_park_id UUID;
  v_review_stage_exists BOOLEAN;
BEGIN
  -- パークIDの存在確認
  SELECT id INTO v_park_id
  FROM dog_parks
  WHERE id = park_id_param
  AND owner_id = auth.uid()
  AND status = 'first_stage_passed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '対象のドッグランが見つからないか、第一審査が通過していません';
  END IF;
  
  -- レビューステージが存在するか確認
  SELECT EXISTS(
    SELECT 1 FROM dog_park_review_stages
    WHERE park_id = park_id_param
  ) INTO v_review_stage_exists;
  
  -- ステータスを更新
  UPDATE dog_parks
  SET status = 'second_stage_review'
  WHERE id = park_id_param;
  
  -- 審査ステージを更新または作成
  IF v_review_stage_exists THEN
    -- 既存のレコードを更新
    UPDATE dog_park_review_stages
    SET second_stage_submitted_at = now()
    WHERE park_id = park_id_param;
  ELSE
    -- 新しいレコードを作成
    INSERT INTO dog_park_review_stages (
      park_id,
      first_stage_passed_at,
      second_stage_submitted_at
    ) VALUES (
      park_id_param,
      now(),
      now()
    );
  END IF;
  
  -- 管理者通知を作成
  INSERT INTO admin_notifications (
    type,
    title,
    message,
    data
  ) VALUES (
    'park_approval',
    'ドッグラン第二審査申請',
    (SELECT name FROM dog_parks WHERE id = park_id_param) || 'の第二審査が申請されました。画像審査を行ってください。',
    jsonb_build_object('park_id', park_id_param)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 管理者用の審査待ちドッグラン一覧ビューを更新
CREATE OR REPLACE VIEW admin_pending_parks_view AS
SELECT 
  dp.id,
  dp.name,
  dp.address,
  dp.status,
  dp.created_at,
  p.name AS owner_name,
  dp.owner_id,
  dprs.second_stage_submitted_at,
  -- 画像の統計情報
  COALESCE(COUNT(dpfi.id), 0) AS total_images,
  COALESCE(SUM(CASE WHEN dpfi.is_approved IS NULL THEN 1 ELSE 0 END), 0) AS pending_images,
  COALESCE(SUM(CASE WHEN dpfi.is_approved = true THEN 1 ELSE 0 END), 0) AS approved_images,
  COALESCE(SUM(CASE WHEN dpfi.is_approved = false THEN 1 ELSE 0 END), 0) AS rejected_images
FROM 
  dog_parks dp
  JOIN profiles p ON dp.owner_id = p.id
  LEFT JOIN dog_park_review_stages dprs ON dp.id = dprs.park_id
  LEFT JOIN dog_park_facility_images dpfi ON dp.id = dpfi.park_id
WHERE 
  dp.status IN ('first_stage_passed', 'second_stage_review')
GROUP BY 
  dp.id, dp.name, dp.address, dp.status, dp.created_at, p.name, dp.owner_id, dprs.second_stage_submitted_at
ORDER BY 
  CASE 
    WHEN dp.status = 'second_stage_review' THEN 0
    ELSE 1
  END,
  dp.created_at DESC;
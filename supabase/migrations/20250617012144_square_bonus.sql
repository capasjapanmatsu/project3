/*
  # Create admin_pending_parks_view

  1. New Views
    - `admin_pending_parks_view` - 管理者用の審査待ちドッグラン一覧ビュー
      - 基本情報と画像審査状況を含む
*/

-- 管理者用の審査待ちドッグラン一覧ビュー
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
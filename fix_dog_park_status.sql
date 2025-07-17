-- 一次審査承認後の状態修正
-- 承認済み（approved）になっているが、実際には第二審査が必要なドッグランを修正

-- 1. 現在のドッグランの状態を確認
SELECT 
    id,
    name,
    status,
    created_at,
    updated_at
FROM dog_parks
WHERE status = 'approved'
ORDER BY created_at DESC;

-- 2. 第二審査の設備画像が未提出のドッグランをfirst_stage_passedに修正
UPDATE dog_parks 
SET status = 'first_stage_passed',
    updated_at = NOW()
WHERE status = 'approved'
  AND id NOT IN (
    SELECT DISTINCT park_id 
    FROM dog_park_facility_images 
    WHERE image_type IN ('overview', 'entrance', 'gate', 'fence')
    GROUP BY park_id
    HAVING COUNT(DISTINCT image_type) >= 4
  );

-- 3. 修正後の状態を確認
SELECT 
    id,
    name,
    status,
    created_at,
    updated_at
FROM dog_parks
WHERE status IN ('first_stage_passed', 'second_stage_review', 'approved')
ORDER BY status, created_at DESC;

-- 4. 設備画像の提出状況を確認
SELECT 
    dp.id,
    dp.name,
    dp.status,
    COUNT(dpfi.id) as image_count,
    STRING_AGG(dpfi.image_type, ', ') as image_types
FROM dog_parks dp
LEFT JOIN dog_park_facility_images dpfi ON dp.id = dpfi.park_id
WHERE dp.status IN ('first_stage_passed', 'second_stage_review')
GROUP BY dp.id, dp.name, dp.status
ORDER BY dp.status, dp.created_at DESC; 
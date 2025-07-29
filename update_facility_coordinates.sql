-- わんわんカフェの座標データを設定

-- 熊本県熊本市北区龍田2丁目14−16の座標を設定
UPDATE pet_facilities 
SET 
    latitude = 32.8331,
    longitude = 130.7669,
    updated_at = NOW()
WHERE name = 'わんわんカフェ' AND status = 'approved';

-- 設定結果を確認
SELECT 
    name,
    latitude,
    longitude,
    address,
    status,
    CASE 
        WHEN latitude IS NULL OR longitude IS NULL THEN '座標なし'
        WHEN latitude = 0 AND longitude = 0 THEN '座標が0,0'
        ELSE '座標あり'
    END as coordinate_status
FROM pet_facilities 
WHERE name = 'わんわんカフェ';

-- 全承認済み施設の座標状況を確認
SELECT 
    COUNT(*) as total_approved_facilities,
    COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL 
               AND latitude != 0 AND longitude != 0 THEN 1 END) as facilities_with_coordinates,
    COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL 
               OR latitude = 0 OR longitude = 0 THEN 1 END) as facilities_without_coordinates
FROM pet_facilities 
WHERE status = 'approved'; 
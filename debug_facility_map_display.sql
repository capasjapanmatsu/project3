-- 施設マップ表示問題の調査用SQLクエリ

-- 1. 承認済み施設の基本情報確認
SELECT 
    id,
    name,
    category_id,
    status,
    latitude,
    longitude,
    address,
    phone,
    created_at,
    CASE 
        WHEN latitude IS NULL OR longitude IS NULL THEN '座標なし'
        WHEN latitude = 0 AND longitude = 0 THEN '座標が0,0'
        ELSE '座標あり'
    END as coordinate_status
FROM pet_facilities 
WHERE status = 'approved'
ORDER BY name;

-- 2. カテゴリ情報も含めた詳細情報
SELECT 
    pf.id,
    pf.name,
    pf.category_id,
    fc.name as category_name,
    fc.name_ja as category_name_ja,
    pf.status,
    pf.latitude,
    pf.longitude,
    pf.address,
    CASE 
        WHEN pf.latitude IS NULL OR pf.longitude IS NULL THEN '座標なし'
        WHEN pf.latitude = 0 AND pf.longitude = 0 THEN '座標が0,0'
        ELSE '座標あり'
    END as coordinate_status
FROM pet_facilities pf
LEFT JOIN facility_categories fc ON pf.category_id = fc.id
WHERE pf.status = 'approved'
ORDER BY pf.name;

-- 3. 座標を持つ施設と持たない施設の数
SELECT 
    COUNT(*) as total_approved_facilities,
    COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL 
               AND latitude != 0 AND longitude != 0 THEN 1 END) as facilities_with_coordinates,
    COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL 
               OR latitude = 0 OR longitude = 0 THEN 1 END) as facilities_without_coordinates
FROM pet_facilities 
WHERE status = 'approved';

-- 4. カテゴリ別の施設数
SELECT 
    fc.name as category_name,
    fc.name_ja as category_name_ja,
    COUNT(pf.id) as facility_count,
    COUNT(CASE WHEN pf.latitude IS NOT NULL AND pf.longitude IS NOT NULL 
               AND pf.latitude != 0 AND pf.longitude != 0 THEN 1 END) as facilities_with_coordinates
FROM facility_categories fc
LEFT JOIN pet_facilities pf ON fc.id = pf.category_id AND pf.status = 'approved'
GROUP BY fc.id, fc.name, fc.name_ja
ORDER BY facility_count DESC;

-- 5. 最近作成された施設の確認
SELECT 
    name,
    category_id,
    status,
    latitude,
    longitude,
    created_at,
    CASE 
        WHEN latitude IS NULL OR longitude IS NULL THEN '座標なし'
        WHEN latitude = 0 AND longitude = 0 THEN '座標が0,0'
        ELSE '座標あり'
    END as coordinate_status
FROM pet_facilities 
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 10;

-- 6. "わんわんカフェ"の具体的な情報確認
SELECT 
    pf.*,
    fc.name as category_name,
    fc.name_ja as category_name_ja
FROM pet_facilities pf
LEFT JOIN facility_categories fc ON pf.category_id = fc.id
WHERE pf.name ILIKE '%わんわんカフェ%' OR pf.name ILIKE '%わんわん%'
ORDER BY pf.created_at DESC; 
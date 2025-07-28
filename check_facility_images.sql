-- 施設画像データの確認SQL

-- 1. わんわんキャンプの画像データを確認
SELECT * FROM facility_images 
WHERE facility_id = 'c2535dc4-aa98-4324-a90b-db34d8123557'
ORDER BY created_at;

-- 2. facility_imagesテーブルの構造を確認
\d facility_images;

-- 3. 全ての施設の画像数を確認
SELECT 
    pf.name as facility_name,
    COUNT(fi.id) as image_count
FROM pet_facilities pf
LEFT JOIN facility_images fi ON pf.id = fi.facility_id
WHERE pf.status = 'approved'
GROUP BY pf.id, pf.name
ORDER BY image_count DESC;

-- 4. 画像URLのサンプルを確認
SELECT 
    fi.image_url,
    fi.description,
    pf.name as facility_name
FROM facility_images fi
JOIN pet_facilities pf ON fi.facility_id = pf.id
LIMIT 5; 
-- ドッグパークの画像データを確認
SELECT 
    id,
    name,
    image_url,
    cover_image_url,
    status,
    created_at
FROM dog_parks 
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 10;

-- 画像URLの詳細を確認
SELECT 
    name,
    CASE 
        WHEN image_url IS NULL THEN 'No image'
        WHEN image_url = '' THEN 'Empty image URL'
        ELSE 'Has image: ' || LEFT(image_url, 50) || '...'
    END as image_status,
    CASE 
        WHEN cover_image_url IS NULL THEN 'No cover image'
        WHEN cover_image_url = '' THEN 'Empty cover image URL'
        ELSE 'Has cover image: ' || LEFT(cover_image_url, 50) || '...'
    END as cover_image_status
FROM dog_parks 
WHERE status = 'approved'
ORDER BY created_at DESC; 
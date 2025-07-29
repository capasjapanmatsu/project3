-- 施設画像データのデバッグ・修正SQL

-- ======================================
-- 1. 現在のデータ状況を確認
-- ======================================

-- 施設一覧を確認
SELECT 
    id,
    name,
    status,
    created_at
FROM pet_facilities 
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 10;

-- 施設画像データを確認
SELECT 
    fi.id,
    fi.facility_id,
    pf.name as facility_name,
    fi.image_url,
    fi.description,
    fi.created_at
FROM facility_images fi
JOIN pet_facilities pf ON fi.facility_id = pf.id
WHERE pf.status = 'approved'
ORDER BY fi.created_at DESC;

-- 画像がない施設を確認
SELECT 
    pf.id,
    pf.name,
    COUNT(fi.id) as image_count
FROM pet_facilities pf
LEFT JOIN facility_images fi ON pf.id = fi.facility_id
WHERE pf.status = 'approved'
GROUP BY pf.id, pf.name
HAVING COUNT(fi.id) = 0
ORDER BY pf.name;

-- ======================================
-- 2. テスト用画像データを追加
-- ======================================

-- スマイリーズ施設のIDを確認
DO $$
DECLARE
    smily_facility_id UUID;
    pet_salon_facility_id UUID;
    wanwan_camp_facility_id UUID;
BEGIN
    -- スマイリーズのIDを取得
    SELECT id INTO smily_facility_id 
    FROM pet_facilities 
    WHERE name LIKE '%スマイリーズ%' 
    LIMIT 1;
    
    -- ペットサロン花のIDを取得
    SELECT id INTO pet_salon_facility_id 
    FROM pet_facilities 
    WHERE name LIKE '%ペットサロン花%' 
    LIMIT 1;
    
    -- わんわんキャンプのIDを取得
    SELECT id INTO wanwan_camp_facility_id 
    FROM pet_facilities 
    WHERE name LIKE '%わんわんキャンプ%' 
    LIMIT 1;
    
    -- スマイリーズの画像を追加
    IF smily_facility_id IS NOT NULL THEN
        INSERT INTO facility_images (facility_id, image_url, description)
        VALUES 
            (smily_facility_id, 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=600&fit=crop', 'スマイリーズ店舗외観'),
            (smily_facility_id, 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=600&fit=crop', 'グルーミングルーム')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'スマイリーズの画像を追加しました: %', smily_facility_id;
    END IF;
    
    -- ペットサロン花の画像を追加
    IF pet_salon_facility_id IS NOT NULL THEN
        INSERT INTO facility_images (facility_id, image_url, description)
        VALUES 
            (pet_salon_facility_id, 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800&h=600&fit=crop', 'ペットサロン花店内'),
            (pet_salon_facility_id, 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=600&fit=crop', 'トリミング中の様子')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'ペットサロン花の画像を追加しました: %', pet_salon_facility_id;
    END IF;
    
    -- わんわんキャンプの画像を追加
    IF wanwan_camp_facility_id IS NOT NULL THEN
        INSERT INTO facility_images (facility_id, image_url, description)
        VALUES 
            (wanwan_camp_facility_id, 'https://images.unsplash.com/photo-1504595403659-9088ce801e29?w=800&h=600&fit=crop', 'キャンプサイト全景'),
            (wanwan_camp_facility_id, 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=800&h=600&fit=crop', 'ワンちゃん用テント')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'わんわんキャンプの画像を追加しました: %', wanwan_camp_facility_id;
    END IF;
    
END $$;

-- ======================================
-- 3. 追加後の確認
-- ======================================

-- 追加された画像データを確認
SELECT 
    pf.name as facility_name,
    fi.image_url,
    fi.description,
    fi.created_at
FROM facility_images fi
JOIN pet_facilities pf ON fi.facility_id = pf.id
WHERE pf.status = 'approved'
ORDER BY fi.created_at DESC;

-- 各施設の画像数を確認
SELECT 
    pf.name as facility_name,
    COUNT(fi.id) as image_count
FROM pet_facilities pf
LEFT JOIN facility_images fi ON pf.id = fi.facility_id
WHERE pf.status = 'approved'
GROUP BY pf.id, pf.name
ORDER BY image_count DESC, pf.name; 
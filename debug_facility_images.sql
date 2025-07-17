-- facility_imagesテーブルの画像データを確認するためのSQL

-- 1. 施設画像の基本情報を確認
SELECT 
  fi.id,
  fi.facility_id,
  pf.name as facility_name,
  fi.file_name,
  fi.file_type,
  fi.file_size,
  fi.is_primary,
  fi.is_compressed,
  LENGTH(fi.image_data) as image_data_length,
  LEFT(fi.image_data, 50) as image_data_preview,
  fi.created_at
FROM facility_images fi
JOIN pet_facilities pf ON fi.facility_id = pf.id
ORDER BY fi.created_at DESC;

-- 2. 画像データが適切なBase64形式かどうかをチェック
SELECT 
  fi.id,
  fi.facility_id,
  pf.name as facility_name,
  CASE 
    WHEN fi.image_data LIKE 'data:image/%' THEN 'Data URL format'
    WHEN fi.image_data ~ '^[A-Za-z0-9+/]*={0,2}$' THEN 'Base64 format'
    ELSE 'Unknown format'
  END as data_format,
  LENGTH(fi.image_data) as data_length,
  LEFT(fi.image_data, 100) as data_preview
FROM facility_images fi
JOIN pet_facilities pf ON fi.facility_id = pf.id
ORDER BY fi.created_at DESC;

-- 3. データ形式の統計
SELECT 
  CASE 
    WHEN image_data LIKE 'data:image/%' THEN 'Data URL format'
    WHEN image_data ~ '^[A-Za-z0-9+/]*={0,2}$' THEN 'Base64 format'
    ELSE 'Unknown format'
  END as data_format,
  COUNT(*) as count
FROM facility_images
GROUP BY data_format; 
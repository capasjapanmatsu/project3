-- カテゴリーテーブルの内容を確認
SELECT 
  id,
  name,
  name_ja,
  created_at
FROM facility_categories
ORDER BY name;

-- 施設とカテゴリーの関連を確認
SELECT 
  f.id,
  f.name as facility_name,
  f.status,
  f.category_id,
  fc.name as category_name,
  fc.name_ja as category_name_ja
FROM pet_facilities f
LEFT JOIN facility_categories fc ON f.category_id = fc.id
WHERE f.name LIKE '%わんわんカフェ%';

-- category_id = '0e136cc8-d16b-4ab8-8c11-8fa5a7e331aa' のカテゴリー情報
SELECT * FROM facility_categories 
WHERE id = '0e136cc8-d16b-4ab8-8c11-8fa5a7e331aa'; 
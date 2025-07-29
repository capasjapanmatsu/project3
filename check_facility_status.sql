-- 施設のステータス確認
SELECT 
  id,
  name,
  status,
  category_id,
  owner_id,
  created_at,
  updated_at
FROM pet_facilities 
WHERE name LIKE '%わんわんカフェ%'
ORDER BY created_at DESC;

-- 全施設のステータス分布を確認
SELECT 
  status,
  COUNT(*) as count
FROM pet_facilities 
GROUP BY status;

-- 全施設一覧（最新5件）
SELECT 
  id,
  name,
  status,
  category_id,
  created_at
FROM pet_facilities 
ORDER BY created_at DESC 
LIMIT 5; 
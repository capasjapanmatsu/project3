-- クーポンのusage_limit_type値を確認
SELECT 
  id,
  title,
  usage_limit_type,
  LENGTH(usage_limit_type) as value_length,
  ASCII(LEFT(usage_limit_type, 1)) as first_char_ascii,
  is_active,
  created_at
FROM facility_coupons 
WHERE facility_id = (
  SELECT id FROM pet_facilities 
  WHERE name LIKE '%わんわんカフェ%' 
  OR name LIKE '%テスト%'
  LIMIT 1
)
ORDER BY created_at DESC 
LIMIT 5;

-- usage_limit_typeの全パターンを確認
SELECT DISTINCT 
  usage_limit_type,
  LENGTH(usage_limit_type) as length,
  COUNT(*) as count
FROM facility_coupons 
GROUP BY usage_limit_type; 
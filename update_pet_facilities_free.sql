-- ペット関連施設のカテゴリをすべて無料にする
UPDATE facility_categories 
SET is_free = true, 
    monthly_fee = 0,
    updated_at = NOW()
WHERE name != 'dog_park';

-- 更新後の状態を確認
SELECT name, name_ja, is_free, monthly_fee 
FROM facility_categories 
ORDER BY name; 